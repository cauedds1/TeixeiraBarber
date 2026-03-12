import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Plus, Search, Clock, Scissors, Pencil, Trash2, ArrowRight,
} from "lucide-react";
import { z } from "zod";
import type { Service } from "@shared/schema";

const serviceFormSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  description: z.string().optional(),
  price: z.string().min(1, "Preço é obrigatório"),
  duration: z.string().min(1, "Duração é obrigatória"),
  isCombo: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

type ServiceFormData = z.infer<typeof serviceFormSchema>;

export default function Services() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);
  const { toast } = useToast();

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: "", description: "", price: "", duration: "30", isCombo: false, isActive: true,
    },
  });

  const { data: services, isLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: ServiceFormData) => {
      await apiRequest("POST", "/api/services", {
        ...data,
        price: data.price,
        duration: parseInt(data.duration),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      closeDialog();
      toast({ title: "Serviço cadastrado com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao cadastrar serviço", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ServiceFormData }) => {
      await apiRequest("PATCH", `/api/services/${id}`, {
        ...data,
        price: data.price,
        duration: parseInt(data.duration),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      closeDialog();
      toast({ title: "Serviço atualizado" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar serviço", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/services/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setDeleteTarget(null);
      toast({ title: "Serviço removido" });
    },
    onError: () => {
      toast({ title: "Erro ao remover serviço", variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await apiRequest("PATCH", `/api/services/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingService(null);
    form.reset({ name: "", description: "", price: "", duration: "30", isCombo: false, isActive: true });
  };

  const openEdit = (service: Service) => {
    setEditingService(service);
    form.reset({
      name: service.name,
      description: service.description || "",
      price: service.price?.toString() || "",
      duration: service.duration?.toString() || "30",
      isCombo: service.isCombo ?? false,
      isActive: service.isActive ?? true,
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: ServiceFormData) => {
    if (editingService) {
      updateMutation.mutate({ id: editingService.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const formatCurrency = (value: number | string | null) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num || 0);
  };

  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  };

  const filtered = services?.filter((s) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return s.name?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q);
  });

  const activeCount = services?.filter((s) => s.isActive).length || 0;
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="min-h-screen bg-[#0e0e0e] p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white" data-testid="text-services-title">Serviços</h1>
            <p className="text-white/40 text-sm mt-1">
              {activeCount} {activeCount === 1 ? "serviço ativo" : "serviços ativos"} · Gerencie sua tabela de preços
            </p>
          </div>
          <button
            onClick={() => { setEditingService(null); setDialogOpen(true); }}
            data-testid="button-new-service"
            className="flex items-center gap-2 bg-[#C9A24D] hover:bg-[#b8903e] text-black font-semibold px-5 py-2.5 rounded-xl transition-all hover:scale-105 active:scale-95 text-sm"
          >
            <Plus className="w-4 h-4" />
            Novo Serviço
          </button>
        </div>

        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <input
            placeholder="Buscar serviço..."
            className="w-full bg-[#151515] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#C9A24D]/50 transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search"
          />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-[#151515] border border-white/5 rounded-2xl p-5 animate-pulse">
                <div className="flex justify-between">
                  <div className="space-y-2">
                    <div className="h-5 w-36 bg-white/10 rounded" />
                    <div className="h-3 w-24 bg-white/5 rounded" />
                  </div>
                  <div className="h-6 w-20 bg-white/10 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered && filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map((service) => (
              <div
                key={service.id}
                className={`group bg-[#151515] border hover:border-[#C9A24D]/20 rounded-2xl p-5 transition-all duration-200 hover:shadow-lg hover:shadow-[#C9A24D]/5 ${
                  service.isActive ? "border-white/5" : "border-white/5 opacity-60"
                }`}
                data-testid={`card-service-${service.id}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-[#C9A24D]/10 flex items-center justify-center flex-shrink-0">
                      <Scissors className="w-5 h-5 text-[#C9A24D]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-white">{service.name}</h3>
                        {service.isCombo && (
                          <span className="text-[10px] uppercase tracking-wider font-semibold bg-[#C9A24D]/10 text-[#C9A24D] px-2 py-0.5 rounded-full">Combo</span>
                        )}
                        {!service.isActive && (
                          <span className="text-[10px] uppercase tracking-wider font-semibold bg-white/5 text-white/30 px-2 py-0.5 rounded-full">Inativo</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex items-center gap-1 text-white/40 text-sm">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{formatDuration(service.duration)}</span>
                        </div>
                        {service.description && (
                          <span className="text-white/30 text-sm truncate hidden sm:inline">· {service.description}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-[#C9A24D] font-black text-lg">{formatCurrency(service.price)}</span>

                    <div className="flex items-center gap-1">
                      <Switch
                        checked={service.isActive ?? true}
                        onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: service.id, isActive: checked })}
                        data-testid={`switch-active-${service.id}`}
                        className="data-[state=checked]:bg-[#C9A24D]"
                      />
                    </div>

                    <button
                      onClick={() => openEdit(service)}
                      data-testid={`button-edit-${service.id}`}
                      className="p-2 text-white/30 hover:text-[#C9A24D] hover:bg-[#C9A24D]/10 rounded-lg transition-all"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(service)}
                      data-testid={`button-delete-${service.id}`}
                      className="p-2 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#151515] border border-white/5 rounded-2xl py-16 text-center">
            <Scissors className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-white/40 mb-4">Nenhum serviço encontrado</p>
            <button
              onClick={() => setDialogOpen(true)}
              data-testid="button-empty-new"
              className="inline-flex items-center gap-2 bg-[#C9A24D] hover:bg-[#b8903e] text-black font-semibold px-5 py-2.5 rounded-xl transition-all text-sm"
            >
              <Plus className="w-4 h-4" />
              Adicionar Serviço
            </button>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent className="max-w-lg bg-[#1a1a1a] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingService ? "Editar Serviço" : "Novo Serviço"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/70">Nome *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: Corte Masculino" className="bg-[#0e0e0e] border-white/10 text-white" data-testid="input-service-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/70">Descrição</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Descrição opcional do serviço..." className="bg-[#0e0e0e] border-white/10 text-white resize-none" data-testid="input-service-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="price" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/70">Preço (R$) *</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" min="0" placeholder="0.00" className="bg-[#0e0e0e] border-white/10 text-white" data-testid="input-service-price" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="duration" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/70">Duração (min) *</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min="5" step="5" placeholder="30" className="bg-[#0e0e0e] border-white/10 text-white" data-testid="input-service-duration" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="flex items-center gap-6">
                <FormField control={form.control} name="isCombo" render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-combo" />
                    </FormControl>
                    <FormLabel className="!mt-0 text-white/70">É combo</FormLabel>
                  </FormItem>
                )} />
                <FormField control={form.control} name="isActive" render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-active" />
                    </FormControl>
                    <FormLabel className="!mt-0 text-white/70">Ativo</FormLabel>
                  </FormItem>
                )} />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="px-4 py-2.5 text-sm text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  data-testid="button-save-service"
                  className="px-5 py-2.5 text-sm font-semibold bg-[#C9A24D] hover:bg-[#b8903e] text-black rounded-xl transition-all disabled:opacity-50"
                >
                  {isPending ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent className="bg-[#1a1a1a] border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Remover serviço?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">
              Tem certeza que deseja remover <strong className="text-white">{deleteTarget?.name}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white hover:bg-white/10">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-red-600 hover:bg-red-700 text-white"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
