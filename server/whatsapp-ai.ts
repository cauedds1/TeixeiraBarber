import OpenAI from "openai";
import { storage } from "./storage";
import { BOOKING_URL } from "./reminder";

let openaiClient: OpenAI | null = null;

function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

const FALLBACK_REPLY =
  `Olá! Sou o assistente virtual da Teixeira Barbearia. 🎩\n\n` +
  `Funcionamos de *Segunda a Sexta das 09h às 20h* e *Sábado das 08h às 14h*.\n\n` +
  `Para garantir seu lugar na cadeira e conferir todos os nossos serviços, acesse nossa agenda em tempo real aqui:\n${BOOKING_URL}`;

export async function handleIncomingMessage(
  text: string,
  slug: string
): Promise<string> {
  const client = getClient();
  if (!client) return FALLBACK_REPLY;

  try {
    const barbershop = await storage.getBarbershopBySlug(slug).catch(() => null);
    const services = await storage.getServices(barbershop?.id || "").catch(() => []);

    const serviceList = services
      .filter((s: any) => s.isActive)
      .map((s: any) => `- ${s.name}: R$ ${Number(s.price).toFixed(2)} | ${s.duration} min`)
      .join("\n") || "- Consulte nosso site para a lista completa";

    const systemPrompt = `Você é o assistente virtual da Teixeira Barbearia, uma barbearia premium localizada no Kobrasol, São José - SC (fundada em 2018). Sua linguagem deve ser a de um barbeiro de confiança: polida, acolhedora e com personalidade, como se fosse um atendente exclusivo.

INFORMAÇÕES DA BARBEARIA:
Nome: Teixeira Barbearia
Endereço: Rua Koesa, 430, Sala 03, Kobrasol, São José – SC
Instagram: @teixeirabarbeariaoficial

HORÁRIOS DE FUNCIONAMENTO:
- Segunda a Sexta: 09h às 20h
- Sábado: 08h às 14h
- Domingo: Fechado

SERVIÇOS E PREÇOS:
${serviceList}

AGENDAMENTO:
O agendamento é feito EXCLUSIVAMENTE pelo link online. Nunca agende por WhatsApp.
Link: ${BOOKING_URL}

REGRAS DE RESPOSTA:
- Comece SEMPRE com: "Olá! Sou o assistente virtual da Teixeira Barbearia. 🎩"
- Responda a pergunta do cliente de forma objetiva e curta (máximo 2-3 linhas)
- Encerre SEMPRE com: "Para garantir seu lugar na cadeira, acesse nossa agenda aqui: ${BOOKING_URL}"
- Use palavras como "ritual", "experiência" no lugar de "atendimento" ou "serviço"
- Use emojis com moderação: ✂️ 💈 ☕ 📅 (nunca use emojis coloridos ou infantis)
- Use *negrito* do WhatsApp para destacar horários, preços e datas importantes
- Não invente informações fora deste contexto`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      max_tokens: 350,
      temperature: 0.65,
    });

    return completion.choices[0]?.message?.content || FALLBACK_REPLY;
  } catch (e) {
    console.error("[WhatsApp AI] Erro:", e);
    return FALLBACK_REPLY;
  }
}
