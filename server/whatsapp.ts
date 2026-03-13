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

  async sendMessage(phone: string, text: string): Promise<boolean> {
    if (!this.sock || this.status !== "connected") {
      log("[WhatsApp] Não conectado — mensagem não enviada");
      return false;
    }
    try {
      const digits = phone.replace(/\D/g, "");
      const jid = digits.includes("@") ? digits : `${digits}@s.whatsapp.net`;
      await this.sock.sendMessage(jid, { text });
      log(`[WhatsApp] Mensagem enviada para ${digits}`);
      return true;
    } catch (e) {
      log(`[WhatsApp] Erro ao enviar mensagem: ${e}`);
      return false;
    }
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

          if (isInReviewConversation(phone)) {
            reply = await handleReviewResponse(phone, text);
          } else {
            reply = await handleIncomingMessage(text, this.barbershopSlug);
          }

          if (reply) {
            await sock.sendMessage(from, { text: reply });
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
