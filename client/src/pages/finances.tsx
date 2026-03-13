import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpCircle,
  ArrowDownCircle,
  Calendar,
  User,
  Plus,
  Trash2,
  CheckCircle,
  Clock,
  Receipt,
  Scissors,
  Package,
} from "lucide-react";

const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function buildPeriodDates(period: string) {
  const now = new Date();
  if (period === "this_month") {
    return {
      start: format(startOfMonth(now), "yyyy-MM-dd"),
      end: format(endOfMonth(now), "yyyy-MM-dd"),
    };
  }
  if (period === "last_month") {
    const last = subMonths(now, 1);
    return {
      start: format(startOfMonth(last), "yyyy-MM-dd"),
      end: format(endOfMonth(last), "yyyy-MM-dd"),
    };
  }
  return {
    start: format(startOfMonth(now), "yyyy-MM-dd"),
    end: format(endOfMonth(now), "yyyy-MM-dd"),
  };
}

// ─── Fluxo de Caixa ────────────────────────────────────────────────────────
function CashflowTab() {
  const [period, setPeriod] = useState("this_month");
  const { start, end } = buildPeriodDates(period);

  const { data, isLoading } = useQuery<{
    transactions: any[];
    totalIn: number;
    totalOut: number;
    balance: number;
  }>({
    queryKey: ["/api/finances/cashflow", start, end],
    queryFn: () => fetch(`/api/finances/cashflow?start=${start}&end=${end}`).then(r => r.json()),
  });

  const txns = data?.transactions ?? [];

  const typeLabel: Record<string, string> = {
    service: "Serviço",
    product: "Produto",
    expense: "Despesa",
    refund: "Reembolso",
    other: "Outro",
  };

  const typeBadge: Record<string, string> = {
    service: "bg-[#C9A24D]/20 text-[#C9A24D]",
    product: "bg-blue-500/20 text-blue-400",
    expense: "bg-red-500/20 text-red-400",
    refund: "bg-orange-500/20 text-orange-400",
    other: "bg-white/10 text-white/60",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-48 bg-white/5 border-white/10 text-white" data-testid="select-cashflow-period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
            <SelectItem value="this_month">Mês Atual</SelectItem>
            <SelectItem value="last_month">Mês Passado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-[#1a1a1a] border-white/10">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <ArrowUpCircle className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-white/50 text-xs uppercase tracking-wider">Entradas</p>
                <p className="text-xl font-bold text-green-400">{fmtBRL(data?.totalIn ?? 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#1a1a1a] border-white/10">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <ArrowDownCircle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-white/50 text-xs uppercase tracking-wider">Saídas</p>
                <p className="text-xl font-bold text-red-400">{fmtBRL(data?.totalOut ?? 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#1a1a1a] border-white/10">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#C9A24D]/10">
                <DollarSign className="h-5 w-5 text-[#C9A24D]" />
              </div>
              <div>
                <p className="text-white/50 text-xs uppercase tracking-wider">Saldo</p>
                <p className={`text-xl font-bold ${(data?.balance ?? 0) >= 0 ? "text-[#C9A24D]" : "text-red-400"}`}>
                  {fmtBRL(data?.balance ?? 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#1a1a1a] border-white/10">
        <CardHeader className="border-b border-white/5 px-5 py-4">
          <CardTitle className="text-white text-base">Movimentações</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-white/40">Carregando...</div>
          ) : txns.length === 0 ? (
            <div className="p-8 text-center text-white/40">Nenhuma movimentação no período</div>
          ) : (
            <div className="divide-y divide-white/5">
              {txns.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.03] transition-colors" data-testid={`row-transaction-${t.id}`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-full ${t.type === "expense" || t.type === "refund" ? "bg-red-500/10" : "bg-green-500/10"}`}>
                      {t.type === "expense" || t.type === "refund"
                        ? <ArrowDownCircle className="h-3.5 w-3.5 text-red-400" />
                        : <ArrowUpCircle className="h-3.5 w-3.5 text-green-400" />}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{t.description || "Sem descrição"}</p>
                      <p className="text-white/40 text-xs">{t.date}{t.paymentMethod ? ` • ${t.paymentMethod}` : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${typeBadge[t.type] ?? typeBadge.other}`}>
                      {typeLabel[t.type] ?? t.type}
                    </span>
                    <span className={`font-semibold text-sm ${t.type === "expense" || t.type === "refund" ? "text-red-400" : "text-green-400"}`}>
                      {t.type === "expense" || t.type === "refund" ? "-" : "+"}{fmtBRL(parseFloat(t.amount || "0"))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Contas a Pagar ─────────────────────────────────────────────────────────
function FixedExpensesTab() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [form, setForm] = useState({ name: "", amount: "", dueDay: "", category: "" });

  const { data: expenses = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/finances/fixed-expenses"],
  });

  const createMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/finances/fixed-expenses", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finances/fixed-expenses"] });
      setDialogOpen(false);
      toast({ title: "Despesa criada com sucesso" });
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: any) => apiRequest("PATCH", `/api/finances/fixed-expenses/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finances/fixed-expenses"] });
      setDialogOpen(false);
      toast({ title: "Despesa atualizada" });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/finances/fixed-expenses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finances/fixed-expenses"] });
      toast({ title: "Despesa excluída" });
    },
  });

  const totalMonthly = (expenses as any[]).filter((e: any) => e.isActive).reduce((s: number, e: any) => s + parseFloat(e.amount || "0"), 0);

  function openCreate() {
    setEditTarget(null);
    setForm({ name: "", amount: "", dueDay: "", category: "" });
    setDialogOpen(true);
  }

  function openEdit(e: any) {
    setEditTarget(e);
    setForm({ name: e.name, amount: e.amount, dueDay: String(e.dueDay), category: e.category || "" });
    setDialogOpen(true);
  }

  function handleSave() {
    const payload = { name: form.name, amount: form.amount, dueDay: parseInt(form.dueDay), category: form.category || null };
    if (editTarget) updateMut.mutate({ id: editTarget.id, data: payload });
    else createMut.mutate(payload);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Card className="bg-[#1a1a1a] border-white/10 flex-1">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <TrendingDown className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-white/50 text-xs uppercase tracking-wider">Total Mensal Fixo</p>
                <p className="text-xl font-bold text-red-400">{fmtBRL(totalMonthly)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Button
          onClick={openCreate}
          className="bg-[#C9A24D] hover:bg-[#b8913f] text-black font-semibold shrink-0"
          data-testid="button-add-fixed-expense"
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar
        </Button>
      </div>

      <Card className="bg-[#1a1a1a] border-white/10">
        <CardHeader className="border-b border-white/5 px-5 py-4">
          <CardTitle className="text-white text-base">Despesas Fixas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-white/40">Carregando...</div>
          ) : (expenses as any[]).length === 0 ? (
            <div className="p-8 text-center text-white/40">Nenhuma despesa fixa cadastrada</div>
          ) : (
            <div className="divide-y divide-white/5">
              {(expenses as any[]).map((e: any) => (
                <div key={e.id} className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.03] transition-colors" data-testid={`row-expense-${e.id}`}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-500/10">
                      <Receipt className="h-4 w-4 text-red-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{e.name}</p>
                      <p className="text-white/40 text-xs">
                        Vence dia {e.dueDay}{e.category ? ` • ${e.category}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-red-400 font-semibold">{fmtBRL(parseFloat(e.amount || "0"))}</span>
                    <Badge className={e.isActive ? "bg-green-500/15 text-green-400 border-0 text-xs" : "bg-white/10 text-white/40 border-0 text-xs"}>
                      {e.isActive ? "Ativa" : "Inativa"}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/5 text-white/30 hover:text-white/70" onClick={() => openEdit(e)} data-testid={`button-edit-expense-${e.id}`}>
                      <Calendar className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-500/10 text-white/30 hover:text-red-400" onClick={() => deleteMut.mutate(e.id)} data-testid={`button-delete-expense-${e.id}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#1a1a1a] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">{editTarget ? "Editar Despesa" : "Nova Despesa Fixa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-white/70">Nome</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="bg-white/5 border-white/10 text-white mt-1"
                placeholder="Ex: Aluguel, Internet..."
                data-testid="input-expense-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-white/70">Valor (R$)</Label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white mt-1"
                  placeholder="0,00"
                  data-testid="input-expense-amount"
                />
              </div>
              <div>
                <Label className="text-white/70">Dia do Vencimento</Label>
                <Input
                  type="number"
                  min={1}
                  max={31}
                  value={form.dueDay}
                  onChange={e => setForm(f => ({ ...f, dueDay: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white mt-1"
                  placeholder="1–31"
                  data-testid="input-expense-dueday"
                />
              </div>
            </div>
            <div>
              <Label className="text-white/70">Categoria</Label>
              <Input
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="bg-white/5 border-white/10 text-white mt-1"
                placeholder="Ex: Infraestrutura, Pessoal..."
                data-testid="input-expense-category"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDialogOpen(false)} className="text-white/60 hover:text-white">Cancelar</Button>
            <Button
              onClick={handleSave}
              disabled={createMut.isPending || updateMut.isPending}
              className="bg-[#C9A24D] hover:bg-[#b8913f] text-black font-semibold"
              data-testid="button-save-expense"
            >
              {createMut.isPending || updateMut.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Contas a Receber ────────────────────────────────────────────────────────
function ReceivablesTab() {
  const [days, setDays] = useState("7");

  const { data, isLoading } = useQuery<{ appointments: any[]; total: number }>({
    queryKey: ["/api/finances/receivables", days],
    queryFn: () => fetch(`/api/finances/receivables?days=${days}`).then(r => r.json()),
  });

  const appts = data?.appointments ?? [];

  const statusLabel: Record<string, string> = {
    confirmed: "Confirmado",
    pending: "Pendente",
  };

  const statusClass: Record<string, string> = {
    confirmed: "bg-green-500/15 text-green-400 border-0",
    pending: "bg-yellow-500/15 text-yellow-400 border-0",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-48 bg-white/5 border-white/10 text-white" data-testid="select-receivables-days">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
            <SelectItem value="7">Próximos 7 dias</SelectItem>
            <SelectItem value="14">Próximos 14 dias</SelectItem>
            <SelectItem value="30">Próximos 30 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-[#1a1a1a] border-white/10">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#C9A24D]/10">
                <TrendingUp className="h-5 w-5 text-[#C9A24D]" />
              </div>
              <div>
                <p className="text-white/50 text-xs uppercase tracking-wider">A Receber</p>
                <p className="text-xl font-bold text-[#C9A24D]">{fmtBRL(data?.total ?? 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#1a1a1a] border-white/10">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Calendar className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-white/50 text-xs uppercase tracking-wider">Agendamentos</p>
                <p className="text-xl font-bold text-blue-400">{appts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-[#1a1a1a] border-white/10">
        <CardHeader className="border-b border-white/5 px-5 py-4">
          <CardTitle className="text-white text-base">Agendamentos Futuros</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-white/40">Carregando...</div>
          ) : appts.length === 0 ? (
            <div className="p-8 text-center text-white/40">Nenhum agendamento futuro no período</div>
          ) : (
            <div className="divide-y divide-white/5">
              {appts.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between px-5 py-4 hover:bg-white/[0.03] transition-colors" data-testid={`row-receivable-${a.id}`}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <Clock className="h-4 w-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{a.clientName || "Cliente"}</p>
                      <p className="text-white/40 text-xs">
                        {a.date} às {a.startTime} • {a.barberName || "Barbeiro"} • {a.serviceName || "Serviço"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={`${statusClass[a.status] ?? "bg-white/10 text-white/40 border-0"} text-xs`}>
                      {statusLabel[a.status] ?? a.status}
                    </Badge>
                    <span className="text-[#C9A24D] font-semibold text-sm">{fmtBRL(parseFloat(a.price || "0"))}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Comissões ───────────────────────────────────────────────────────────────
function CommissionsTab() {
  const { toast } = useToast();
  const [payDialog, setPayDialog] = useState<any>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payNotes, setPayNotes] = useState("");

  const { data: commissions = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/finances/commissions"],
  });

  const payMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/finances/commissions/pay", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/finances/commissions"] });
      setPayDialog(null);
      toast({ title: "Comissão registrada com sucesso" });
    },
  });

  function openPay(c: any) {
    setPayDialog(c);
    setPayAmount(c.accumulated.toFixed(2));
    setPayNotes("");
  }

  function handlePay() {
    payMut.mutate({ barberId: payDialog.barberId, amount: payAmount, notes: payNotes });
  }

  const totalPending = (commissions as any[]).reduce((s: number, c: any) => s + c.accumulated, 0);

  return (
    <div className="space-y-6">
      <Card className="bg-[#1a1a1a] border-white/10">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#C9A24D]/10">
              <User className="h-5 w-5 text-[#C9A24D]" />
            </div>
            <div>
              <p className="text-white/50 text-xs uppercase tracking-wider">Total Pendente (Comissões)</p>
              <p className="text-xl font-bold text-[#C9A24D]">{fmtBRL(totalPending)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-[#1a1a1a] border-white/10">
        <CardHeader className="border-b border-white/5 px-5 py-4">
          <CardTitle className="text-white text-base">Comissões por Funcionário</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-white/40">Carregando...</div>
          ) : (commissions as any[]).length === 0 ? (
            <div className="p-8 text-center text-white/40">Nenhum funcionário ativo encontrado</div>
          ) : (
            <div className="divide-y divide-white/5">
              {(commissions as any[]).map((c: any) => (
                <div key={c.barberId} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 hover:bg-white/[0.03] transition-colors" data-testid={`row-commission-${c.barberId}`}>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-[#C9A24D]/15 flex items-center justify-center shrink-0">
                      <span className="text-[#C9A24D] font-bold text-sm">{c.barberName?.[0] || "?"}</span>
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{c.barberName}</p>
                      <p className="text-white/40 text-xs">
                        {c.commissionRate ? `${c.commissionRate}% de comissão` : "Sem taxa definida"}
                        {c.lastPaidAt ? ` • Último pgto: ${format(new Date(c.lastPaidAt), "dd/MM/yyyy", { locale: ptBR })}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="text-right">
                      <p className="text-xs text-white/40">Ganhou</p>
                      <p className="text-sm text-white/70">{fmtBRL(c.totalEarned)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-white/40">Pago</p>
                      <p className="text-sm text-green-400">{fmtBRL(c.totalPaid)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-white/40">Pendente</p>
                      <p className={`text-sm font-bold ${c.accumulated > 0 ? "text-[#C9A24D]" : "text-white/40"}`}>{fmtBRL(c.accumulated)}</p>
                    </div>
                    {c.accumulated > 0 && (
                      <Button
                        size="sm"
                        onClick={() => openPay(c)}
                        className="bg-[#C9A24D] hover:bg-[#b8913f] text-black font-semibold text-xs"
                        data-testid={`button-pay-commission-${c.barberId}`}
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-1" />
                        Pagar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!payDialog} onOpenChange={() => setPayDialog(null)}>
        <DialogContent className="bg-[#1a1a1a] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Registrar Pagamento — {payDialog?.barberName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-white/70">Valor (R$)</Label>
              <Input
                type="number"
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
                className="bg-white/5 border-white/10 text-white mt-1"
                data-testid="input-commission-amount"
              />
            </div>
            <div>
              <Label className="text-white/70">Observações</Label>
              <Input
                value={payNotes}
                onChange={e => setPayNotes(e.target.value)}
                className="bg-white/5 border-white/10 text-white mt-1"
                placeholder="Período, forma de pagamento..."
                data-testid="input-commission-notes"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setPayDialog(null)} className="text-white/60 hover:text-white">Cancelar</Button>
            <Button
              onClick={handlePay}
              disabled={payMut.isPending}
              className="bg-[#C9A24D] hover:bg-[#b8913f] text-black font-semibold"
              data-testid="button-confirm-pay-commission"
            >
              {payMut.isPending ? "Registrando..." : "Confirmar Pagamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Receita Detalhada ───────────────────────────────────────────────────────
function RevenueDetailTab() {
  const [period, setPeriod] = useState("this_month");
  const { start, end } = buildPeriodDates(period);

  const { data, isLoading } = useQuery<{ byService: any[]; byProduct: any[] }>({
    queryKey: ["/api/finances/revenue-detail", start, end],
    queryFn: () => fetch(`/api/finances/revenue-detail?start=${start}&end=${end}`).then(r => r.json()),
  });

  const byService = data?.byService ?? [];
  const byProduct = data?.byProduct ?? [];
  const totalSvc = byService.reduce((s, x) => s + x.revenue, 0);
  const totalProd = byProduct.reduce((s, x) => s + x.revenue, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-48 bg-white/5 border-white/10 text-white" data-testid="select-revenue-period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-[#1a1a1a] border-white/10 text-white">
            <SelectItem value="this_month">Mês Atual</SelectItem>
            <SelectItem value="last_month">Mês Passado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-[#1a1a1a] border-white/10">
          <CardHeader className="border-b border-white/5 px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scissors className="h-4 w-4 text-[#C9A24D]" />
                <CardTitle className="text-white text-base">Por Serviço</CardTitle>
              </div>
              <span className="text-[#C9A24D] font-bold text-sm">{fmtBRL(totalSvc)}</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 text-center text-white/40">Carregando...</div>
            ) : byService.length === 0 ? (
              <div className="p-6 text-center text-white/40">Sem dados no período</div>
            ) : (
              <div className="divide-y divide-white/5">
                {byService.map((s: any, i: number) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3" data-testid={`row-service-revenue-${i}`}>
                    <div>
                      <p className="text-white text-sm font-medium">{s.name}</p>
                      <p className="text-white/40 text-xs">{s.count} atendimento{s.count !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#C9A24D] font-semibold text-sm">{fmtBRL(s.revenue)}</p>
                      {totalSvc > 0 && (
                        <p className="text-white/40 text-xs">{((s.revenue / totalSvc) * 100).toFixed(0)}%</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[#1a1a1a] border-white/10">
          <CardHeader className="border-b border-white/5 px-5 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-400" />
                <CardTitle className="text-white text-base">Por Produto</CardTitle>
              </div>
              <span className="text-blue-400 font-bold text-sm">{fmtBRL(totalProd)}</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 text-center text-white/40">Carregando...</div>
            ) : byProduct.length === 0 ? (
              <div className="p-6 text-center text-white/40">Sem dados no período</div>
            ) : (
              <div className="divide-y divide-white/5">
                {byProduct.map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3" data-testid={`row-product-revenue-${i}`}>
                    <div>
                      <p className="text-white text-sm font-medium">{p.name}</p>
                      <p className="text-white/40 text-xs">{p.qty} unidade{p.qty !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-blue-400 font-semibold text-sm">{fmtBRL(p.revenue)}</p>
                      {totalProd > 0 && (
                        <p className="text-white/40 text-xs">{((p.revenue / totalProd) * 100).toFixed(0)}%</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Finances() {
  return (
    <div className="p-6 space-y-6 bg-[#0e0e0e] min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight" data-testid="text-finances-title">Financeiro</h1>
        <p className="text-white/40 text-sm mt-1">Controle financeiro completo da barbearia</p>
      </div>

      <Tabs defaultValue="cashflow" className="space-y-6">
        <TabsList className="bg-[#1a1a1a] border border-white/10 p-1 h-auto flex flex-wrap gap-1">
          <TabsTrigger
            value="cashflow"
            className="data-[state=active]:bg-[#C9A24D] data-[state=active]:text-black text-white/60 hover:text-white text-sm px-4 py-2"
            data-testid="tab-cashflow"
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Fluxo de Caixa
          </TabsTrigger>
          <TabsTrigger
            value="fixed"
            className="data-[state=active]:bg-[#C9A24D] data-[state=active]:text-black text-white/60 hover:text-white text-sm px-4 py-2"
            data-testid="tab-fixed-expenses"
          >
            <ArrowDownCircle className="h-4 w-4 mr-2" />
            Contas a Pagar
          </TabsTrigger>
          <TabsTrigger
            value="receivables"
            className="data-[state=active]:bg-[#C9A24D] data-[state=active]:text-black text-white/60 hover:text-white text-sm px-4 py-2"
            data-testid="tab-receivables"
          >
            <ArrowUpCircle className="h-4 w-4 mr-2" />
            Contas a Receber
          </TabsTrigger>
          <TabsTrigger
            value="commissions"
            className="data-[state=active]:bg-[#C9A24D] data-[state=active]:text-black text-white/60 hover:text-white text-sm px-4 py-2"
            data-testid="tab-commissions"
          >
            <User className="h-4 w-4 mr-2" />
            Comissões
          </TabsTrigger>
          <TabsTrigger
            value="revenue"
            className="data-[state=active]:bg-[#C9A24D] data-[state=active]:text-black text-white/60 hover:text-white text-sm px-4 py-2"
            data-testid="tab-revenue-detail"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Receita Detalhada
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cashflow">
          <CashflowTab />
        </TabsContent>
        <TabsContent value="fixed">
          <FixedExpensesTab />
        </TabsContent>
        <TabsContent value="receivables">
          <ReceivablesTab />
        </TabsContent>
        <TabsContent value="commissions">
          <CommissionsTab />
        </TabsContent>
        <TabsContent value="revenue">
          <RevenueDetailTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
