import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  type LucideIcon,
  DollarSign,
  Calendar,
  MessageCircle,
  Cloud,
  CloudRain,
  Sun,
  Eye,
  EyeOff,
  CheckCircle,
  AlertTriangle,
  Star,
  Package,
  User,
  Clock,
  Scissors,
  TrendingUp,
  ExternalLink,
  Crown,
  Sparkles,
  Send,
  CreditCard,
  Banknote,
  Smartphone,
  CircleDollarSign,
} from "lucide-react";
import type { Appointment, Barber, Service, Product, Review } from "@shared/schema";
import { CheckoutDialog } from "@/components/checkout-dialog";
import type { CheckoutAppointment } from "@/components/checkout-dialog";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface DashboardStats {
  todayAppointments: number;
  todayRevenue: number;
  monthlyRevenue: number;
  occupancyRate: number;
  paymentBreakdown: Record<string, number>;
  pendingCommissions: number;
  botConfirmed: number;
  nextClientInfo: {
    clientName: string;
    clientPhone: string;
    barberId: string;
    startTime: string;
    visitCount: number;
    isNew: boolean;
    isVIP: boolean;
  } | null;
  latestReview: Review | null;
  productVelocity: Record<string, number>;
  pendingAppointments: number;
  newClients: number;
}

interface DetailedAppointment extends Appointment {
  barber: Barber | null;
  service: Service | null;
}

interface WeatherData {
  temperature: number;
  weatherCode: number;
  rainHours: { hour: number; precip: number }[];
}

function useWeather() {
  return useQuery<WeatherData>({
    queryKey: ["weather-sao-jose"],
    queryFn: async () => {
      const res = await fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=-27.61&longitude=-48.64&current=temperature_2m,weather_code&hourly=precipitation&timezone=America/Sao_Paulo&forecast_days=1"
      );
      if (!res.ok) throw new Error("Weather API error");
      const data = await res.json();
      const currentHour = new Date().getHours();
      const rainHours: { hour: number; precip: number }[] = [];
      if (data.hourly?.precipitation) {
        for (let i = currentHour; i < Math.min(currentHour + 6, 24); i++) {
          if (data.hourly.precipitation[i] > 0) {
            rainHours.push({ hour: i, precip: data.hourly.precipitation[i] });
          }
        }
      }
      return {
        temperature: data.current?.temperature_2m || 0,
        weatherCode: data.current?.weather_code || 0,
        rainHours,
      };
    },
    staleTime: 30 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
  });
}

function getWeatherIcon(code: number) {
  if (code >= 61) return CloudRain;
  if (code >= 45) return Cloud;
  return Sun;
}

function getWeatherLabel(code: number) {
  if (code >= 80) return "Chuva forte";
  if (code >= 61) return "Chuva";
  if (code >= 51) return "Garoa";
  if (code >= 45) return "Nublado";
  if (code >= 2) return "Parcialmente nublado";
  return "Ensolarado";
}

function OccupancyRing({ rate }: { rate: number }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * Math.min(rate, 100)) / 100;
  return (
    <svg width="96" height="96" viewBox="0 0 100 100" className="shrink-0">
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
      <circle
        cx="50" cy="50" r={r} fill="none"
        stroke="#C9A24D" strokeWidth="8" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        transform="rotate(-90 50 50)"
        className="transition-all duration-1000"
      />
      <text x="50" y="50" textAnchor="middle" dominantBaseline="central" className="fill-white text-lg font-bold" fontSize="18">
        {rate}%
      </text>
    </svg>
  );
}

function SkeletonCard() {
  return (
    <Card className="bg-[#141414]/80 backdrop-blur-sm border-white/5">
      <CardContent className="p-5">
        <Skeleton className="h-4 w-24 bg-white/5 mb-3" />
        <Skeleton className="h-8 w-32 bg-white/5 mb-2" />
        <Skeleton className="h-3 w-20 bg-white/5" />
      </CardContent>
    </Card>
  );
}

function SkeletonTimeline() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-[#141414]/80 border border-white/5">
          <Skeleton className="h-10 w-10 rounded-full bg-white/5" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32 bg-white/5" />
            <Skeleton className="h-3 w-24 bg-white/5" />
          </div>
          <Skeleton className="h-8 w-20 bg-white/5" />
        </div>
      ))}
    </div>
  );
}

