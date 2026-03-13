import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Check,
  CheckCheck,
  Scissors,
  Package,
  ChevronUp,
  ChevronDown,
  PenLine,
  Search,
} from "lucide-react";
import type { Appointment, Service, Barber, Product } from "@shared/schema";

export interface CheckoutAppointment extends Appointment {
  barber?: Barber | null;
  service?: Service | null;
}

interface CheckoutDialogProps {
  apt: CheckoutAppointment;
  onClose: () => void;
  onSuccess: () => void;
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

export function CheckoutDialog({ apt, onClose, onSuccess }: CheckoutDialogProps) {
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
    return sum + parseFloat(String(prod?.price || "0")) * qty;
  }, 0);

  const calculatedTotal = basePrice + extrasTotal + productsTotal;
  const displayTotal =
    customPriceEnabled && customPrice
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
        finalPrice:
          customPriceEnabled && customPrice
            ? parseFloat(customPrice.replace(",", "."))
            : undefined,
        extraServiceIds: selectedExtraIds,
        products: selectedProductsList,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
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
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
            Forma de Pagamento
          </p>
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
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
              Adicionais
            </p>
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
                      <div
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                          checked ? "border-emerald-500 bg-emerald-500" : "border-white/20"
                        }`}
                      >
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
            {showProducts ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
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
                <p className="text-xs text-white/30 text-center py-4">
                  Nenhum produto disponível em estoque
                </p>
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
                          <span
                            className={`w-6 text-center text-sm font-bold ${qty > 0 ? "text-[#C9A24D]" : "text-white/30"}`}
                          >
                            {qty}
                          </span>
                          <button
                            onClick={() =>
                              setProductQtys((prev) => ({
                                ...prev,
                                [prod.id]: Math.min(
                                  prod.stockQuantity ?? 99,
                                  (prev[prod.id] || 0) + 1
                                ),
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
              {extraServices
                .filter((s) => selectedExtras[s.id])
                .map((s) => (
                  <div key={s.id} className="flex justify-between text-white/50">
                    <span>{s.name}</span>
                    <span>+{formatCurrency(s.price)}</span>
                  </div>
                ))}
              {Object.entries(productQtys)
                .filter(([, q]) => q > 0)
                .map(([id, qty]) => {
                  const prod = allProducts.find((p) => p.id === id);
                  if (!prod) return null;
                  return (
                    <div key={id} className="flex justify-between text-white/50">
                      <span>
                        {prod.name} ×{qty}
                      </span>
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
