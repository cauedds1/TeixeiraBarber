import OpenAI from "openai";
import { storage } from "./storage";

let openaiClient: OpenAI | null = null;

function getClient(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

const FALLBACK_REPLY =
  "Olá! Somos a Teixeira Barbearia 💈\n\nPara agendar seu horário, acesse:\nhttps://57963618-5dfb-413a-88eb-ab8ee22cb96d-00-347r04xq55rqy.spock.replit.dev/agendar/teixeira\n\nFuncionamos de Segunda a Sexta das 09h às 20h e Sábado das 08h às 14h. 🙌";

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
      .map((s: any) => `- ${s.name}: R$ ${Number(s.price).toFixed(2)}, ${s.duration} min`)
      .join("\n") || "- Serviços não cadastrados ainda";

    const systemPrompt = `Você é o assistente virtual da Teixeira Barbearia, localizada no Kobrasol, São José - SC (est. 2018). Responda de forma simpática, cordial e objetiva em português brasileiro.

INFORMAÇÕES DA BARBEARIA:
Nome: Teixeira Barbearia
Endereço: Rua Koesa, 430, Sala 03, Kobrasol, São José – SC
WhatsApp: 48 99950-5167
Instagram: @teixeirabarbeariaoficial

HORÁRIOS:
- Segunda a Sexta: 09h às 20h
- Sábado: 08h às 14h
- Domingo: Fechado

SERVIÇOS E PREÇOS:
${serviceList}

AGENDAMENTO:
O agendamento é feito EXCLUSIVAMENTE pelo link online. Não é possível agendar por WhatsApp.
Link: https://57963618-5dfb-413a-88eb-ab8ee22cb96d-00-347r04xq55rqy.spock.replit.dev/agendar/teixeira

INSTRUÇÕES:
- Seja amigável e use emojis com moderação
- Responda perguntas sobre serviços, preços e horários diretamente
- Para agendamento, sempre direcione para o link
- Seja breve (máximo 3-4 linhas por resposta)
- Não invente informações que não estão neste contexto`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content || FALLBACK_REPLY;
  } catch (e) {
    console.error("[WhatsApp AI] Erro:", e);
    return FALLBACK_REPLY;
  }
}
