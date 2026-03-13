import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Clock,
  Phone,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  X,
  Check,
  CheckCheck,
  User,
  Scissors,
  Package,
  ChevronUp,
  ChevronDown,
  PenLine,
} from "lucide-react";
import { format, addDays, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Appointment, Service, Barber, Product } from "@shared/schema";

interface AppointmentWithDetails extends Appointment {
  barber?: Barber | null;
  service?: Service | null;
}

const PAYMENT_METHODS = [
  { value: "pix", label: "PIX", emoji: "📱" },
  { value: "cash", label: "Dinheiro", emoji: "💵" },
  { value: "credit", label: "Crédito", emoji: "💳" },
  { value: "debit", label: "Débito", emoji: "💳" },
];

function formatCurrency(value: number | string | null | undefined) {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num || 0);
}

interface CheckoutDialogProps {
  apt: AppointmentWithDetails;
  onClose: () => void;
  onSuccess: () => void;
}

function CheckoutDialog({ apt, onClose, onSuccess }: CheckoutDialogProps) {
  const { toast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [selectedExtras, setSelectedExtras] = useState<Record<string, boolean>>({});
  const [productQtys, setProductQtys] = useState<Record<string, number>>({});
  const [productSearch, setProductSearch] = useState("");
  const [customPriceEnabled, setCustomPriceEnabled] = useState(false);
  const [customPrice, setCustomPrice] = useState("");
  const [showProducts, setShowProducts] = useState(false);

  const { data: allServices = [] } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const { data: allProducts = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const extraServices = allServices.filter(
    (s) => s.isActive && s.id !== apt.serviceId
  );

  const availableProducts = allProducts.filter(
    (p) => p.isActive && (p.stockQuantity ?? 0) > 0
  );

  const filteredProducts = productSearch
    ? availableProducts.filter((p) =>
        p.name.toLowerCase().includes(productSearch.toLowerCase())
      )
    : availableProducts;

  const basePrice = parseFloat(String(apt.price || "0"));

  const extrasTotal = extraServices
    .filter((s) => selectedExtras[s.id])
    .reduce((sum, s) => sum + parseFloat(String(s.price || "0")), 0);

  const productsTotal = Object.entries(productQtys).reduce((sum, [id, qty]) => {
    if (qty <= 0) return sum;
    const prod = allProducts.find((p) => p.id === id);
    return sum + (parseFloat(String(prod?.price || "0")) * qty);
  }, 0);

  const calculatedTotal = basePrice + extrasTotal + productsTotal;
  const displayTotal = customPriceEnabled && customPrice
    ? parseFloat(customPrice.replace(",", ".")) || 0
    : calculatedTotal;

  const selectedExtraIds = extraServices
    .filter((s) => selectedExtras[s.id])
    .map((s) => s.id);

  const selectedProductsList = Object.entries(productQtys)
    .filter(([, qty]) => qty > 0)
    .map(([productId, quantity]) => ({ productId, quantity }));

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/appointments/${apt.id}/checkout`, {
        paymentMethod,
        finalPrice: customPriceEnabled && customPrice
          ? parseFloat(customPrice.replace(",", "."))
          : undefined,
        extraServiceIds: selectedExtraIds,
        products: selectedProductsList,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finances/cashflow"] });
      queryClient.invalidateQueries({ queryKey: ["/api/finances/commissions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Atendimento finalizado com sucesso!" });
      onSuccess();
    },
    onError: () => {
      toast({ title: "Erro ao finalizar atendimento", variant: "destructive" });
    },
  });

  return (
    <DialogContent className="bg-[#141414] border border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto p-0">
      <DialogHeader className="px-6 pt-6 pb-4 border-b border-white/5">
        <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
          <CheckCheck className="h-5 w-5 text-[#C9A24D]" />
          Finalizar Atendimento
        </DialogTitle>
        <p className="text-sm text-white/40 mt-1">
          {apt.clientName} — {apt.startTime?.slice(0, 5)}
        </p>
      </DialogHeader>

      <div className="px-6 py-4 space-y-6">
        {/* Service summary */}
        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#C9A24D]/10 flex items-center justify-center">
              <Scissors className="h-4 w-4 text-[#C9A24D]" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{apt.service?.name || "Serviço"}</p>
              <p className="text-xs text-white/40">Serviço principal</p>
            </div>
          </div>
          <span className="text-[#C9A24D] font-semibold">{formatCurrency(apt.price)}</span>
        </div>

        {/* Payment method */}
        <div>
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Forma de Pagamento</p>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.value}
                onClick={() => setPaymentMethod(m.value)}
                className={`flex items-center gap-2.5 px-3 py-3 rounded-xl border text-sm font-medium transition-all ${
                  paymentMethod === m.value
                    ? "border-[#C9A24D] bg-[#C9A24D]/10 text-[#C9A24D]"
                    : "border-white/10 bg-white/[0.03] text-white/60 hover:border-white/20 hover:text-white"
                }`}
                data-testid={`payment-${m.value}`}
              >
                <span className="text-base">{m.emoji}</span>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Extra services */}
        {extraServices.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Adicionais</p>
            <div className="space-y-2">
              {extraServices.map((svc) => {
                const checked = !!selectedExtras[svc.id];
                return (
                  <button
                    key={svc.id}
                    onClick={() =>
                      setSelectedExtras((prev) => ({ ...prev, [svc.id]: !prev[svc.id] }))
                    }
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-all ${
                      checked
                        ? "border-emerald-500/40 bg-emerald-500/10"
                        : "border-white/5 bg-white/[0.02] hover:border-white/10"
                    }`}
                    data-testid={`extra-${svc.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                        checked ? "border-emerald-500 bg-emerald-500" : "border-white/20"
                      }`}>
                        {checked && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <span className={checked ? "text-white" : "text-white/60"}>{svc.name}</span>
                    </div>
                    <span className={`font-medium ${checked ? "text-emerald-400" : "text-white/40"}`}>
                      +{formatCurrency(svc.price)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Products */}
        <div>
          <button
            onClick={() => setShowProducts((p) => !p)}
            className="w-full flex items-center justify-between text-xs font-semibold text-white/50 uppercase tracking-wider mb-3"
            data-testid="toggle-products"
          >
            <span className="flex items-center gap-2">
              <Package className="h-3.5 w-3.5" />
              Produtos Vendidos
              {selectedProductsList.length > 0 && (
                <span className="bg-[#C9A24D] text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {selectedProductsList.length}
                </span>
              )}
            </span>
            {showProducts ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showProducts && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
                <Input
                  placeholder="Buscar produto..."
                  className="pl-8 h-9 text-sm bg-white/[0.03] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#C9A24D]/50"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  data-testid="input-product-search"
                />
              </div>

              {filteredProducts.length === 0 ? (
                <p className="text-xs text-white/30 text-center py-4">Nenhum produto disponível em estoque</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {filteredProducts.map((prod) => {
                    const qty = productQtys[prod.id] || 0;
                    return (
                      <div
                        key={prod.id}
                        className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-all ${
                          qty > 0
                            ? "border-[#C9A24D]/30 bg-[#C9A24D]/5"
                            : "border-white/5 bg-white/[0.02]"
                        }`}
                        data-testid={`product-row-${prod.id}`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium truncate ${qty > 0 ? "text-white" : "text-white/60"}`}>
                            {prod.name}
                          </p>
                          <p className="text-xs text-white/30">
                            {formatCurrency(prod.price)} · Estoque: {prod.stockQuantity}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 ml-3 flex-shrink-0">
                          <button
                            onClick={() =>
                              setProductQtys((prev) => ({
                                ...prev,
                                [prod.id]: Math.max(0, (prev[prod.id] || 0) - 1),
                              }))
                            }
                            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
                            data-testid={`product-decrease-${prod.id}`}
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                          <span className={`w-6 text-center text-sm font-bold ${qty > 0 ? "text-[#C9A24D]" : "text-white/30"}`}>
                            {qty}
                          </span>
                          <button
                            onClick={() =>
                              setProductQtys((prev) => ({
                                ...prev,
                                [prod.id]: Math.min(prod.stockQuantity ?? 99, (prev[prod.id] || 0) + 1),
                              }))
                            }
                            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
                            data-testid={`product-increase-${prod.id}`}
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Custom price toggle */}
        <div className="border-t border-white/5 pt-4">
          <button
            onClick={() => setCustomPriceEnabled((p) => !p)}
            className={`flex items-center gap-2 text-sm font-medium mb-3 transition-colors ${
              customPriceEnabled ? "text-[#C9A24D]" : "text-white/40 hover:text-white/60"
            }`}
            data-testid="toggle-custom-price"
          >
            <PenLine className="h-4 w-4" />
            Preço personalizado
          </button>

          {customPriceEnabled && (
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">R$</span>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                className="pl-9 bg-[#1a1a1a] border-[#C9A24D]/30 text-white placeholder:text-white/20 focus-visible:ring-[#C9A24D]/50"
                data-testid="input-custom-price"
              />
            </div>
          )}
        </div>

        {/* Total */}
        <div className="bg-[#C9A24D]/5 border border-[#C9A24D]/20 rounded-xl px-5 py-4">
          {!customPriceEnabled && (
            <div className="space-y-1.5 mb-3 text-sm">
              <div className="flex justify-between text-white/50">
                <span>{apt.service?.name || "Serviço"}</span>
                <span>{formatCurrency(apt.price)}</span>
              </div>
              {extraServices.filter((s) => selectedExtras[s.id]).map((s) => (
                <div key={s.id} className="flex justify-between text-white/50">
                  <span>{s.name}</span>
                  <span>+{formatCurrency(s.price)}</span>
                </div>
              ))}
              {Object.entries(productQtys).filter(([, q]) => q > 0).map(([id, qty]) => {
                const prod = allProducts.find((p) => p.id === id);
                if (!prod) return null;
                return (
                  <div key={id} className="flex justify-between text-white/50">
                    <span>{prod.name} ×{qty}</span>
                    <span>+{formatCurrency(parseFloat(String(prod.price)) * qty)}</span>
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/60 font-medium">
              {customPriceEnabled ? "Valor personalizado" : "Total"}
            </span>
            <span className="text-xl font-bold text-[#C9A24D]">
              {formatCurrency(displayTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-6 pb-6 flex gap-3">
        <Button
          variant="ghost"
          onClick={onClose}
          className="flex-1 border border-white/10 text-white/60 hover:text-white hover:bg-white/5"
          data-testid="button-checkout-cancel"
        >
          Cancelar
        </Button>
        <Button
          onClick={() => checkoutMutation.mutate()}
          disabled={checkoutMutation.isPending}
          className="flex-1 bg-[#C9A24D] hover:bg-[#b8913e] text-black font-semibold"
          data-testid="button-checkout-confirm"
        >
          {checkoutMutation.isPending ? "Finalizando..." : "Finalizar Atendimento"}
        </Button>
      </div>
    </DialogContent>
  );
}

export default function Appointments() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBarber, setFilterBarber] = useState<string>("all");
  const [checkoutApt, setCheckoutApt] = useState<AppointmentWithDetails | null>(null);
  const { toast } = useToast();

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const { data: appointments = [], isLoading } = useQuery<AppointmentWithDetails[]>({
    queryKey: ["/api/appointments", dateStr, "detailed"],
    queryFn: async () => {
      const res = await fetch(`/api/appointments?date=${dateStr}&detailed=true`, { credentials: "include" });
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
  });

  const { data: barbers = [] } = useQuery<Barber[]>({
    queryKey: ["/api/barbers"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest("PATCH", `/api/appointments/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({ title: "Status atualizado com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    },
  });

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      case "pending":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case "completed":
        return "bg-[#C9A24D]/15 text-[#C9A24D] border-[#C9A24D]/30";
      case "cancelled":
        return "bg-red-500/15 text-red-400 border-red-500/30";
      case "no_show":
        return "bg-zinc-500/15 text-zinc-400 border-zinc-500/30";
      default:
        return "bg-zinc-500/15 text-zinc-400 border-zinc-500/30";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "confirmed": return "Confirmado";
      case "pending": return "Pendente";
      case "completed": return "Concluído";
      case "cancelled": return "Cancelado";
      case "no_show": return "Faltou";
      default: return status;
    }
  };

  const filtered = appointments.filter((apt) => {
    if (filterBarber !== "all" && apt.barberId !== filterBarber) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      apt.clientName?.toLowerCase().includes(q) ||
      apt.barber?.name?.toLowerCase().includes(q) ||
      apt.service?.name?.toLowerCase().includes(q)
    );
  });

  const stats = {
    total: appointments.length,
    pending: appointments.filter(a => a.status === "pending").length,
    confirmed: appointments.filter(a => a.status === "confirmed").length,
    completed: appointments.filter(a => a.status === "completed").length,
    revenue: appointments
      .filter(a => a.status !== "cancelled")
      .reduce((sum, a) => sum + parseFloat(String(a.finalPrice ?? a.price) || "0"), 0),
  };

  const isToday = format(new Date(), "yyyy-MM-dd") === dateStr;

  return (
    <div className="min-h-full bg-[#0e0e0e] p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white" data-testid="text-appointments-title">Agenda</h1>
          <p className="text-white/40 text-sm mt-1">Gerencie os agendamentos do dia</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="flex items-center gap-2 bg-[#1a1a1a] border border-white/10 rounded-xl px-2 py-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/10"
            onClick={() => setSelectedDate(subDays(selectedDate, 1))}
            data-testid="button-prev-day"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <button
            onClick={() => setSelectedDate(new Date())}
            className="min-w-[200px] text-center px-3 py-1 rounded-lg hover:bg-white/5 transition-colors"
            data-testid="button-today"
          >
            <p className="font-semibold text-white capitalize text-sm">
              {isToday ? "Hoje" : format(selectedDate, "EEEE", { locale: ptBR })}
            </p>
            <p className="text-xs text-white/40">
              {format(selectedDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/50 hover:text-white hover:bg-white/10"
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            data-testid="button-next-day"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-1 items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <Input
              placeholder="Buscar cliente ou serviço..."
              className="pl-9 bg-[#1a1a1a] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#C9A24D]/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto">
            <button
              onClick={() => setFilterBarber("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                filterBarber === "all"
                  ? "bg-[#C9A24D] text-black"
                  : "bg-white/5 text-white/50 hover:text-white hover:bg-white/10"
              }`}
              data-testid="filter-all"
            >
              Todos
            </button>
            {barbers.map((b) => (
              <button
                key={b.id}
                onClick={() => setFilterBarber(b.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  filterBarber === b.id
                    ? "bg-[#C9A24D] text-black"
                    : "bg-white/5 text-white/50 hover:text-white hover:bg-white/10"
                }`}
                data-testid={`filter-barber-${b.id}`}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-4" data-testid="stat-total">
          <p className="text-xs text-white/40 mb-1">Agendamentos</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-4" data-testid="stat-pending">
          <p className="text-xs text-amber-400/70 mb-1">Pendentes</p>
          <p className="text-2xl font-bold text-amber-400">{stats.pending}</p>
        </div>
        <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-4" data-testid="stat-confirmed">
          <p className="text-xs text-emerald-400/70 mb-1">Confirmados</p>
          <p className="text-2xl font-bold text-emerald-400">{stats.confirmed}</p>
        </div>
        <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-4" data-testid="stat-revenue">
          <p className="text-xs text-[#C9A24D]/70 mb-1">Receita Estimada</p>
          <p className="text-2xl font-bold text-[#C9A24D]">{formatCurrency(stats.revenue)}</p>
        </div>
      </div>

      <div className="bg-[#1a1a1a] border border-white/5 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-16 rounded-lg bg-white/5" />
                <Skeleton className="h-10 w-10 rounded-full bg-white/5" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32 bg-white/5" />
                  <Skeleton className="h-3 w-48 bg-white/5" />
                </div>
                <Skeleton className="h-6 w-20 bg-white/5" />
              </div>
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <div className="divide-y divide-white/5">
            {filtered.map((apt) => (
              <div
                key={apt.id}
                className="flex items-center gap-3 md:gap-4 p-3 md:p-4 hover:bg-white/[0.02] transition-colors"
                data-testid={`row-appointment-${apt.id}`}
              >
                <div className="w-16 md:w-20 text-center flex-shrink-0">
                  <p className="text-base md:text-lg font-bold text-white font-mono">{apt.startTime?.slice(0, 5)}</p>
                  <p className="text-[10px] text-white/30 font-mono">{apt.endTime?.slice(0, 5)}</p>
                </div>

                {apt.barber?.photoUrl ? (
                  <img
                    src={apt.barber.photoUrl}
                    alt={apt.barber.name}
                    className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover border border-[#C9A24D]/20 flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#C9A24D]/10 border border-[#C9A24D]/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-[#C9A24D] text-xs md:text-sm font-bold">
                      {(apt.barber?.name || apt.clientName || "C")[0].toUpperCase()}
                    </span>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate text-sm md:text-base">
                    {apt.clientName || "Cliente"}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-white/40 mt-0.5">
                    {apt.service && (
                      <span className="flex items-center gap-1 truncate">
                        <Scissors className="h-3 w-3 flex-shrink-0" />
                        {apt.service.name}
                      </span>
                    )}
                    {apt.barber && (
                      <span className="flex items-center gap-1 truncate hidden sm:flex">
                        <User className="h-3 w-3 flex-shrink-0" />
                        {apt.barber.name}
                      </span>
                    )}
                    {apt.clientPhone && (
                      <span className="flex items-center gap-1 hidden md:flex">
                        <Phone className="h-3 w-3 flex-shrink-0" />
                        {apt.clientPhone}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right flex-shrink-0 hidden sm:block">
                  <p className="font-semibold text-[#C9A24D] text-sm">
                    {formatCurrency(apt.finalPrice ?? apt.price)}
                  </p>
                </div>

                <Badge
                  className={`${getStatusStyle(apt.status || "pending")} border text-[10px] md:text-xs px-2 py-0.5 flex-shrink-0`}
                  data-testid={`badge-status-${apt.id}`}
                >
                  {getStatusLabel(apt.status || "pending")}
                </Badge>

                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 ${
                      apt.status === "confirmed" || apt.status === "completed" || apt.status === "cancelled"
                        ? "text-white/10 cursor-not-allowed"
                        : "text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                    }`}
                    onClick={() => updateStatusMutation.mutate({ id: apt.id, status: "confirmed" })}
                    disabled={updateStatusMutation.isPending || apt.status === "confirmed" || apt.status === "completed" || apt.status === "cancelled"}
                    title="Confirmar"
                    data-testid={`button-confirm-${apt.id}`}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 ${
                      apt.status === "completed" || apt.status === "cancelled" || apt.status === "pending"
                        ? "text-white/10 cursor-not-allowed"
                        : "text-[#C9A24D] hover:bg-[#C9A24D]/10 hover:text-[#C9A24D]"
                    }`}
                    onClick={() => setCheckoutApt(apt)}
                    disabled={apt.status === "completed" || apt.status === "cancelled" || apt.status === "pending"}
                    title="Concluir"
                    data-testid={`button-complete-${apt.id}`}
                  >
                    <CheckCheck className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 ${
                      apt.status === "completed" || apt.status === "cancelled"
                        ? "text-white/10 cursor-not-allowed"
                        : "text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    }`}
                    onClick={() => updateStatusMutation.mutate({ id: apt.id, status: "cancelled" })}
                    disabled={updateStatusMutation.isPending || apt.status === "completed" || apt.status === "cancelled"}
                    title="Cancelar"
                    data-testid={`button-cancel-${apt.id}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <CalendarDays className="h-8 w-8 text-white/20" />
            </div>
            <p className="text-white/40 text-sm">Nenhum agendamento para este dia</p>
            <p className="text-white/20 text-xs mt-1">
              {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
        )}
      </div>

      <Dialog open={!!checkoutApt} onOpenChange={(open) => { if (!open) setCheckoutApt(null); }}>
        {checkoutApt && (
          <CheckoutDialog
            apt={checkoutApt}
            onClose={() => setCheckoutApt(null)}
            onSuccess={() => setCheckoutApt(null)}
          />
        )}
      </Dialog>
    </div>
  );
}
