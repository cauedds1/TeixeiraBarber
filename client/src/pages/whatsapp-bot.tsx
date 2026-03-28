import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Wifi, WifiOff, QrCode, RefreshCw, MessageCircle, Bot, Bell, Zap, LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type WAStatus = "connected" | "waiting_qr" | "connecting" | "disconnected";

interface WhatsAppStatusResponse {
  status: WAStatus;
  qr?: string | null;
  phone?: string | null;
}

function formatBrazilianPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) {
    const withoutCountry = digits.slice(2);
    const ddd = withoutCountry.slice(0, 2);
    const rest = withoutCountry.slice(2);
    if (rest.length === 9) return `+55 ${ddd} ${rest.slice(0, 5)}-${rest.slice(5)}`;
    if (rest.length === 8) return `+55 ${ddd} ${rest.slice(0, 4)}-${rest.slice(4)}`;
  }
  return `+${digits}`;
}

export default function WhatsAppBotPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // Track when the user last clicked reconnect so we can poll aggressively
  const [reconnectingUntil, setReconnectingUntil] = useState<number>(0);
  const reconnectingUntilRef = useRef(reconnectingUntil);
  reconnectingUntilRef.current = reconnectingUntil;

  const { data, isLoading } = useQuery<WhatsAppStatusResponse>({
    queryKey: ["/api/whatsapp/status"],
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      if (s === "connected") return 30000;
      if (s === "waiting_qr") return 3000;
      // "connecting" means backend is initialising — poll fast to catch QR/connected
      if (s === "connecting") return 2000;
      // After reconnect is clicked, poll every 2s for 30s to catch the QR quickly
      if (Date.now() < reconnectingUntilRef.current) return 2000;
      return 3000;
    },
  });

  const reconnectMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/whatsapp/reconnect"),
    onSuccess: () => {
      // Poll aggressively for the next 30 seconds while waiting for the QR
      setReconnectingUntil(Date.now() + 30_000);
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/status"] });
      toast({ title: "Reconectando...", description: "Aguarde o QR Code aparecer." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao reconectar.", variant: "destructive" });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/whatsapp/disconnect"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whatsapp/status"] });
      toast({ title: "Desconectado", description: "Sessão do WhatsApp encerrada com sucesso." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Falha ao desconectar.", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (data?.status === "connected") {
      toast({ title: "WhatsApp conectado! ✅", description: "Bot ativo e pronto para enviar mensagens." });
    }
  }, [data?.status === "connected"]);

  const status = data?.status ?? "disconnected";

  const statusConfig = {
    connected: {
      label: "Conectado",
      icon: Wifi,
      badgeClass: "bg-[#C9A24D]/15 text-[#C9A24D] border-[#C9A24D]/30",
      dot: "bg-[#C9A24D]",
    },
    waiting_qr: {
      label: "Aguardando scan",
      icon: QrCode,
      badgeClass: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      dot: "bg-yellow-400 animate-pulse",
    },
    connecting: {
      label: "Conectando…",
      icon: RefreshCw,
      badgeClass: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      dot: "bg-yellow-400 animate-pulse",
    },
    disconnected: {
      label: "Desconectado",
      icon: WifiOff,
      badgeClass: "bg-red-500/20 text-red-400 border-red-500/30",
      dot: "bg-red-400",
    },
  }[status];

  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white p-6 space-y-6">
      <div className="flex items-center gap-3">
        <MessageCircle className="h-7 w-7 text-[#C9A24D]" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">WhatsApp Bot</h1>
          <p className="text-sm text-white/50">Conecte seu número e ative o assistente automático</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <StatusIcon className="h-5 w-5 text-[#C9A24D]" />
                Status da Conexão
              </CardTitle>
              <Badge
                data-testid="badge-whatsapp-status"
                className={`border ${statusConfig.badgeClass} gap-1.5`}
              >
                <span className={`w-2 h-2 rounded-full ${statusConfig.dot}`} />
                {statusConfig.label}
              </Badge>
            </div>
            <CardDescription className="text-white/40">
              {status === "connected" && "Bot ativo — mensagens automáticas habilitadas"}
              {status === "waiting_qr" && "Abra o WhatsApp no celular e escaneie o QR Code"}
              {status === "connecting" && "Estabelecendo conexão com o WhatsApp…"}
              {status === "disconnected" && "Clique em Conectar para iniciar a sessão"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading && (
              <div className="flex items-center justify-center h-40">
                <RefreshCw className="h-8 w-8 text-[#C9A24D] animate-spin" />
              </div>
            )}

            {!isLoading && data?.qr && (
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 bg-white rounded-xl">
                  <img
                    src={data.qr}
                    alt="WhatsApp QR Code"
                    data-testid="img-whatsapp-qr"
                    className="w-52 h-52"
                  />
                </div>
                <p className="text-xs text-white/40 text-center">
                  QR Code atualiza automaticamente a cada 3 segundos
                </p>
              </div>
            )}

            {!isLoading && status === "connected" && (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="w-16 h-16 rounded-full bg-[#C9A24D]/15 flex items-center justify-center">
                  <Wifi className="h-8 w-8 text-[#C9A24D]" />
                </div>
                <p className="text-[#C9A24D] font-medium">Número conectado com sucesso!</p>
                {data?.phone && (
                  <p
                    data-testid="text-whatsapp-phone"
                    className="text-white font-semibold text-base tracking-wide"
                  >
                    {formatBrazilianPhone(data.phone)}
                  </p>
                )}
                <p className="text-white/40 text-sm text-center">
                  O bot está ativo. Clientes que enviarem mensagens receberão respostas automáticas.
                </p>
              </div>
            )}

            {!isLoading && status === "connecting" && (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center">
                  <RefreshCw className="h-8 w-8 text-yellow-400 animate-spin" />
                </div>
                <p className="text-yellow-400 font-medium">Iniciando conexão…</p>
                <p className="text-white/40 text-sm text-center">
                  Estabelecendo conexão com o WhatsApp. O QR Code aparecerá em instantes.
                </p>
              </div>
            )}

            {!isLoading && status === "disconnected" && !data?.qr && (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                  <WifiOff className="h-8 w-8 text-red-400" />
                </div>
                <p className="text-white/60 text-sm text-center">
                  Sem conexão. Clique no botão abaixo para gerar o QR Code e conectar.
                </p>
              </div>
            )}

            <div className={`flex gap-2 ${status === "connected" ? "flex-row" : "flex-col"}`}>
              <Button
                data-testid="button-whatsapp-reconnect"
                onClick={() => reconnectMutation.mutate()}
                disabled={reconnectMutation.isPending || disconnectMutation.isPending || status === "connecting"}
                className="flex-1 bg-[#C9A24D] hover:bg-[#b8903e] text-black font-semibold"
              >
                {reconnectMutation.isPending || status === "connecting" ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {status === "disconnected" ? "Conectar WhatsApp" : status === "connecting" ? "Conectando…" : "Reconectar"}
              </Button>
              {status === "connected" && (
                <Button
                  data-testid="button-whatsapp-disconnect"
                  onClick={() => disconnectMutation.mutate()}
                  disabled={disconnectMutation.isPending || reconnectMutation.isPending}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold"
                >
                  {disconnectMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4 mr-2" />
                  )}
                  Desconectar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Bell className="h-4 w-4 text-[#C9A24D]" />
                Notificações Automáticas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                <div className="w-2 h-2 mt-1.5 rounded-full bg-[#C9A24D] flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-white">Agendamento criado</p>
                  <p className="text-xs text-white/40">
                    Cliente recebe confirmação com serviço, barbeiro, data e horário
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                <div className="w-2 h-2 mt-1.5 rounded-full bg-red-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-white">Agendamento cancelado</p>
                  <p className="text-xs text-white/40">
                    Cliente é notificado com pedido de desculpas e link para reagendar
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Bot className="h-4 w-4 text-[#C9A24D]" />
                Respostas com IA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-white/60">
                Quando um cliente envia mensagem, o bot responde automaticamente usando inteligência artificial
                com conhecimento sobre serviços, preços e horários da barbearia.
              </p>
              <div className="p-3 rounded-lg bg-[#C9A24D]/10 border border-[#C9A24D]/20">
                <p className="text-xs text-[#C9A24D] font-medium flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5" />
                  Requer chave OPENAI_API_KEY configurada nas variáveis de ambiente
                </p>
                <p className="text-xs text-white/40 mt-1">
                  Sem a chave, o bot usa uma resposta padrão com o link de agendamento
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base">Como conectar</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2 text-sm text-white/60">
                <li className="flex gap-2">
                  <span className="text-[#C9A24D] font-bold flex-shrink-0">1.</span>
                  Clique em "Conectar WhatsApp" acima
                </li>
                <li className="flex gap-2">
                  <span className="text-[#C9A24D] font-bold flex-shrink-0">2.</span>
                  Aguarde o QR Code aparecer (alguns segundos)
                </li>
                <li className="flex gap-2">
                  <span className="text-[#C9A24D] font-bold flex-shrink-0">3.</span>
                  Abra o WhatsApp no celular → Menu → Aparelhos conectados
                </li>
                <li className="flex gap-2">
                  <span className="text-[#C9A24D] font-bold flex-shrink-0">4.</span>
                  Aponte a câmera para o QR Code e escaneie
                </li>
                <li className="flex gap-2">
                  <span className="text-[#C9A24D] font-bold flex-shrink-0">5.</span>
                  Pronto! O bot ficará ativo enquanto o servidor estiver rodando
                </li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
