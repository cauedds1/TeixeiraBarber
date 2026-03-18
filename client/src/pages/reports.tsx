import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3,
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  Package,
  Scissors,
  Award,
  type LucideIcon,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type Period = "week" | "month" | "quarter" | "year" | "custom";

function buildQuery(p: Period, customStart: string, customEnd: string): string {
  if (p === "custom") {
    if (customStart && customEnd) return `startDate=${customStart}&endDate=${customEnd}`;
    return "";
  }
  return `period=${p}`;
}

const GOLD = "#C9A24D";
const CARD_BG = "bg-[#141414]";
const BORDER = "border border-white/5";

const periodLabels: Record<Period, string> = {
  week: "Semana",
  month: "Mês",
  quarter: "Trimestre",
  year: "Ano",
  custom: "Personalizado",
};

function formatCurrency(value: number | string | null | undefined) {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num || 0);
}

function KpiCard({ label, value, sub, icon: Icon, color }: { label: string; value: string; sub?: string; icon: LucideIcon; color: string }) {
  return (
    <div className={`${CARD_BG} ${BORDER} rounded-xl p-5`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-white/40 uppercase tracking-wider mb-1">{label}</p>
          <p className="text-2xl font-bold text-white truncate">{value}</p>
          {sub && <p className="text-xs text-white/30 mt-0.5">{sub}</p>}
        </div>
        <div className="flex-shrink-0 h-11 w-11 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={`${CARD_BG} ${BORDER} rounded-xl`}>
      <div className="px-5 py-4 border-b border-white/5">
        <h3 className="text-sm font-semibold text-white/80">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function EmptyState({ msg = "Sem dados para exibir" }: { msg?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-2">
      <BarChart3 className="h-8 w-8 text-white/10" />
      <p className="text-white/30 text-sm">{msg}</p>
    </div>
  );
}

// ─── Tab: Visão Geral ──────────────────────────────────────────────
interface OverviewData {
  totalRevenue: number;
  totalAppointments: number;
  uniqueClients: number;
  averageTicket: number;
  dailyRevenue: { date: string; revenue: number }[];
  peakHours: { hour: string; count: number }[];
}

function TabOverview({ q }: { q: string }) {
  const { data, isLoading } = useQuery<OverviewData>({ queryKey: [`/api/reports/overview?${q}`], enabled: q.length > 0 });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`${CARD_BG} ${BORDER} rounded-xl p-5`}>
              <Skeleton className="h-3 w-24 bg-white/5 mb-2" />
              <Skeleton className="h-8 w-32 bg-white/10" />
            </div>
          ))
        ) : (
          <>
            <KpiCard label="Faturamento Total" value={formatCurrency(data?.totalRevenue)} icon={DollarSign} color="#22c55e" />
            <KpiCard label="Atendimentos" value={String(data?.totalAppointments ?? 0)} icon={Calendar} color={GOLD} />
            <KpiCard label="Ticket Médio" value={formatCurrency(data?.averageTicket)} icon={TrendingUp} color="#818cf8" />
            <KpiCard label="Clientes Únicos" value={String(data?.uniqueClients ?? 0)} icon={Users} color="#38bdf8" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <SectionCard title="Faturamento Diário">
            {isLoading ? (
              <Skeleton className="h-48 w-full bg-white/5" />
            ) : data?.dailyRevenue && data.dailyRevenue.length > 0 ? (
              <div className="h-48 flex items-end gap-1">
                {data.dailyRevenue.map((day, idx) => {
                  const max = Math.max(...data.dailyRevenue.map(d => d.revenue));
                  const pct = max > 0 ? (day.revenue / max) * 100 : 0;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
                      <div
                        className="w-full rounded-t transition-all cursor-default"
                        style={{ height: `${Math.max(pct, 3)}%`, background: GOLD, opacity: pct < 10 ? 0.4 : 0.85 }}
                        title={`${day.date}: ${formatCurrency(day.revenue)}`}
                      />
                      <span className="text-[9px] text-white/20 group-hover:text-white/50 transition-colors">
                        {day.date.slice(8)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState />
            )}
          </SectionCard>
        </div>
        <div>
          <SectionCard title="Horários de Pico">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-6 w-full bg-white/5" />)}
              </div>
            ) : data?.peakHours && data.peakHours.length > 0 ? (
              <div className="space-y-2.5">
                {data.peakHours.slice(0, 8).map((h, idx) => {
                  const max = Math.max(...data.peakHours.map(x => x.count));
                  const pct = max > 0 ? (h.count / max) * 100 : 0;
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="text-xs text-white/50 w-10 flex-shrink-0 font-mono">{h.hour}</span>
                      <div className="flex-1 h-4 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, background: GOLD, opacity: 0.7 }}
                        />
                      </div>
                      <span className="text-xs text-white/40 w-6 text-right">{h.count}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState />
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Por Barbeiro ─────────────────────────────────────────────
interface BarberRow {
  id: string;
  name: string;
  photoUrl?: string;
  appointments: number;
  revenue: number;
  commission: number;
  averageTicket: number;
  topService: string;
  commissionRate: number;
  appointmentDetails?: { id: string; date: string; startTime: string; clientName: string; service: string; price: number }[];
}

function TabBarbers({ q }: { q: string }) {
  const [selectedBarber, setSelectedBarber] = useState("all");

  const fullQ = selectedBarber !== "all" ? `${q}&barberId=${selectedBarber}` : q;
  const { data: rows, isLoading } = useQuery<BarberRow[]>({ queryKey: [`/api/reports/barbers?${fullQ}`], enabled: q.length > 0 });

  const tableRows = rows ?? [];
  const maxRevenue = Math.max(...tableRows.map(r => r.revenue), 1);

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <label className="text-xs text-white/40 uppercase tracking-wider">Barbeiro</label>
        <select
          value={selectedBarber}
          onChange={e => setSelectedBarber(e.target.value)}
          data-testid="select-barber-filter"
          className="bg-[#1a1a1a] border border-white/10 text-white/80 text-sm rounded-lg px-3 py-1.5 outline-none focus:border-[#C9A24D]/50"
        >
          <option value="all">Todos os barbeiros</option>
          {(rows ?? []).map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>

      <SectionCard title="Performance por Barbeiro">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full bg-white/5" />
            ))}
          </div>
        ) : tableRows.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-white/30 text-xs border-b border-white/5">
                  <th className="pb-3 pr-4">#</th>
                  <th className="pb-3 pr-4">Barbeiro</th>
                  <th className="pb-3 pr-4 text-right">Atendimentos</th>
                  <th className="pb-3 pr-4 text-right">Faturamento</th>
                  <th className="pb-3 pr-4 text-right">Comissão Est.</th>
                  <th className="pb-3 text-right">Ticket Médio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tableRows.map((barber, idx) => (
                  <tr key={barber.id} className="hover:bg-white/2 transition-colors">
                    <td className="py-3 pr-4">
                      <span className="text-lg">{medals[idx] ?? <span className="text-white/30 text-sm">{idx + 1}</span>}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                          style={{ background: `${GOLD}20`, color: GOLD }}
                        >
                          {barber.name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white/90 font-medium">{barber.name}</p>
                          {barber.topService && (
                            <p className="text-[11px] text-white/30">Top: {barber.topService}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-right text-white/70">{barber.appointments}</td>
                    <td className="py-3 pr-4 text-right">
                      <div>
                        <span className="text-white/90 font-medium">{formatCurrency(barber.revenue)}</span>
                        <div className="mt-1 h-1 rounded-full bg-white/5 overflow-hidden w-20 ml-auto">
                          <div className="h-full rounded-full" style={{ width: `${(barber.revenue / maxRevenue) * 100}%`, background: GOLD }} />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-right text-amber-400/80">{formatCurrency(barber.commission)}</td>
                    <td className="py-3 text-right text-white/50">{formatCurrency(barber.averageTicket)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {selectedBarber !== "all" && tableRows[0]?.appointmentDetails && (
        <SectionCard title="Atendimentos do Período">
          {tableRows[0].appointmentDetails.length === 0 ? (
            <EmptyState msg="Nenhum atendimento no período" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-white/30 text-xs border-b border-white/5">
                    <th className="pb-3 pr-4">Data</th>
                    <th className="pb-3 pr-4">Horário</th>
                    <th className="pb-3 pr-4">Cliente</th>
                    <th className="pb-3 pr-4">Serviço</th>
                    <th className="pb-3 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {tableRows[0].appointmentDetails.map(apt => (
                    <tr key={apt.id} className="hover:bg-white/2 transition-colors">
                      <td className="py-2.5 pr-4 text-white/60">
                        {apt.date ? format(parseISO(apt.date), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                      </td>
                      <td className="py-2.5 pr-4 text-white/40 font-mono text-xs">{apt.startTime?.slice(0, 5) ?? "—"}</td>
                      <td className="py-2.5 pr-4 text-white/80">{apt.clientName}</td>
                      <td className="py-2.5 pr-4 text-white/60">{apt.service}</td>
                      <td className="py-2.5 text-right text-white/80 font-medium">{formatCurrency(apt.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
}

// ─── Tab: Produtos ─────────────────────────────────────────────────
interface ProductsData {
  summary: { totalUnitsSold: number; totalRevenue: number; stagnantCount: number };
  products: {
    id: string;
    name: string;
    unitsSold: number;
    revenue: number;
    grossProfit: number;
    stockQuantity: number;
    lowStockThreshold: number;
    status: string;
  }[];
}

const statusConfig: Record<string, { label: string; color: string }> = {
  em_alta: { label: "Em Alta", color: "#22c55e" },
  ativo: { label: "Ativo", color: GOLD },
  estoque_baixo: { label: "Estoque Baixo", color: "#ef4444" },
  parado: { label: "Parado", color: "#6b7280" },
};

function TabProducts({ q }: { q: string }) {
  const { data, isLoading } = useQuery<ProductsData>({ queryKey: [`/api/reports/products?${q}`], enabled: q.length > 0 });
  const rows = data?.products ?? [];
  const maxUnits = Math.max(...rows.map(r => r.unitsSold), 1);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={`${CARD_BG} ${BORDER} rounded-xl p-5`}>
              <Skeleton className="h-3 w-24 bg-white/5 mb-2" />
              <Skeleton className="h-8 w-16 bg-white/10" />
            </div>
          ))
        ) : (
          <>
            <KpiCard label="Total Vendido" value={`${data?.summary.totalUnitsSold ?? 0} un.`} icon={Package} color={GOLD} />
            <KpiCard label="Receita de Produtos" value={formatCurrency(data?.summary.totalRevenue)} icon={DollarSign} color="#22c55e" />
            <KpiCard label="Produtos Parados" value={String(data?.summary.stagnantCount ?? 0)} icon={Package} color="#ef4444" />
          </>
        )}
      </div>

      <SectionCard title="Produtos">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full bg-white/5" />)}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState msg="Nenhum produto cadastrado" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-white/30 text-xs border-b border-white/5">
                  <th className="pb-3 pr-4">Produto</th>
                  <th className="pb-3 pr-4 text-right">Vendas (un.)</th>
                  <th className="pb-3 pr-4 text-right">Receita</th>
                  <th className="pb-3 pr-4 text-right">Lucro Bruto</th>
                  <th className="pb-3 pr-4 text-right">Estoque</th>
                  <th className="pb-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map(p => {
                  const sc = statusConfig[p.status] ?? statusConfig.parado;
                  return (
                    <tr key={p.id} className="hover:bg-white/2 transition-colors">
                      <td className="py-3 pr-4">
                        <div>
                          <p className="text-white/90 font-medium">{p.name}</p>
                          <div className="mt-1 h-1 rounded-full bg-white/5 overflow-hidden w-28">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${(p.unitsSold / maxUnits) * 100}%`, background: sc.color, opacity: 0.7 }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-right text-white/70">{p.unitsSold}</td>
                      <td className="py-3 pr-4 text-right text-white/80">{formatCurrency(p.revenue)}</td>
                      <td className="py-3 pr-4 text-right" style={{ color: p.grossProfit >= 0 ? "#22c55e" : "#ef4444" }}>
                        {formatCurrency(p.grossProfit)}
                      </td>
                      <td className="py-3 pr-4 text-right text-white/50">{p.stockQuantity}</td>
                      <td className="py-3 text-right">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
                          style={{ background: `${sc.color}18`, color: sc.color }}
                        >
                          {sc.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ─── Tab: Serviços ─────────────────────────────────────────────────
interface ServicesData {
  total: number;
  services: { id: string; name: string; count: number; revenue: number; percentage: number }[];
}

function TabServices({ q }: { q: string }) {
  const { data, isLoading } = useQuery<ServicesData>({ queryKey: [`/api/reports/services?${q}`], enabled: q.length > 0 });
  const rows = data?.services ?? [];
  const maxCount = Math.max(...rows.map(r => r.count), 1);
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <KpiCard
          label="Total de Atendimentos"
          value={isLoading ? "—" : String(data?.total ?? 0)}
          icon={Scissors}
          color={GOLD}
        />
        <KpiCard
          label="Serviços Cadastrados"
          value={isLoading ? "—" : String(rows.length)}
          icon={Award}
          color="#818cf8"
        />
      </div>

      <SectionCard title="Ranking de Serviços">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full bg-white/5" />)}
          </div>
        ) : rows.length === 0 ? (
          <EmptyState msg="Nenhum serviço cadastrado" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-white/30 text-xs border-b border-white/5">
                  <th className="pb-3 pr-4">#</th>
                  <th className="pb-3 pr-4">Serviço</th>
                  <th className="pb-3 pr-4 text-right">Atendimentos</th>
                  <th className="pb-3 pr-4 text-right">Faturamento</th>
                  <th className="pb-3 text-right">% do Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((svc, idx) => (
                  <tr key={svc.id} className="hover:bg-white/2 transition-colors">
                    <td className="py-3 pr-4 w-8">
                      {idx < 3 ? (
                        <span className="text-base">{medals[idx]}</span>
                      ) : (
                        <span className="text-white/25 text-xs font-mono">{idx + 1}</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <div>
                        <p className="text-white/90 font-medium">{svc.name}</p>
                        <div className="mt-1.5 h-1.5 rounded-full bg-white/5 overflow-hidden w-40">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${(svc.count / maxCount) * 100}%`,
                              background: idx < 3 ? GOLD : "rgba(255,255,255,0.2)",
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <span
                        className="text-white/90 font-medium tabular-nums"
                        data-testid={`text-service-count-${svc.id}`}
                      >
                        {svc.count}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right text-white/60">{formatCurrency(svc.revenue)}</td>
                    <td className="py-3 text-right">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
                        style={{
                          background: idx < 3 ? `${GOLD}20` : "rgba(255,255,255,0.05)",
                          color: idx < 3 ? GOLD : "rgba(255,255,255,0.4)",
                        }}
                      >
                        {svc.percentage.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────
type TabId = "overview" | "barbers" | "products" | "services";

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "overview", label: "Visão Geral", icon: BarChart3 },
  { id: "barbers", label: "Por Barbeiro", icon: Users },
  { id: "products", label: "Produtos", icon: Package },
  { id: "services", label: "Serviços", icon: Scissors },
];

export default function Reports() {
  const [period, setPeriod] = useState<Period>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const query = buildQuery(period, customStart, customEnd);

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white">
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white" data-testid="text-reports-title">Relatórios</h1>
            <p className="text-white/40 text-sm mt-0.5">Análise de performance e métricas</p>
          </div>

          {/* Period filter */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <div className="flex items-center gap-1 bg-[#141414] border border-white/5 rounded-lg p-1">
              {(["week", "month", "quarter", "year", "custom"] as Period[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  data-testid={`button-period-${p}`}
                  className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                  style={{
                    background: period === p ? GOLD : "transparent",
                    color: period === p ? "#0e0e0e" : "rgba(255,255,255,0.45)",
                  }}
                >
                  {periodLabels[p]}
                </button>
              ))}
            </div>
            {period === "custom" && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                  data-testid="input-custom-start"
                  className="bg-[#141414] border border-white/10 text-white/70 text-xs rounded-lg px-3 py-2 outline-none focus:border-[#C9A24D]/50"
                />
                <span className="text-white/30 text-xs">até</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={e => setCustomEnd(e.target.value)}
                  data-testid="input-custom-end"
                  className="bg-[#141414] border border-white/10 text-white/70 text-xs rounded-lg px-3 py-2 outline-none focus:border-[#C9A24D]/50"
                />
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div>
          <div className="flex gap-1 bg-[#141414] border border-white/5 rounded-xl p-1 w-fit">
            {TABS.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  data-testid={`tab-${tab.id}`}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: active ? "#1f1f1f" : "transparent",
                    color: active ? "#fff" : "rgba(255,255,255,0.35)",
                    borderBottom: active ? `2px solid ${GOLD}` : "2px solid transparent",
                  }}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="mt-5">
            {query.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Calendar className="h-10 w-10 text-white/10" />
                <p className="text-white/40 text-sm">Selecione o período inicial e final para exibir os dados</p>
              </div>
            ) : (
              <>
                {activeTab === "overview" && <TabOverview q={query} />}
                {activeTab === "barbers" && <TabBarbers q={query} />}
                {activeTab === "products" && <TabProducts q={query} />}
                {activeTab === "services" && <TabServices q={query} />}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
