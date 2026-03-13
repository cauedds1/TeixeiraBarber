import { storage } from "./storage";
import { whatsappService } from "./whatsapp";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function log(msg: string) {
  const t = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  console.log(`${t} [express] ${msg}`);
}

type ReviewStep = "ask_barber_rating" | "ask_testimonial" | "ask_barbershop_rating" | "done";

interface ReviewConversation {
  step: ReviewStep;
  appointmentId: string;
  barbershopId: string;
  barberName: string;
  barberRating?: number;
  testimonial?: string;
  expiresAt: number;
}

const activeConversations = new Map<string, ReviewConversation>();

function parseRating(text: string): number | null {
  const clean = text.trim().toLowerCase();
  const starMap: Record<string, number> = {
    "1": 1, "2": 2, "3": 3, "4": 4, "5": 5,
    "um": 1, "dois": 2, "três": 3, "quatro": 4, "cinco": 5,
    "1 estrela": 1, "2 estrelas": 2, "3 estrelas": 3, "4 estrelas": 4, "5 estrelas": 5,
    "⭐": 1, "⭐⭐": 2, "⭐⭐⭐": 3, "⭐⭐⭐⭐": 4, "⭐⭐⭐⭐⭐": 5,
  };
  if (starMap[clean] !== undefined) return starMap[clean];
  const stars = (clean.match(/⭐/g) || []).length;
  if (stars >= 1 && stars <= 5) return stars;
  const num = parseInt(clean);
  if (!isNaN(num) && num >= 1 && num <= 5) return num;
  return null;
}

function isNegativeResponse(text: string): boolean {
  const t = text.trim().toLowerCase();
  return ["não", "nao", "n", "no", "agora não", "agora nao", "depois", "skip", "pular"].some(w => t === w || t.startsWith(w + " "));
}

export function isInReviewConversation(phone: string): boolean {
  const conv = activeConversations.get(phone);
  if (!conv) return false;
  if (Date.now() > conv.expiresAt) {
    activeConversations.delete(phone);
    return false;
  }
  return conv.step !== "done";
}

export async function initiateReviewConversation(
  phone: string,
  appointmentId: string,
  barbershopId: string,
  barberName: string,
  clientName: string
): Promise<void> {
  const conv: ReviewConversation = {
    step: "ask_barber_rating",
    appointmentId,
    barbershopId,
    barberName,
    expiresAt: Date.now() + 5 * 24 * 60 * 60 * 1000,
  };
  activeConversations.set(phone, conv);

  const msg =
    `Olá, *${clientName}*! 🎩\n\n` +
    `Obrigado por visitar a *Teixeira Barbearia*!\n\n` +
    `Sua opinião é muito importante para nós. Pode nos dar uma avaliação rápida?\n\n` +
    `Primeiro: como você avalia o serviço do barbeiro *${barberName}*?\n\n` +
    `Responda com um número de *1 a 5* ⭐`;

  await whatsappService.sendMessage(phone, msg);
  log(`[Avaliações] Conversa iniciada com ${phone} para agendamento ${appointmentId}`);
}

export async function handleReviewResponse(
  phone: string,
  text: string,
  clientName?: string
): Promise<string | null> {
  const conv = activeConversations.get(phone);
  if (!conv || Date.now() > conv.expiresAt) {
    activeConversations.delete(phone);
    return null;
  }

  if (conv.step === "ask_barber_rating") {
    if (isNegativeResponse(text)) {
      activeConversations.delete(phone);
      await storage.markReviewCompleted(conv.appointmentId);
      return `Tudo bem! Se mudar de ideia, pode nos contar a qualquer momento. ✂️\n\nAté a próxima na Teixeira Barbearia! 💈`;
    }

    const rating = parseRating(text);
    if (!rating) {
      return `Responda com um número de *1 a 5* ⭐\n\n(1 = Ruim, 5 = Excelente)`;
    }

    conv.barberRating = rating;
    conv.step = "ask_testimonial";

    const stars = "⭐".repeat(rating);
    return (
      `${stars} Obrigado pela avaliação!\n\n` +
      `Quer deixar um depoimento curto sobre sua experiência? Ele aparecerá em nosso site!\n\n` +
      `Escreva seu depoimento ou responda *"pular"* para continuar.`
    );
  }

  if (conv.step === "ask_testimonial") {
    let testimonial: string | undefined;
    if (!isNegativeResponse(text) && text.trim().toLowerCase() !== "pular") {
      testimonial = text.trim().slice(0, 500);
    }
    conv.testimonial = testimonial;
    conv.step = "ask_barbershop_rating";

    return (
      `Perfeito! Agora, como você avalia a *Teixeira Barbearia* no geral?\n\n` +
      `Responda com um número de *1 a 5* ⭐`
    );
  }

  if (conv.step === "ask_barbershop_rating") {
    if (isNegativeResponse(text)) {
      await saveReview(phone, conv, clientName, undefined);
      activeConversations.delete(phone);
      return buildThankYouMessage(conv.barberRating, undefined);
    }

    const barbershopRating = parseRating(text);
    if (!barbershopRating) {
      return `Responda com um número de *1 a 5* ⭐`;
    }

    await saveReview(phone, conv, clientName, barbershopRating);
    activeConversations.delete(phone);
    return buildThankYouMessage(conv.barberRating, barbershopRating);
  }

  return null;
}

function buildThankYouMessage(barberRating?: number, barbershopRating?: number): string {
  const stars = barbershopRating ? "⭐".repeat(barbershopRating) : "";
  return (
    `${stars ? stars + " " : ""}Muito obrigado pela sua avaliação! 🎩\n\n` +
    `Seu feedback nos ajuda a entregar sempre o melhor ritual para você.\n\n` +
    `Até a próxima na *Teixeira Barbearia*! ✂️💈`
  );
}

async function saveReview(
  phone: string,
  conv: ReviewConversation,
  clientName?: string,
  barbershopRating?: number
): Promise<void> {
  try {
    const appt = await storage.getAppointment(conv.appointmentId).catch(() => null);
    const barber = appt?.barberId ? await storage.getBarber(appt.barberId).catch(() => null) : null;

    await storage.createReviewFromWA({
      barbershopId: conv.barbershopId,
      barberId: appt?.barberId || null,
      appointmentId: conv.appointmentId,
      rating: conv.barberRating || null,
      barbershopRating: barbershopRating || null,
      comment: conv.testimonial || null,
      clientPhone: phone,
      clientName: clientName || appt?.clientName || null,
      isPublic: true,
    });

    await storage.markReviewCompleted(conv.appointmentId);
    log(`[Avaliações] Review salvo — barbeiro: ${conv.barberRating}/5, barbearia: ${barbershopRating || "N/A"}/5`);
  } catch (e) {
    log(`[Avaliações] Erro ao salvar review: ${e}`);
  }
}
