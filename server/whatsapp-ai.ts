import OpenAI from "openai";
import { storage } from "./storage";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

let openaiClient: OpenAI | null = null;

function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

// ---------------------------------------------------------------------------
// Conversation memory
// ---------------------------------------------------------------------------

type ChatMessage = OpenAI.Chat.ChatCompletionMessageParam;

interface BookingState {
  serviceId?: string;
  serviceName?: string;
  durationMin?: number;
  price?: number;
  barberId?: string;
  barberName?: string;
  date?: string;
  slot?: string;
  clientName?: string;
}

interface ConversationState {
  history: ChatMessage[];
  booking: BookingState;
  expiresAt: number;
}

const conversations = new Map<string, ConversationState>();
const CONV_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours of inactivity

function getOrCreateConversation(phone: string): ConversationState {
  const existing = conversations.get(phone);
  if (existing && Date.now() < existing.expiresAt) {
    existing.expiresAt = Date.now() + CONV_TTL_MS;
    return existing;
  }
  const fresh: ConversationState = {
    history: [],
    booking: {},
    expiresAt: Date.now() + CONV_TTL_MS,
  };
  conversations.set(phone, fresh);
  return fresh;
}

setInterval(() => {
  const now = Date.now();
  for (const [phone, conv] of conversations) {
    if (now > conv.expiresAt) conversations.delete(phone);
  }
}, 30 * 60 * 1000);

// ---------------------------------------------------------------------------
// Availability utilities
// ---------------------------------------------------------------------------

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

