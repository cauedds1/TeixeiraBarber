import OpenAI from "openai";
import { storage } from "./storage";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BOOKING_URL } from "./reminder";

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

interface PendingBookingData {
  barberId: string;
  barberName: string;
  serviceId: string;
  serviceName: string;
  date: string;
  slot: string;
  clientName: string;
  durationMin: number;
  price: number;
}

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
  pending?: PendingBookingData;
  cancelTargetId?: string;
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
      description:
        "Retorna todos os serviços ativos da barbearia com id, nome, preço e duração. " +
        "Use quando o cliente quiser ver o cardápio completo ou quando precisar encontrar " +
        "o id de um serviço que o cliente mencionou.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "listar_barbeiros",
      description: "Retorna os barbeiros ativos com id e nome.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "verificar_disponibilidade",
      description:
        "Verifica horários livres em tempo real. Consulta o banco de dados ao vivo — " +
        "reflete imediatamente qualquer agendamento feito pelo site ou pelo WhatsApp. " +
        "Se barbeiro_id for 'qualquer', retorna horários disponíveis por barbeiro.",
      parameters: {
        type: "object",
        properties: {
          barbeiro_id: {
            type: "string",
            description: "ID do barbeiro, ou 'qualquer' se o cliente não tiver preferência.",
          },
          data: { type: "string", description: "Data no formato YYYY-MM-DD." },
          duracao_minutos: { type: "number", description: "Duração do serviço em minutos." },
        },
        required: ["barbeiro_id", "data", "duracao_minutos"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "propor_agendamento",
      description:
        "Registra internamente a proposta de agendamento com todos os dados coletados. " +
        "Chame esta tool ANTES de apresentar a frase de confirmação ao cliente. " +
        "Após chamar esta tool, SEMPRE escreva a mensagem de confirmação no formato exato: " +
        "'Posso confirmar *[Serviço]* às *[HH:MM]* do dia *[DD/MM]* com *[Barbeiro]* por *R$ [preço]*? Responda *sim* para confirmar.' " +
        "Só chame confirmar_agendamento na mensagem SEGUINTE, quando o cliente responder positivamente.",
      parameters: {
        type: "object",
        properties: {
          barbeiro_id: { type: "string" },
          barbeiro_nome: { type: "string" },
          servico_id: { type: "string" },
          servico_nome: { type: "string" },
          data: { type: "string", description: "YYYY-MM-DD" },
          horario: { type: "string", description: "HH:MM" },
          nome_cliente: { type: "string" },
          duracao_minutos: { type: "number" },
          preco: { type: "number" },
        },
        required: [
          "barbeiro_id", "barbeiro_nome", "servico_id", "servico_nome",
          "data", "horario", "nome_cliente", "duracao_minutos", "preco",
        ],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "confirmar_agendamento",
      description:
        "Cria o agendamento no banco de dados. Só chame esta tool quando o cliente " +
        "tiver respondido positivamente à frase de confirmação (sim, confirmo, pode agendar, etc.). " +
        "NÃO chame antes de obter confirmação explícita do cliente.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "buscar_agendamento_para_cancelar",
      description:
        "Busca os próximos agendamentos ativos do cliente pelo número de telefone. " +
        "Use quando o cliente quiser cancelar um agendamento.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "executar_cancelamento",
      description:
        "Cancela o agendamento no banco de dados. Só chame após o cliente confirmar " +
        "que quer cancelar.",
      parameters: {
        type: "object",
        properties: {
          agendamento_id: { type: "string", description: "ID do agendamento a cancelar." },
        },
        required: ["agendamento_id"],
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Tool execution
// ---------------------------------------------------------------------------

const AFFIRMATIVE_PATTERNS = [
  "sim", "s", "yes", "y", "confirmo", "confirmado", "confirmar",
  "pode", "pode ser", "ok", "okay", "tá", "ta", "tá bom", "ta bom",
  "quero", "feito", "vai", "vamos", "bora", "certo", "perfeito", "ótimo", "otimo",
  "isso", "esse", "esse mesmo", "esse horário", "esse horario",
];

function isAffirmative(text: string): boolean {
  const normalized = text.trim().toLowerCase().replace(/[!.]/g, "");
  return AFFIRMATIVE_PATTERNS.some(
    (p) => normalized === p || normalized.startsWith(p + " ") || normalized.endsWith(" " + p)
  );
}

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  barbershopId: string,
  phone: string,
  booking: BookingState,
  lastUserMessage: string
): Promise<string> {
  try {
    // ---- listar_servicos ----
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

    // ---- listar_barbeiros ----
    if (name === "listar_barbeiros") {
      const barbers = await storage.getBarbers(barbershopId);
      const active = barbers.filter((b) => b.isActive);
      if (!active.length) return JSON.stringify({ erro: "Nenhum barbeiro disponível." });
      return JSON.stringify(active.map((b) => ({ id: b.id, nome: b.name })));
    }

    // ---- verificar_disponibilidade ----
    if (name === "verificar_disponibilidade") {
      const barbeiroId = String(args.barbeiro_id ?? "");
      const data = String(args.data ?? "");
      const duracaoMinutos = Number(args.duracao_minutos ?? 30);

      if (data) booking.date = data;
      if (duracaoMinutos) booking.durationMin = duracaoMinutos;

      if (barbeiroId === "qualquer") {
        const barbers = await storage.getBarbers(barbershopId);
        const active = barbers.filter((b) => b.isActive);
        const results: Array<{ barbeiro: string; id: string; horarios: string[] }> = [];

        for (const barber of active) {
          const slots = await getSlotsForBarber(barber.id, data, duracaoMinutos);
          if (slots.length > 0) {
            results.push({ barbeiro: barber.name, id: barber.id, horarios: slots.slice(0, 6) });
          }
        }

        if (!results.length) {
          return JSON.stringify({ disponivel: false, mensagem: "Nenhum barbeiro tem horários disponíveis nesta data." });
        }

        const best = results.reduce((a, b) => (a.horarios.length >= b.horarios.length ? a : b));
        booking.barberId = best.id;
        booking.barberName = best.barbeiro;

        return JSON.stringify({ disponivel: true, por_barbeiro: results });
      }

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

    // ---- propor_agendamento ----
    if (name === "propor_agendamento") {
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
          erro: "Dados incompletos para propor agendamento.",
          faltando: {
            barbeiro: !barbeiroId,
            servico: !servicoId,
            data: !data,
            horario: !horario,
            nome: !nomeCliente,
          },
        });
      }

      // Validate entities
      const barber = await storage.getBarber(barbeiroId).catch(() => null);
      if (!barber || barber.barbershopId !== barbershopId || !barber.isActive) {
        return JSON.stringify({ erro: "Barbeiro inválido." });
      }
      const service = await storage.getService(servicoId).catch(() => null);
      if (!service || service.barbershopId !== barbershopId || !service.isActive) {
        return JSON.stringify({ erro: "Serviço inválido." });
      }

      // Check slot still free at proposal time
      const availableNow = await getSlotsForBarber(barbeiroId, data, duracaoMinutos);
      if (!availableNow.includes(horario)) {
        return JSON.stringify({
          erro: "Horário não disponível.",
          horarios_disponiveis: availableNow.slice(0, 6),
        });
      }

      // Store pending proposal
      booking.pending = {
        barberId: barbeiroId,
        barberName: barbeiroNome || barber.name,
        serviceId: servicoId,
        serviceName: servicoNome || service.name,
        date: data,
        slot: horario,
        clientName: nomeCliente,
        durationMin: duracaoMinutos,
        price: preco || Number(service.price),
      };

      return JSON.stringify({
        proposta_registrada: true,
        servico: booking.pending.serviceName,
        horario: booking.pending.slot,
        data: booking.pending.date,
        barbeiro: booking.pending.barberName,
        preco: booking.pending.price.toFixed(2),
        nome: booking.pending.clientName,
      });
    }

    // ---- confirmar_agendamento ----
    if (name === "confirmar_agendamento") {
      // Server-side guard: only proceed if the user's last message was affirmative
      if (!isAffirmative(lastUserMessage)) {
        return JSON.stringify({
          erro: "Aguardando confirmação do cliente. O cliente ainda não respondeu positivamente.",
        });
      }

      const p = booking.pending;
      if (!p) {
        return JSON.stringify({ erro: "Nenhuma proposta de agendamento pendente." });
      }

      // Final slot revalidation before writing
      const availableNow = await getSlotsForBarber(p.barberId, p.date, p.durationMin);
      if (!availableNow.includes(p.slot)) {
        booking.pending = undefined;
        return JSON.stringify({
          erro: "O horário não está mais disponível. Preciso oferecer outro horário.",
          horarios_disponiveis: availableNow.slice(0, 6),
        });
      }

      const startMin = timeToMinutes(p.slot);
      const endTime = minutesToTime(startMin + p.durationMin);

      const appt = await storage.createAppointment({
        barbershopId,
        barberId: p.barberId,
        serviceId: p.serviceId,
        date: p.date,
        startTime: p.slot,
        endTime,
        status: "confirmed",
        price: String(p.price),
        clientName: p.clientName,
        clientPhone: phone,
      });

      // Persist client name to DB so the bot remembers it forever
      if (p.clientName) {
        const normalizedPhone = phone.replace(/\D/g, "");
        storage.upsertClientByPhone(barbershopId, normalizedPhone, p.clientName).catch((e) => {
          console.error("[WhatsApp AI] Erro ao salvar nome do cliente:", e);
        });
      }

      // Persist to booking state
      booking.barberId = p.barberId;
      booking.barberName = p.barberName;
      booking.serviceId = p.serviceId;
      booking.serviceName = p.serviceName;
      booking.durationMin = p.durationMin;
      booking.price = p.price;
      booking.date = p.date;
      booking.slot = p.slot;
      booking.clientName = p.clientName;
      booking.pending = undefined;

      return JSON.stringify({
        sucesso: true,
        agendamento_id: appt.id,
        barbeiro: p.barberName,
        servico: p.serviceName,
        data: p.date,
        horario: p.slot,
        nome: p.clientName,
      });
    }

    // ---- buscar_agendamento_para_cancelar ----
    if (name === "buscar_agendamento_para_cancelar") {
      const appts = await storage.getUpcomingAppointmentsByPhone(phone, barbershopId).catch(() => []);
      if (!appts.length) {
        return JSON.stringify({ encontrado: false, mensagem: "Nenhum agendamento ativo encontrado para este número." });
      }

      // Use only the soonest appointment as the default cancel target
      const next = appts[0];
      const barber = next.barberId ? await storage.getBarber(next.barberId).catch(() => null) : null;
      const service = next.serviceId ? await storage.getService(next.serviceId).catch(() => null) : null;

      const result = {
        id: next.id,
        servico: service?.name ?? "Serviço",
        barbeiro: barber?.name ?? "Barbeiro",
        data: next.date,
        horario: next.startTime,
        status: next.status,
      };

      booking.cancelTargetId = next.id;

      const hasMore = appts.length > 1;

      return JSON.stringify({
        encontrado: true,
        proximo_agendamento: result,
        total_agendamentos: appts.length,
        observacao: hasMore
          ? `O cliente tem ${appts.length} agendamentos futuros. Este é o mais próximo. Se quiser cancelar outro, peça o detalhamento.`
          : undefined,
      });
    }

    // ---- executar_cancelamento ----
    if (name === "executar_cancelamento") {
      const agendamentoId = String(args.agendamento_id ?? booking.cancelTargetId ?? "");
      if (!agendamentoId) {
        return JSON.stringify({ erro: "ID do agendamento não informado." });
      }

      // Validate ownership before cancelling
      const appt = await storage.getAppointment(agendamentoId).catch(() => null);
      if (!appt || appt.barbershopId !== barbershopId) {
        return JSON.stringify({ erro: "Agendamento não encontrado." });
      }
      if (appt.clientPhone !== phone) {
        return JSON.stringify({ erro: "Este agendamento não pertence a este número." });
      }
      if (appt.status === "cancelled") {
        return JSON.stringify({ erro: "Este agendamento já está cancelado." });
      }

      await storage.updateAppointmentStatus(agendamentoId, "cancelled");
      booking.cancelTargetId = undefined;

      return JSON.stringify({
        sucesso: true,
        mensagem: "Agendamento cancelado com sucesso.",
        agendamento_id: agendamentoId,
      });
    }

    return JSON.stringify({ erro: "Ferramenta desconhecida." });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro interno.";
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

    const normalizedPhone = phone.replace(/\D/g, "");
    const knownClient = await storage.getClientByPhone(barbershop.id, normalizedPhone).catch(() => null);
    const knownName = knownClient?.name ?? null;

    const conv = getOrCreateConversation(phone);
    const isFirstContact = conv.history.length === 0;

    // Inject DB name into conversation state — DB is the source of truth
    if (knownName !== null) {
      conv.booking.clientName = knownName;
    }

    conv.history.push({ role: "user", content: text });

    const systemPrompt = `Você é Rafael, atendente da Teixeira Barbearia. Atende clientes pelo WhatsApp de forma natural e humana — como um funcionário real, direto ao ponto.

BARBEARIA:
- Nome: Teixeira Barbearia
- Endereço: Rua Koesa, 430, Sala 03, Kobrasol, São José – SC
- Instagram: @teixeirabarbeariaoficial
- Site/agendamento online: ${BOOKING_URL}

HORÁRIOS:
- Segunda a Sexta: 09h às 20h
- Sábado: 08h às 14h
- Domingo: fechado

DATA DE HOJE: ${todayReadable} (formato YYYY-MM-DD: ${today})

═══════════════════════════════════════
CLIENTE ATUAL
═══════════════════════════════════════
- Telefone: ${phone}
${knownName
  ? `- Nome: ${knownName}\n⚠️ Você JÁ SABE o nome deste cliente. NUNCA peça o nome novamente. Use-o naturalmente na conversa.`
  : "- Nome: desconhecido (pergunte quando necessário para agendar — apenas uma vez)"}

═══════════════════════════════════════
PRIMEIRO CONTATO${isFirstContact ? " ← ESTA É A PRIMEIRA MENSAGEM DO CLIENTE" : ""}
═══════════════════════════════════════
${isFirstContact ? `Se for o primeiro contato, responda de forma breve e objetiva:
1. Se apresente rapidamente ("Oi! Aqui é o Rafael da Teixeira Barbearia 💈")
${knownName ? `2. Chame o cliente pelo nome (${knownName}) e pergunte como pode ajudar` : `2. Mencione que pode agendar pelo site: ${BOOKING_URL}
3. E também pelo próprio WhatsApp — é só falar
4. Pergunte como pode ajudar`}
Seja curto. Não escreva parágrafos.` : "Continue a conversa normalmente."}

═══════════════════════════════════════
COMPORTAMENTO GERAL
═══════════════════════════════════════
- Linguagem informal, descontraída. Sem formalidades.
- Respostas curtas e diretas. Nada de parágrafos longos.
- Use *negrito* para horários, preços, nomes e datas.
- Emojis com moderação (✂️ 💈 👊 😄).
- Se perguntarem se você é IA: "Sou tão real quanto uma navalha bem afiada 😄"
- NUNCA fale de assuntos fora da barbearia. Redirecione: "Aqui só entendo de barba e cabelo 😄"

═══════════════════════════════════════
FLUXO DE AGENDAMENTO (SEJA EFICIENTE)
═══════════════════════════════════════
REGRA PRINCIPAL: Vá direto ao ponto. Colete informações em paralelo sempre que possível.

QUANDO O CLIENTE JÁ MENCIONA UM SERVIÇO ("quero cortar o cabelo", "quero fazer a barba", etc.):
→ Chame listar_servicos para encontrar o ID do serviço mencionado (NÃO mostre o menu completo)
→ Pergunte a data e a preferência de barbeiro AO MESMO TEMPO, em uma única mensagem
→ Com data e barbeiro definidos, chame verificar_disponibilidade imediatamente
→ Mostre os horários disponíveis JÁ com o serviço e preço: "Tenho esses horários para *Corte de Cabelo* (R$ 35,00 | 40 min) com o *João*:"

QUANDO O CLIENTE NÃO ESPECIFICA O SERVIÇO:
→ Chame listar_servicos e mostre o menu brevemente
→ Pergunte qual quer

QUANDO O CLIENTE PEDE PARA VER TODOS OS SERVIÇOS:
→ Chame listar_servicos e liste todos com preço e duração

PASSOS DO AGENDAMENTO:
1. Identifique o serviço (ID + nome + preço + duração)
2. Verifique preferência de barbeiro (se não tiver, use barbeiro_id='qualquer')
3. Obtenha a data desejada (interprete linguagem natural usando a data atual)
4. Chame verificar_disponibilidade e mostre até 6 horários
5. Cliente escolhe o horário
6. Se ainda não souber o nome, pergunte
7. Com TODOS os dados: chame propor_agendamento
8. OBRIGATÓRIO: escreva EXATAMENTE esta frase após propor_agendamento:
   "Posso confirmar *[Serviço]* às *[HH:MM]* do dia *[DD/MM]* com *[Barbeiro]* por *R$ [preço]*? Responda *sim* para confirmar."
9. APENAS quando o cliente responder "sim", "confirmo", "pode", "ok" ou similar → chame confirmar_agendamento
10. Confirme o agendamento com os detalhes e uma mensagem simpática

REGRAS DE OURO:
- NUNCA chame confirmar_agendamento sem antes chamar propor_agendamento E receber "sim" do cliente
- NUNCA invente horários — sempre use verificar_disponibilidade
- Se o horário já foi tomado, informe e ofereça outros
- Os horários refletem o banco em tempo real (site + WhatsApp compartilham os mesmos dados)

═══════════════════════════════════════
FLUXO DE CANCELAMENTO
═══════════════════════════════════════
QUANDO O CLIENTE QUER CANCELAR:
1. Chame buscar_agendamento_para_cancelar
2. Apresente os agendamentos encontrados com detalhes (serviço, barbeiro, data, horário)
3. Pergunte se confirma o cancelamento: "Confirma o cancelamento de *[Serviço]* às *[HH:MM]* do dia *[DD/MM]*?"
4. APENAS quando o cliente confirmar → chame executar_cancelamento com o agendamento_id
5. Informe que foi cancelado e que pode reagendar quando quiser`;

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
      temperature: 0.7,
    });

    let iterations = 0;
    while (response.choices[0]?.finish_reason === "tool_calls" && iterations < 8) {
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
          conv.booking,
          text
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
        temperature: 0.7,
      });
    }

    const finalText = response.choices[0]?.message?.content ?? FALLBACK_REPLY;
    conv.history.push({ role: "assistant", content: finalText });

    // Keep history bounded — last 40 messages
    if (conv.history.length > 40) {
      conv.history = conv.history.slice(-40);
    }

    return finalText;
  } catch (e) {
    console.error("[WhatsApp AI] Erro:", e);
    return FALLBACK_REPLY;
  }
}