export default function OwnerDashboard() {
  const { toast } = useToast();
  const [privacyMode, setPrivacyMode] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [checkoutApt, setCheckoutApt] = useState<CheckoutAppointment | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const today = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR });
  const nowTime = format(currentTime, "HH:mm");

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    refetchInterval: 60000,
  });

  const { data: todayAppts = [], isLoading: apptsLoading } = useQuery<DetailedAppointment[]>({
    queryKey: ["/api/appointments/today"],
    refetchInterval: 60000,
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: weather } = useWeather();


  const sendReadyMut = useMutation({
    mutationFn: (data: { appointmentId: string }) =>
      apiRequest("POST", "/api/whatsapp/send-ready", data),
    onSuccess: () => toast({ title: "Mensagem enviada pelo WhatsApp!" }),
    onError: () => toast({ title: "Erro ao enviar mensagem", variant: "destructive" }),
  });

  const sortedAppts = [...todayAppts].sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));

  const getActiveAppt = () => {
    for (const apt of sortedAppts) {
      if (apt.status === "cancelled" || apt.status === "completed") continue;
      const start = apt.startTime || "";
      const end = apt.endTime || "";
      if (nowTime >= start && nowTime < end) return apt.id;
    }
    return null;
  };

  const detectConflicts = () => {
    const conflicts = new Set<string>();
    const active = sortedAppts.filter(a => a.status !== "cancelled");
    for (let i = 0; i < active.length; i++) {
      for (let j = i + 1; j < active.length; j++) {
        if (active[i].barberId === active[j].barberId &&
            active[i].endTime > active[j].startTime &&
            active[i].startTime < active[j].endTime) {
          conflicts.add(active[i].id);
          conflicts.add(active[j].id);
        }
      }
    }
    return conflicts;
  };

  const activeId = getActiveAppt();
  const conflictIds = detectConflicts();

  const lowStockProducts = products.filter(p =>
    p.isActive && (p.stockQuantity || 0) <= (p.lowStockThreshold || 5)
  );

  const blurClass = privacyMode ? "blur-sm select-none" : "";
  const moneyValue = (val: number) => fmtBRL(val);

  const WeatherIcon = weather ? getWeatherIcon(weather.weatherCode) : Sun;

  return (
    <div className="min-h-full bg-[#0e0e0e] p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white" data-testid="text-dashboard-title">
            Command Center
          </h1>
          <p className="text-white/40 text-sm capitalize mt-0.5">{today}</p>
        </div>
        <div className="flex items-center gap-2 text-white/50 text-sm">
          <Clock className="h-4 w-4" />
          <span data-testid="text-current-time">{format(currentTime, "HH:mm")}</span>
        </div>
      </div>

      {/* === HEADER DE PERFORMANCE === */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <Card className="bg-[#141414]/80 backdrop-blur-sm border-white/5 hover:border-[#C9A24D]/20 transition-colors" data-testid="card-occupancy">
              <CardContent className="p-5 flex items-center gap-4">
                <OccupancyRing rate={stats?.occupancyRate || 0} />
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wider">Ocupação</p>
                  <p className="text-white text-lg font-bold mt-0.5">{stats?.todayAppointments || 0} agendamentos</p>
                  <p className="text-white/30 text-xs mt-0.5">{stats?.pendingAppointments || 0} pendente(s)</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#141414]/80 backdrop-blur-sm border-white/5 hover:border-[#C9A24D]/20 transition-colors" data-testid="card-revenue">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-white/40 text-xs uppercase tracking-wider">Faturamento Hoje</p>
                  <div className="p-2 rounded-lg bg-[#C9A24D]/10">
                    <DollarSign className="h-4 w-4 text-[#C9A24D]" />
                  </div>
                </div>
                <p className={`text-2xl font-bold text-[#C9A24D] mt-2 ${blurClass}`} data-testid="text-today-revenue">
                  {moneyValue(stats?.todayRevenue || 0)}
                </p>
                <p className={`text-white/30 text-xs mt-1 ${blurClass}`}>
                  Mês: {moneyValue(stats?.monthlyRevenue || 0)}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[#141414]/80 backdrop-blur-sm border-white/5 hover:border-[#C9A24D]/20 transition-colors" data-testid="card-bot">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-white/40 text-xs uppercase tracking-wider">Bot Eficiência</p>
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <MessageCircle className="h-4 w-4 text-green-400" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-white mt-2" data-testid="text-bot-confirmed">
                  {stats?.botConfirmed || 0}
                </p>
                <p className="text-white/30 text-xs mt-1">Confirmações automáticas hoje</p>
              </CardContent>
            </Card>

            <Card className="bg-[#141414]/80 backdrop-blur-sm border-white/5 hover:border-[#C9A24D]/20 transition-colors" data-testid="card-weather">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <p className="text-white/40 text-xs uppercase tracking-wider">Clima</p>
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <WeatherIcon className="h-4 w-4 text-blue-400" />
                  </div>
                </div>
                {weather ? (
                  <>
                    <p className="text-2xl font-bold text-white mt-2">{Math.round(weather.temperature)}°C</p>
                    <p className="text-white/30 text-xs mt-1">{getWeatherLabel(weather.weatherCode)}</p>
                    {weather.rainHours.length > 0 && (
                      <p className="text-yellow-400/80 text-xs mt-1 flex items-center gap-1">
                        <CloudRain className="h-3 w-3" />
                        Chuva prevista às {weather.rainHours[0].hour}h
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <Skeleton className="h-8 w-16 bg-white/5 mt-2" />
                    <Skeleton className="h-3 w-20 bg-white/5 mt-1" />
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* === MAIN GRID: TIMELINE + FINANCIAL === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* TIMELINE OPERACIONAL */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#C9A24D]" />
              Timeline do Dia
            </h2>
            <Badge className="bg-[#C9A24D]/10 text-[#C9A24D] border-0 text-xs">
              {sortedAppts.filter(a => a.status !== "cancelled").length} atendimento(s)
            </Badge>
          </div>

          {apptsLoading ? (
            <SkeletonTimeline />
          ) : sortedAppts.length === 0 ? (
            <Card className="bg-[#141414]/80 backdrop-blur-sm border-white/5">
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 text-white/10 mx-auto mb-3" />
                <p className="text-white/40">Nenhum agendamento para hoje</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {sortedAppts.map((apt) => {
                const isActive = apt.id === activeId;
                const isConflict = conflictIds.has(apt.id);
                const isDone = apt.status === "completed";
                const isCancelled = apt.status === "cancelled";

                let borderClass = "border-white/5";
                if (isActive) borderClass = "border-[#C9A24D] shadow-[0_0_15px_rgba(201,162,77,0.15)]";
                if (isConflict) borderClass = "border-red-500/50";
                if (isDone) borderClass = "border-green-500/20";
                if (isCancelled) borderClass = "border-white/5 opacity-40";

                return (
                  <Card
                    key={apt.id}
                    className={`bg-[#141414]/80 backdrop-blur-sm border ${borderClass} transition-all ${isActive ? "animate-pulse-slow ring-1 ring-[#C9A24D]/30" : ""}`}
                    data-testid={`card-timeline-${apt.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="relative shrink-0">
                          {apt.barber?.photoUrl ? (
                            <img
                              src={apt.barber.photoUrl}
                              alt={apt.barber.name}
                              className="h-11 w-11 rounded-full object-cover border-2 border-white/10"
                            />
                          ) : (
                            <div className="h-11 w-11 rounded-full bg-[#C9A24D]/10 border-2 border-white/10 flex items-center justify-center">
                              <User className="h-5 w-5 text-[#C9A24D]" />
                            </div>
                          )}
                          {isActive && (
                            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-[#C9A24D] border-2 border-[#141414]" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium text-sm truncate">
                              {apt.clientName || "Cliente"}
                            </span>
                            {isConflict && (
                              <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-white/40 text-xs mt-0.5">
                            <Clock className="h-3 w-3" />
                            <span>{apt.startTime} - {apt.endTime}</span>
                            <span className="text-white/10">|</span>
                            <Scissors className="h-3 w-3" />
                            <span className="truncate">{apt.service?.name || "Serviço"}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-white/25 text-xs">
                              {apt.barber?.name || "Barbeiro"}
                              {apt.price ? ` • ${fmtBRL(parseFloat(apt.price.toString()))}` : ""}
                            </p>
                            {apt.clientPhone && (
                              <span
                                className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${
                                  apt.reminderSent
                                    ? "text-green-400 bg-green-500/10 border-green-500/20"
                                    : "text-white/20 bg-white/[0.03] border-white/10"
                                }`}
                                data-testid={`badge-whatsapp-${apt.id}`}
                                title={apt.reminderSent ? "Lembrete enviado" : "Lembrete não enviado"}
                              >
                                {apt.reminderSent ? "ZAP ✓" : "ZAP"}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isDone && (
                            <Badge className="bg-green-500/10 text-green-400 border-0 text-xs">Concluído</Badge>
                          )}
                          {isCancelled && (
                            <Badge className="bg-red-500/10 text-red-400 border-0 text-xs">Cancelado</Badge>
                          )}
                          {apt.status === "pending" && (
                            <Badge className="bg-yellow-500/10 text-yellow-400 border-0 text-xs">Pendente</Badge>
                          )}
                          {apt.status === "confirmed" && (
                            <Badge className="bg-blue-500/10 text-blue-400 border-0 text-xs">Confirmado</Badge>
                          )}

                          {!isDone && !isCancelled && (
                            <div className="flex gap-1.5">
                              {apt.clientPhone && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 px-2 text-green-400 hover:bg-green-500/10 hover:text-green-300"
                                  onClick={() => sendReadyMut.mutate({ appointmentId: apt.id })}
                                  disabled={sendReadyMut.isPending}
                                  data-testid={`button-notify-${apt.id}`}
                                  title="Avisar cliente"
                                >
                                  <Send className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                className="h-8 px-3 bg-[#C9A24D] hover:bg-[#b8913f] text-black font-semibold text-xs"
                                onClick={() => setCheckoutApt(apt)}
                                data-testid={`button-complete-${apt.id}`}
                              >
                                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                Concluir
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      {isConflict && (
                        <div className="mt-2 px-3 py-1.5 rounded-lg bg-red-500/5 border border-red-500/10">
                          <p className="text-red-400 text-xs flex items-center gap-1.5">
                            <AlertTriangle className="h-3 w-3" />
                            Conflito de horário detectado — reagende este atendimento
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* FINANCIAL BATE-GRADE */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-[#C9A24D]" />
              Financeiro
            </h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/30 hover:text-white"
              onClick={() => setPrivacyMode(!privacyMode)}
              data-testid="button-privacy-toggle"
            >
              {privacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>

          <Card className="bg-[#141414]/80 backdrop-blur-sm border-white/5">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-white/50 text-xs uppercase tracking-wider">Meios de Pagamento</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {statsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 bg-white/5 rounded-lg" />)}
                </div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(stats?.paymentBreakdown || {}).length === 0 ? (
                    <p className="text-white/20 text-sm text-center py-4">Nenhuma transação hoje</p>
                  ) : (
                    Object.entries(stats?.paymentBreakdown || {}).map(([method, value]) => {
                      const icons: Record<string, LucideIcon> = {
                        PIX: Smartphone,
                        Dinheiro: Banknote,
                        Cartão: CreditCard,
                        Outro: CircleDollarSign,
                      };
                      const Icon = icons[method] ?? CircleDollarSign;
                      return (
                        <div key={method} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.05] transition-colors" data-testid={`row-payment-${method}`}>
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 rounded-md bg-[#C9A24D]/10">
                              <Icon className="h-3.5 w-3.5 text-[#C9A24D]" />
                            </div>
                            <span className="text-white/70 text-sm capitalize">{method}</span>
                          </div>
                          <span className={`text-sm font-semibold text-white ${blurClass}`}>
                            {moneyValue(value)}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-[#141414]/80 backdrop-blur-sm border-white/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-orange-500/10">
                    <TrendingUp className="h-3.5 w-3.5 text-orange-400" />
                  </div>
                  <span className="text-white/50 text-xs uppercase tracking-wider">Comissões Pendentes</span>
                </div>
                <span className={`text-lg font-bold text-orange-400 ${blurClass}`} data-testid="text-pending-commissions">
                  {moneyValue(stats?.pendingCommissions || 0)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* CLIENT INTELLIGENCE */}
          {stats?.nextClientInfo && (
            <Card className={`bg-[#141414]/80 backdrop-blur-sm border ${stats.nextClientInfo.isNew ? "border-emerald-500/20" : stats.nextClientInfo.isVIP ? "border-[#C9A24D]/20" : "border-white/5"}`} data-testid="card-next-client">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  {stats.nextClientInfo.isNew ? (
                    <Sparkles className="h-4 w-4 text-emerald-400" />
                  ) : stats.nextClientInfo.isVIP ? (
                    <Crown className="h-4 w-4 text-[#C9A24D]" />
                  ) : (
                    <User className="h-4 w-4 text-white/40" />
                  )}
                  <span className="text-white/50 text-xs uppercase tracking-wider">Próximo Cliente</span>
                </div>
                <p className="text-white font-medium">{stats.nextClientInfo.clientName}</p>
                <p className="text-white/40 text-xs mt-0.5">
                  {stats.nextClientInfo.startTime}
                  {stats.nextClientInfo.isNew
                    ? " • Cliente novo — capriche no ritual de boas-vindas!"
                    : stats.nextClientInfo.isVIP
                    ? ` • Top cliente (${stats.nextClientInfo.visitCount} visitas) — atendimento VIP!`
                    : ` • ${stats.nextClientInfo.visitCount} visita(s) anteriore(s)`}
                </p>
              </CardContent>
            </Card>
          )}

          {/* LATEST REVIEW */}
          {stats?.latestReview && (
            <Card className="bg-[#141414]/80 backdrop-blur-sm border-white/5" data-testid="card-latest-review">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="h-4 w-4 text-[#C9A24D]" />
                  <span className="text-white/50 text-xs uppercase tracking-wider">Último Feedback</span>
                </div>
                <div className="flex items-center gap-1 mb-1.5">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${i <= (stats.latestReview!.rating || 0) ? "text-[#C9A24D] fill-[#C9A24D]" : "text-white/10"}`}
                    />
                  ))}
                  <span className="text-white/30 text-xs ml-2">{stats.latestReview.clientName || "Anônimo"}</span>
                </div>
                {stats.latestReview.comment && (
                  <p className="text-white/50 text-sm italic">"{stats.latestReview.comment}"</p>
                )}
                {stats.latestReview.clientPhone && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-green-400 hover:text-green-300 hover:bg-green-500/10 text-xs px-2 h-7"
                    onClick={() => {
                      const phone = stats.latestReview!.clientPhone!.replace(/\D/g, "");
                      window.open(`https://wa.me/${phone}`, "_blank");
                    }}
                    data-testid="button-reply-review"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Responder no Zap
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* === INVENTÁRIO PREDITIVO === */}
      {lowStockProducts.length > 0 && (
        <Card className="bg-[#141414]/80 backdrop-blur-sm border-white/5" data-testid="card-inventory">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-400" />
              Alerta de Estoque
              <Badge className="bg-orange-500/10 text-orange-400 border-0 text-xs ml-auto">
                {lowStockProducts.length} item(ns)
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {lowStockProducts.map(p => {
                const stock = p.stockQuantity || 0;
                const threshold = p.lowStockThreshold || 5;
                const isZero = stock <= 0;
                const velocity = stats?.productVelocity?.[p.id] ?? 0;
                const daysLeft = stock > 0 && velocity > 0 ? Math.round(stock / velocity) : null;
                const restockQty = Math.max(threshold * 2 - stock, threshold);
                const whatsappMsg = encodeURIComponent(
                  `Olá! Preciso repor estoque:\n\n📦 Produto: ${p.name}\n🔢 Quantidade: ${restockQty} unidades\n\nTeixeira Barbearia - Kobrasol`
                );

                return (
                  <div
                    key={p.id}
                    className={`p-3 rounded-lg border ${isZero ? "border-red-500/20 bg-red-500/5" : "border-orange-500/10 bg-orange-500/5"}`}
                    data-testid={`row-lowstock-${p.id}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-white text-sm font-medium">{p.name}</p>
                        <p className={`text-xs mt-0.5 ${isZero ? "text-red-400" : "text-orange-400"}`}>
                          {isZero
                            ? "Estoque zerado!"
                            : daysLeft !== null
                              ? `${stock} un. — dura ~${daysLeft} dia(s)`
                              : `${stock} un. — sem histórico de uso`}
                        </p>
                      </div>
                      <Badge className={`text-xs border-0 ${isZero ? "bg-red-500/15 text-red-400" : "bg-orange-500/15 text-orange-400"}`}>
                        {stock}/{threshold}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-7 text-xs text-green-400 hover:text-green-300 hover:bg-green-500/10 border border-green-500/10"
                      onClick={() => window.open(`https://wa.me/?text=${whatsappMsg}`, "_blank")}
                      data-testid={`button-restock-${p.id}`}
                    >
                      <Send className="h-3 w-3 mr-1.5" />
                      Pedir ao Fornecedor
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!checkoutApt} onOpenChange={(open) => { if (!open) setCheckoutApt(null); }}>
        {checkoutApt && (
          <CheckoutDialog
            apt={checkoutApt}
            onClose={() => setCheckoutApt(null)}
            onSuccess={() => setCheckoutApt(null)}
          />
        )}
      </Dialog>

      <style>{`
        @keyframes pulse-slow {
          0%, 100% { box-shadow: 0 0 15px rgba(201,162,77,0.15); }
          50% { box-shadow: 0 0 25px rgba(201,162,77,0.3); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
