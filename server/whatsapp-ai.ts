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

interface ConversationState {
  history: ChatMessage[];
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
    expiresAt: Date.now() + CONV_TTL_MS,
  };
  conversations.set(phone, fresh);
  return fresh;
}

setInterval(() => {
  const now = Date.now();
  for (const [phone, conv] of conversations.entries()) {
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

async function getAvailableSlots(
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
    .filter((a: any) => a.status !== "cancelled")
    .map((a: any) => ({
      start: timeToMinutes(a.startTime),
      end: timeToMinutes(a.endTime),
    }));

  const slots: string[] = [];
  for (let t = workStart; t + durationMin <= workEnd; t += 30) {
    const slotEnd = t + durationMin;
    const overlaps = busy.some((b: any) => t < b.end && slotEnd > b.start);
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
      description: "Verifica os horários livres para um barbeiro em uma data específica.",
      parameters: {
        type: "object",
        properties: {
          barbeiro_id: {
            type: "string",
            description: "ID do barbeiro.",
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
          barbeiro_nome: { type: "string", description: "Nome do barbeiro (para confirmação)." },
          servico_id: { type: "string", description: "ID do serviço." },
          servico_nome: { type: "string", description: "Nome do serviço (para confirmação)." },
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
  args: any,
  barbershopId: string,
  phone: string
): Promise<string> {
  try {
    if (name === "listar_servicos") {
      const services = await storage.getServices(barbershopId);
      const active = services.filter((s: any) => s.isActive);
      if (!active.length) return JSON.stringify({ erro: "Nenhum serviço cadastrado." });
      return JSON.stringify(
        active.map((s: any) => ({
          id: s.id,
          nome: s.name,
          preco: Number(s.price).toFixed(2),
          duracao_minutos: s.duration,
        }))
      );
    }

    if (name === "listar_barbeiros") {
      const barbers = await storage.getBarbers(barbershopId);
      const active = barbers.filter((b: any) => b.isActive);
      if (!active.length) return JSON.stringify({ erro: "Nenhum barbeiro disponível." });
      return JSON.stringify(
        active.map((b: any) => ({ id: b.id, nome: b.name }))
      );
    }

    if (name === "verificar_disponibilidade") {
      const { barbeiro_id, data, duracao_minutos } = args;
      const slots = await getAvailableSlots(barbeiro_id, data, duracao_minutos);
      if (!slots.length) {
        return JSON.stringify({ disponivel: false, mensagem: "Sem horários disponíveis nesta data." });
      }
      return JSON.stringify({ disponivel: true, horarios: slots });
    }

    if (name === "criar_agendamento") {
      const {
        barbeiro_id, servico_id, data, horario,
        nome_cliente, duracao_minutos, preco,
      } = args;

      const startMin = timeToMinutes(horario);
      const endTime = minutesToTime(startMin + duracao_minutos);

      const appt = await storage.createAppointment({
        barbershopId,
        barberId: barbeiro_id,
        serviceId: servico_id,
        date: data,
        startTime: horario,
        endTime,
        status: "confirmed",
        price: String(preco),
        clientName: nome_cliente,
        clientPhone: phone,
      });

      return JSON.stringify({ sucesso: true, agendamento_id: appt.id });
    }

    return JSON.stringify({ erro: "Ferramenta desconhecida." });
  } catch (e: any) {
    return JSON.stringify({ erro: e.message || "Erro interno ao executar ferramenta." });
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

const FALLBACK_REPLY =
  `Oi! Tô tendo um probleminha técnico aqui agora, mas a gente funciona de *segunda a sexta das 09h às 20h* e *sábado das 08h às 14h*. Tenta me chamar de novo em instantes! 💈`;

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

DATA DE HOJE: ${todayReadable} (use para interpretar "hoje", "amanhã", "semana que vem", etc. A data de hoje em formato YYYY-MM-DD é ${today})

COMO SE COMPORTAR:
- Linguagem informal, descontraída e acolhedora. Sem formalidades desnecessárias.
- Sem frases fixas de abertura ou encerramento — varie conforme o contexto.
- Respostas curtas e diretas. Sem parágrafos longos.
- Use emojis com naturalidade e moderação (✂️ 💈 👊 😄).
- Use *negrito* do WhatsApp para destacar horários, preços, nomes e datas.
- Se perguntarem se você é IA, desvie com bom humor: "Sou tão real quanto uma navalha bem afiada 😄"
- NUNCA fale sobre assuntos fora da barbearia. Se tentarem, redirecione com leveza: "Aqui só entendo de barba e cabelo mesmo 😄 Posso te ajudar com mais alguma coisa?"

COMO AGENDAR:
Quando o cliente quiser agendar, siga este fluxo usando as ferramentas disponíveis:
1. Chame listar_servicos para saber o que está disponível e pergunte qual serviço o cliente quer.
2. Chame listar_barbeiros. Se o cliente não tiver preferência, escolha o primeiro da lista.
3. Pergunte a data desejada. Converta linguagem natural (ex: "amanhã", "segunda") para YYYY-MM-DD.
4. Chame verificar_disponibilidade com o barbeiro, data e duração do serviço escolhido e mostre os horários disponíveis.
5. Peça o nome do cliente se ainda não souber.
6. Após ter barbeiro_id, servico_id, data, horario e nome_cliente, chame criar_agendamento.
7. Confirme o agendamento de forma natural, mencionando barbeiro, serviço, data e horário.

REGRAS DO AGENDAMENTO:
- Só crie o agendamento quando tiver TODOS os dados obrigatórios.
- Mostre no máximo 6 horários disponíveis por vez para não sobrecarregar.
- Se não houver horários, sugira outra data ou outro barbeiro.`;

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
      conv.history.push(assistantMsg as ChatMessage);
      messages.push(assistantMsg as ChatMessage);

      const toolResults: ChatMessage[] = [];
      for (const toolCall of assistantMsg.tool_calls || []) {
        let args: any = {};
        try {
          args = JSON.parse(toolCall.function.arguments || "{}");
        } catch {}
        const result = await executeTool(toolCall.function.name, args, barbershop.id, phone);
        toolResults.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        } as ChatMessage);
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

    const finalText = response.choices[0]?.message?.content || FALLBACK_REPLY;
    conv.history.push({ role: "assistant", content: finalText });

    // Keep history bounded — last 40 messages (20 exchanges)
    if (conv.history.length > 40) {
      conv.history = conv.history.slice(-40);
    }

    return finalText;
  } catch (e) {
    console.error("[WhatsApp AI] Erro:", e);
    return FALLBACK_REPLY;
  }
}
