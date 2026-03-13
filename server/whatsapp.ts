import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import * as qrcode from "qrcode";
import * as path from "path";
import P from "pino";
import { handleIncomingMessage } from "./whatsapp-ai";
import { isInReviewConversation, handleReviewResponse } from "./review-conversation";
import { log } from "./index";

const pinoLogger = P({ level: "silent" });

export type WhatsAppStatus = "connected" | "waiting_qr" | "disconnected";

const SESSION_DIR = path.join(process.cwd(), "whatsapp-session");

// Prevent Baileys internal unhandled rejections from crashing the server
process.on("unhandledRejection", (reason: any) => {
  const msg = reason?.message || String(reason);
  if (
    msg.includes("Connection Closed") ||
    msg.includes("Stream Errored") ||
    msg.includes("Connection Lost") ||
    msg.includes("Timed Out")
  ) {
    log(`[WhatsApp] Rejeição interna ignorada: ${msg}`);
    return;
  }
  log(`[Unhandled Rejection] ${msg}`);
});

class WhatsAppService {
  private sock: WASocket | null = null;
  private status: WhatsAppStatus = "disconnected";
  private qrDataUrl: string | null = null;
  private barbershopSlug = "teixeira";

  getStatus(): WhatsAppStatus {
    return this.status;
  }

  getQR(): string | null {
    return this.qrDataUrl;
  }

  /**
   * Build candidate JIDs for a phone number.
   * Ensures the country code 55 is present and generates both
   * the 12-digit (without extra 9) and 13-digit (with extra 9) variants
   * used by Brazilian mobile numbers.
   */
  private buildCandidates(phone: string): string[] {
    let base = phone.replace(/\D/g, "");
    if (!base.startsWith("55")) base = "55" + base;

    const candidates: string[] = [base];
    if (base.length === 13) {
      // 5548999186712 → 554899186712 (drop the extra 9 at position 4)
      candidates.push(base.slice(0, 4) + base.slice(5));
    } else if (base.length === 12) {
      // 554899186712 → 5548999186712 (insert extra 9 at position 4)
      candidates.push(base.slice(0, 4) + "9" + base.slice(4));
    }

    return candidates;
  }

  /**
   * Send a WhatsApp message to the given phone number.
   * Tries both BR number formats (with/without the extra 9th digit).
   * Does NOT call onWhatsApp() to avoid Baileys internal crashes.
   */
  async sendMessage(phone: string, text: string): Promise<boolean> {
    if (!this.sock || this.status !== "connected") {
      log("[WhatsApp] Não conectado — mensagem não enviada");
      return false;
    }

    const candidates = this.buildCandidates(phone);

    for (const candidate of candidates) {
      const jid = `${candidate}@s.whatsapp.net`;
      try {
        await this.sock.sendMessage(jid, { text });
        log(`[WhatsApp] Mensagem enviada para ${jid}`);
        return true;
      } catch (e: any) {
        log(`[WhatsApp] Falha com ${jid}: ${e?.message ?? e}`);
      }
    }

    log(`[WhatsApp] Nenhum formato funcionou para ${phone}`);
    return false;
  }

  async connect(): Promise<void> {
    try {
      const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
      const { version } = await fetchLatestBaileysVersion();

      const sock = makeWASocket({
        version,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, pinoLogger),
        },
        printQRInTerminal: false,
        logger: pinoLogger,
        browser: ["Teixeira Barbearia", "Chrome", "1.0.0"],
        generateHighQualityLinkPreview: false,
      });

      this.sock = sock;

      sock.ev.on("creds.update", saveCreds);

      sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
        if (qr) {
          this.status = "waiting_qr";
          this.qrDataUrl = await qrcode.toDataURL(qr);
          log("[WhatsApp] QR Code gerado — aguardando scan");
        }

        if (connection === "open") {
          this.status = "connected";
          this.qrDataUrl = null;
          log("[WhatsApp] Conectado com sucesso!");
        }

        if (connection === "close") {
          const reason = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const shouldReconnect = reason !== DisconnectReason.loggedOut;
          log(`[WhatsApp] Conexão fechada. Motivo: ${reason}. Reconectar: ${shouldReconnect}`);
          this.status = "disconnected";
          this.sock = null;
          if (shouldReconnect) {
            setTimeout(() => this.connect(), 5000);
          }
        }
      });

      sock.ev.on("messages.upsert", async ({ messages, type }) => {
        if (type !== "notify") return;
        for (const msg of messages) {
          if (msg.key.fromMe) continue;
          const from = msg.key.remoteJid;
          if (!from || from.endsWith("@g.us")) continue;
          const text =
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            "";
          if (!text.trim()) continue;

          const phone = from.replace("@s.whatsapp.net", "");
          let reply: string | null = null;

          try {
            if (isInReviewConversation(phone)) {
              reply = await handleReviewResponse(phone, text);
            } else {
              reply = await handleIncomingMessage(text, this.barbershopSlug);
            }

            if (reply) {
              await sock.sendMessage(from, { text: reply });
            }
          } catch (e) {
            log(`[WhatsApp] Erro ao processar mensagem: ${e}`);
          }
        }
      });
    } catch (e) {
      log(`[WhatsApp] Erro ao inicializar: ${e}`);
      this.status = "disconnected";
      setTimeout(() => this.connect(), 10000);
    }
  }

  async reconnect(): Promise<void> {
    log("[WhatsApp] Reconectando...");
    if (this.sock) {
      try { this.sock.end(undefined); } catch {}
      this.sock = null;
    }
    this.status = "disconnected";
    this.qrDataUrl = null;
    await this.connect();
  }
}

export const whatsappService = new WhatsAppService();