async function getSlotsForBarber(
  barberId: string,
  date: string,
  durationMin: number
): Promise<string[]> {
  const barber = await storage.getBarber(barberId).catch(() => null);
  if (!barber) return [];

  const workStart = timeToMinutes(barber.workStartTime || "09:00");
  const workEnd = timeToMinutes(barber.workEndTime || "19:00");

  const existingAppts = await storage.getAppointmentsByBarber(barberId, date).catch(() => []);

  const busy = existingAppts
    .filter((a) => a.status !== "cancelled")
    .map((a) => ({
      start: timeToMinutes(a.startTime),
      end: timeToMinutes(a.endTime),
    }));

  const slots: string[] = [];
  for (let t = workStart; t + durationMin <= workEnd; t += 30) {
    const slotEnd = t + durationMin;
    const overlaps = busy.some((b) => t < b.end && slotEnd > b.start);
    if (!overlaps) {
      slots.push(minutesToTime(t));
    }
  }

  return slots;
}

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const tools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "listar_servicos",
      description: "Retorna os serviços disponíveis da barbearia com id, nome, preço e duração.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_barbeiros",
      description: "Retorna os barbeiros ativos da barbearia com id e nome.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "verificar_disponibilidade",
      description:
        "Verifica horários livres para um barbeiro em uma data. " +
        "Se o cliente não tiver preferência de barbeiro, passe barbeiro_id como 'qualquer' " +
        "para buscar disponibilidade em todos os barbeiros ativos.",
      parameters: {
        type: "object",
        properties: {
          barbeiro_id: {
            type: "string",
            description:
              "ID do barbeiro, ou a string 'qualquer' para checar todos os barbeiros ativos.",
          },
          data: {
            type: "string",
            description: "Data no formato YYYY-MM-DD.",
          },
          duracao_minutos: {
            type: "number",
            description: "Duração do serviço em minutos.",
          },
        },
        required: ["barbeiro_id", "data", "duracao_minutos"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "criar_agendamento",
      description: "Cria um agendamento após coletar todas as informações do cliente.",
      parameters: {
        type: "object",
        properties: {
          barbeiro_id: { type: "string", description: "ID do barbeiro." },
          barbeiro_nome: { type: "string", description: "Nome do barbeiro." },
          servico_id: { type: "string", description: "ID do serviço." },
          servico_nome: { type: "string", description: "Nome do serviço." },
          data: { type: "string", description: "Data no formato YYYY-MM-DD." },
          horario: { type: "string", description: "Horário de início no formato HH:MM." },
          nome_cliente: { type: "string", description: "Nome do cliente." },
          duracao_minutos: { type: "number", description: "Duração do serviço em minutos." },
          preco: { type: "number", description: "Preço do serviço." },
        },
        required: [
          "barbeiro_id", "barbeiro_nome", "servico_id", "servico_nome",
          "data", "horario", "nome_cliente", "duracao_minutos", "preco",
        ],
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Tool execution
// ---------------------------------------------------------------------------

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  barbershopId: string,
  phone: string,
  booking: BookingState
): Promise<string> {
  try {
    if (name === "listar_servicos") {
      const services = await storage.getServices(barbershopId);
      const active = services.filter((s) => s.isActive);
      if (!active.length) return JSON.stringify({ erro: "Nenhum serviço cadastrado." });
      return JSON.stringify(
        active.map((s) => ({
          id: s.id,
          nome: s.name,
          preco: Number(s.price).toFixed(2),
          duracao_minutos: s.duration,
        }))
      );
    }

    if (name === "listar_barbeiros") {
      const barbers = await storage.getBarbers(barbershopId);
      const active = barbers.filter((b) => b.isActive);
      if (!active.length) return JSON.stringify({ erro: "Nenhum barbeiro disponível." });
      return JSON.stringify(active.map((b) => ({ id: b.id, nome: b.name })));
    }

    if (name === "verificar_disponibilidade") {
      const barbeiroId = String(args.barbeiro_id ?? "");
      const data = String(args.data ?? "");
      const duracaoMinutos = Number(args.duracao_minutos ?? 30);

      // Persist collected info into booking state
      if (data) booking.date = data;
      if (duracaoMinutos) booking.durationMin = duracaoMinutos;

      if (barbeiroId === "qualquer") {
        // Check all active barbers and return slots per barber
        const barbers = await storage.getBarbers(barbershopId);
        const active = barbers.filter((b) => b.isActive);
        const results: Array<{ barbeiro: string; id: string; horarios: string[] }> = [];

        for (const barber of active) {
          const slots = await getSlotsForBarber(barber.id, data, duracaoMinutos);
          if (slots.length > 0) {
            results.push({
              barbeiro: barber.name,
              id: barber.id,
              horarios: slots.slice(0, 6),
            });
          }
        }

        if (!results.length) {
          return JSON.stringify({ disponivel: false, mensagem: "Nenhum barbeiro tem horários disponíveis nesta data." });
        }

        // Auto-select the barber with most availability for booking state
        const best = results.reduce((a, b) => (a.horarios.length >= b.horarios.length ? a : b));
        booking.barberId = best.id;
        booking.barberName = best.barbeiro;

        return JSON.stringify({ disponivel: true, por_barbeiro: results });
      }

      // Specific barber
      const barber = await storage.getBarber(barbeiroId).catch(() => null);
      if (!barber || barber.barbershopId !== barbershopId || !barber.isActive) {
        return JSON.stringify({ erro: "Barbeiro não encontrado ou inativo." });
      }

      const slots = await getSlotsForBarber(barbeiroId, data, duracaoMinutos);

      if (!slots.length) {
        return JSON.stringify({ disponivel: false, mensagem: "Sem horários disponíveis nesta data para este barbeiro." });
      }

      booking.barberId = barbeiroId;
      booking.barberName = barber.name;
      booking.date = data;

      return JSON.stringify({ disponivel: true, horarios: slots.slice(0, 8) });
    }

    if (name === "criar_agendamento") {
      const barbeiroId = String(args.barbeiro_id ?? booking.barberId ?? "");
      const barbeiroNome = String(args.barbeiro_nome ?? booking.barberName ?? "");
      const servicoId = String(args.servico_id ?? booking.serviceId ?? "");
      const servicoNome = String(args.servico_nome ?? booking.serviceName ?? "");
      const data = String(args.data ?? booking.date ?? "");
      const horario = String(args.horario ?? booking.slot ?? "");
      const nomeCliente = String(args.nome_cliente ?? booking.clientName ?? "");
      const duracaoMinutos = Number(args.duracao_minutos ?? booking.durationMin ?? 30);
      const preco = Number(args.preco ?? booking.price ?? 0);

      if (!barbeiroId || !servicoId || !data || !horario || !nomeCliente) {
        return JSON.stringify({
          erro: "Dados incompletos para criar o agendamento.",
          faltando: {
            barbeiro: !barbeiroId,
            servico: !servicoId,
            data: !data,
            horario: !horario,
            nome: !nomeCliente,
          },
        });
      }

      // Validate barber and service belong to this barbershop and are active
      const barber = await storage.getBarber(barbeiroId).catch(() => null);
      if (!barber || barber.barbershopId !== barbershopId || !barber.isActive) {
        return JSON.stringify({ erro: "Barbeiro inválido ou não pertence à barbearia." });
      }

      const service = await storage.getService(servicoId).catch(() => null);
      if (!service || service.barbershopId !== barbershopId || !service.isActive) {
        return JSON.stringify({ erro: "Serviço inválido ou não pertence à barbearia." });
      }

      // Revalidate slot availability immediately before booking (prevent double-booking)
      const availableNow = await getSlotsForBarber(barbeiroId, data, duracaoMinutos);
      if (!availableNow.includes(horario)) {
        return JSON.stringify({
          erro: "Este horário não está mais disponível. Por favor, escolha outro horário.",
          horarios_disponiveis: availableNow.slice(0, 6),
        });
      }

      const startMin = timeToMinutes(horario);
      const endTime = minutesToTime(startMin + duracaoMinutos);

      const appt = await storage.createAppointment({
        barbershopId,
        barberId: barbeiroId,
        serviceId: servicoId,
        date: data,
        startTime: horario,
        endTime,
        status: "confirmed",
        price: String(preco || service.price),
        clientName: nomeCliente,
        clientPhone: phone,
      });

      // Persist full booking state
      booking.barberId = barbeiroId;
      booking.barberName = barbeiroNome || barber.name;
      booking.serviceId = servicoId;
      booking.serviceName = servicoNome || service.name;
      booking.durationMin = duracaoMinutos;
      booking.price = Number(preco || service.price);
      booking.date = data;
      booking.slot = horario;
      booking.clientName = nomeCliente;

      return JSON.stringify({
        sucesso: true,
        agendamento_id: appt.id,
        barbeiro: booking.barberName,
        servico: booking.serviceName,
        data,
        horario,
        nome: nomeCliente,
      });
    }

    return JSON.stringify({ erro: "Ferramenta desconhecida." });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro interno ao executar ferramenta.";
    return JSON.stringify({ erro: msg });
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

const FALLBACK_REPLY =
  `Oi! Tô com um probleminha técnico agora, mas já já resolvo. ` +
  `Funcionamos de *segunda a sexta das 09h às 20h* e *sábado das 08h às 14h*. ` +
  `Tenta me chamar de novo em instantes! 💈`;

export async function handleIncomingMessage(
  text: string,
  slug: string,
  phone: string
): Promise<string> {
  const client = getClient();
  if (!client) return FALLBACK_REPLY;

  try {
    const barbershop = await storage.getBarbershopBySlug(slug).catch(() => null);
    if (!barbershop) return FALLBACK_REPLY;

    const today = format(new Date(), "yyyy-MM-dd");
    const todayReadable = format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });

    const systemPrompt = `Você é Rafael, atendente da Teixeira Barbearia. Você atende clientes pelo WhatsApp de forma natural e humana — como uma pessoa real, não como um robô ou assistente virtual.

BARBEARIA:
- Nome: Teixeira Barbearia
- Endereço: Rua Koesa, 430, Sala 03, Kobrasol, São José – SC
- Instagram: @teixeirabarbeariaoficial
- Fundada em 2018

HORÁRIOS:
- Segunda a Sexta: 09h às 20h
- Sábado: 08h às 14h
- Domingo: fechado

DATA DE HOJE: ${todayReadable} (a data atual em formato YYYY-MM-DD é ${today} — use para interpretar "hoje", "amanhã", "segunda que vem", etc.)

COMO SE COMPORTAR:
- Linguagem informal, descontraída e acolhedora. Sem formalidades desnecessárias.
- Sem frases fixas de abertura ou encerramento — varie conforme o contexto.
- Respostas curtas e diretas. Sem parágrafos longos.
- Use emojis com naturalidade e moderação (✂️ 💈 👊 😄).
- Use *negrito* do WhatsApp para destacar horários, preços, nomes e datas importantes.
- Se perguntarem se você é IA, desvie com bom humor: "Sou tão real quanto uma navalha bem afiada 😄"
- NUNCA fale sobre assuntos fora da barbearia. Se tentarem, redirecione com leveza: "Aqui só entendo de barba e cabelo mesmo 😄 Posso te ajudar com mais alguma coisa?"

COMO AGENDAR:
Quando o cliente quiser agendar, use as ferramentas disponíveis nesta ordem:
1. Chame listar_servicos para conhecer o cardápio e pergunte qual serviço o cliente quer.
2. Pergunte se o cliente tem preferência de barbeiro. Se tiver, chame listar_barbeiros para obter o ID. Se não tiver preferência, use barbeiro_id='qualquer' no próximo passo.
3. Pergunte a data desejada. Converta linguagem natural para YYYY-MM-DD usando a data atual.
4. Chame verificar_disponibilidade. Se barbeiro_id='qualquer', o sistema retornará horários por barbeiro e você pode apresentar as opções de forma natural. Mostre no máximo 6 horários.
5. Pergunte o nome do cliente se ainda não souber.
6. Só chame criar_agendamento quando tiver barbeiro_id, servico_id, data, horario e nome_cliente confirmados.
7. Após criar, confirme o agendamento de forma natural com barbeiro, serviço, data e horário.

REGRAS EXTRAS:
- Nunca invente horários — sempre use verificar_disponibilidade com dados reais.
- Se não houver horários na data pedida, sugira outra data ou outro barbeiro.
- Não crie agendamentos sem confirmar o nome do cliente.`;

    const conv = getOrCreateConversation(phone);
    conv.history.push({ role: "user", content: text });

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...conv.history,
    ];

    let response = await client.chat.completions.create({
      model: "gpt-4o",
      messages,
      tools,
      tool_choice: "auto",
      max_tokens: 700,
      temperature: 0.75,
    });

    let iterations = 0;
    while (response.choices[0]?.finish_reason === "tool_calls" && iterations < 6) {
      iterations++;
      const assistantMsg = response.choices[0].message;
      conv.history.push(assistantMsg);
      messages.push(assistantMsg);

      const toolResults: ChatMessage[] = [];

      for (const toolCall of assistantMsg.tool_calls ?? []) {
        if (toolCall.type !== "function") continue;

        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(toolCall.function.arguments || "{}") as Record<string, unknown>;
        } catch {
          args = {};
        }

        const result = await executeTool(
          toolCall.function.name,
          args,
          barbershop.id,
          phone,
          conv.booking
        );

        toolResults.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        });
      }

      conv.history.push(...toolResults);
      messages.push(...toolResults);

      response = await client.chat.completions.create({
        model: "gpt-4o",
        messages,
        tools,
        tool_choice: "auto",
        max_tokens: 700,
        temperature: 0.75,
      });
    }

    const finalText = response.choices[0]?.message?.content ?? FALLBACK_REPLY;
    conv.history.push({ role: "assistant", content: finalText });

    // Keep history bounded — retain last 40 messages (20 exchanges)
    if (conv.history.length > 40) {
      conv.history = conv.history.slice(-40);
    }

    return finalText;
  } catch (e) {
    console.error("[WhatsApp AI] Erro:", e);
    return FALLBACK_REPLY;
  }
}
