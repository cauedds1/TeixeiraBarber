import { storage } from "./storage";
import { initiateReviewConversation } from "./review-conversation";
import { format, subDays, subMonths } from "date-fns";

function log(msg: string) {
  const t = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  console.log(`${t} [express] ${msg}`);
}

function timeToMs(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return (h * 60 + m) * 60 * 1000;
}

export function startReviewScheduler(): void {
  log("[Avaliações] Scheduler iniciado — verificando a cada 2 min");

  setInterval(async () => {
    try {
      const now = Date.now();
      const appointments = await storage.getAppointmentsForReview();

      for (const appt of appointments) {
        if (!appt.clientPhone || !appt.clientName) continue;

        const apptDate = appt.date as string;
        const endTime = appt.endTime as string;
        const apptEndMs = new Date(apptDate + "T00:00:00").getTime() + timeToMs(endTime);
        const elapsed = now - apptEndMs;
        const hoursElapsed = elapsed / 3_600_000;

        if (hoursElapsed < 2) continue;
        if (hoursElapsed > 5 * 24) {
          await storage.markReviewCompleted(appt.id);
          continue;
        }

        const lastReview = await storage.getLastReviewByPhone(appt.clientPhone, appt.barbershopId);
        if (lastReview) {
          const threeMonthsAgo = subMonths(new Date(), 3).getTime();
          if (new Date(lastReview.createdAt!).getTime() > threeMonthsAgo) {
            await storage.markReviewCompleted(appt.id);
            log(`[Avaliações] Pulando ${appt.clientPhone} — avaliou nos últimos 3 meses`);
            continue;
          }
        }

        const barber = appt.barberId ? await storage.getBarber(appt.barberId).catch(() => null) : null;

        await initiateReviewConversation(
          appt.clientPhone,
          appt.id,
          appt.barbershopId,
          barber?.name || "nosso barbeiro",
          appt.clientName
        );

        await storage.markReviewRequestSent(appt.id);
        log(`[Avaliações] Pedido de avaliação enviado para ${appt.clientName}`);
      }
    } catch (e) {
      log(`[Avaliações] Erro no scheduler: ${e}`);
    }
  }, 2 * 60 * 1000);
}
