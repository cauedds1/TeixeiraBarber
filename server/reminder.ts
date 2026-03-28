import { storage } from "./storage";
import { whatsappService } from "./whatsapp";
import { format } from "date-fns";

function log(msg: string) {
  const t = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${t} [express] ${msg}`);
}

export const BOOKING_URL = process.env.REPLIT_DEV_DOMAIN
  ? `https://${process.env.REPLIT_DEV_DOMAIN}/agendar/teixeira`
  : "https://teixeirabarber-production.up.railway.app/agendar/teixeira";

function timeToMs(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return (h * 60 + m) * 60 * 1000;
}

function paymentEmoji(method: string | null): string {
  switch (method) {
    case "pix":
      return "📱 Pix";
    case "credit":
      return "💳 Cartão Crédito";
    case "debit":
      return "💳 Cartão Débito";
    case "cash":
      return "💵 Dinheiro";
    default:
      return "💰 Outro";
  }
}

function formatCurrency(value: string | number | null): string {
  const n = parseFloat(String(value || "0"));
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

export function startReminderScheduler(): void {
  log("[Lembretes] Scheduler iniciado — verificando a cada 60s");

  setInterval(async () => {
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const unreminded = await storage.getUpcomingUnremindedAppointments(today);

      if (!unreminded.length) return;

      const now = Date.now();
      const dayStart = new Date(today + "T00:00:00").getTime();

      for (const appt of unreminded) {
        if (!appt.clientPhone || !appt.startTime) continue;

        const apptMs = dayStart + timeToMs(appt.startTime);
        const diff = apptMs - now;
        const diffMin = diff / 60000;

        if (diffMin >= 85 && diffMin <= 95) {
          try {
            const barber = appt.barberId
              ? await storage.getBarber(appt.barberId).catch(() => null)
              : null;

            const msg =
              `Fala, *${appt.clientName}*! ✂️\n\n` +
              `Passando para lembrar do seu horário hoje às *${appt.startTime}*.\n\n` +
              `O *${barber?.name || "nosso barbeiro"}* já está preparando a bancada para te receber. ` +
              `Se tiver algum imprevisto, por favor, nos avise o quanto antes.\n\n` +
              `Até logo! 💈`;

            await whatsappService.sendMessage(appt.clientPhone, msg);
            await storage.markReminderSent(appt.id);
            log(
              `[Lembretes] Lembrete enviado para ${appt.clientName} (${appt.startTime})`,
            );
          } catch (e) {
            log(`[Lembretes] Erro ao enviar lembrete para ${appt.id}: ${e}`);
          }
        }
      }
    } catch (e) {
      log(`[Lembretes] Erro no scheduler: ${e}`);
    }
  }, 60 * 1000);
}

export function startCheckoutFollowUpScheduler(): void {
  log("[Pós-Atendimento] Scheduler iniciado — verificando a cada 60s");

  setInterval(async () => {
    try {
      const pending = await storage.getCompletedWithoutFollowUp();
      if (!pending.length) return;

      for (const appt of pending) {
        if (!appt.clientPhone) continue;

        try {
          const serviceLine = [
            appt.service?.name || "Serviço",
            ...(appt.extraServices || []).map((e: any) => e.name),
          ].join(" + ");

          const productLines = (appt.productDetails || [])
            .map(
              (p: any) =>
                `🧴 ${p.name}${p.quantity > 1 ? ` (x${p.quantity})` : ""}`,
            )
            .join("\n");

          const totalValue = appt.finalPrice ?? appt.price;
          const payLine = paymentEmoji(appt.paymentMethod);

          let msg =
            `Valeu pela preferência, *${appt.clientName}*! ✂️\n\n` +
            `Aqui está o resumo do seu ritual de hoje:\n` +
            `🛠️ ${serviceLine}\n`;

          if (productLines) {
            msg += `${productLines}\n`;
          }

          msg +=
            `💰 Total: ${formatCurrency(totalValue)}\n\n` +
            `${payLine}\n\n` +
            `Seu visual está renovado! Se curtiu, avalia a gente abaixo, ajuda muito o nosso trabalho. 👇\n` +
            `${BOOKING_URL}`;

          await whatsappService.sendMessage(appt.clientPhone, msg);
          await storage.markCheckoutFollowUpSent(appt.id);
          await storage.markReviewRequestSent(appt.id);
          log(`[Pós-Atendimento] Mensagem enviada para ${appt.clientName}`);
        } catch (e) {
          log(`[Pós-Atendimento] Erro ao enviar para ${appt.id}: ${e}`);
        }
      }
    } catch (e) {
      log(`[Pós-Atendimento] Erro no scheduler: ${e}`);
    }
  }, 60 * 1000);
}
