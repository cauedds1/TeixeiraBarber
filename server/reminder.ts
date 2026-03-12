import { storage } from "./storage";
import { whatsappService } from "./whatsapp";
import { format } from "date-fns";

function log(msg: string) {
  const t = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true });
  console.log(`${t} [express] ${msg}`);
}

const BOOKING_URL = process.env.REPLIT_DEV_DOMAIN
  ? `https://${process.env.REPLIT_DEV_DOMAIN}/agendar/teixeira`
  : "https://57963618-5dfb-413a-88eb-ab8ee22cb96d-00-347r04xq55rqy.spock.replit.dev/agendar/teixeira";

function timeToMs(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return (h * 60 + m) * 60 * 1000;
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
            log(`[Lembretes] Lembrete enviado para ${appt.clientName} (${appt.startTime})`);
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

export { BOOKING_URL };
