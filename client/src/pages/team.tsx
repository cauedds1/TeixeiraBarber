import { useState, useRef } from "react";
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
import { Button } from "@/components/ui/button";
import {
  Plus, Search, Phone, Mail, Clock, Percent, Camera, Pencil, Trash2, UserPlus,
} from "lucide-react";
import { z } from "zod";
import type { Barber } from "@shared/schema";

const barberFormSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  bio: z.string().optional(),
  photoUrl: z.string().optional(),
  commissionRate: z.string().default("50"),
  workStartTime: z.string().default("09:00"),
  workEndTime: z.string().default("19:00"),
  isActive: z.boolean().default(true),
});

type BarberFormData = z.infer<typeof barberFormSchema>;

export default function Team() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBarber, setEditingBarber] = useState<Barber | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Barber | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const form = useForm<BarberFormData>({
    resolver: zodResolver(barberFormSchema),
    defaultValues: {
      name: "", email: "", phone: "", bio: "", photoUrl: "",
      commissionRate: "50", workStartTime: "09:00", workEndTime: "19:00", isActive: true,
    },
  });

  const { data: barbers, isLoading } = useQuery<Barber[]>({
    queryKey: ["/api/barbers"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: BarberFormData) => {
      await apiRequest("POST", "/api/barbers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/barbers"] });
      closeDialog();
      toast({ title: "Profissional cadastrado com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao cadastrar", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: BarberFormData }) => {
      await apiRequest("PATCH", `/api/barbers/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/barbers"] });
      closeDialog();
      toast({ title: "Profissional atualizado" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/barbers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/barbers"] });
      setDeleteTarget(null);
      toast({ title: "Profissional removido" });
    },
    onError: () => {
      toast({ title: "Erro ao remover", variant: "destructive" });
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingBarber(null);
    setPhotoPreview(null);
    form.reset({
      name: "", email: "", phone: "", bio: "", photoUrl: "",
      commissionRate: "50", workStartTime: "09:00", workEndTime: "19:00", isActive: true,
    });
  };

  const openEdit = (barber: Barber) => {
    setEditingBarber(barber);
    setPhotoPreview(barber.photoUrl || null);
    form.reset({
      name: barber.name,
      email: barber.email || "",
      phone: barber.phone || "",
      bio: barber.bio || "",
      photoUrl: barber.photoUrl || "",
      commissionRate: barber.commissionRate?.toString() || "50",
      workStartTime: barber.workStartTime || "09:00",
      workEndTime: barber.workEndTime || "19:00",
      isActive: barber.isActive ?? true,
    });
    setDialogOpen(true);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Imagem muito grande (máx 2MB)", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setPhotoPreview(base64);
      form.setValue("photoUrl", base64);
    };
    reader.readAsDataURL(file);
  };

  const onSubmit = (data: BarberFormData) => {
    if (editingBarber) {
      updateMutation.mutate({ id: editingBarber.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const filtered = barbers?.filter((b) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return b.name?.toLowerCase().includes(q) || b.email?.toLowerCase().includes(q);
  });

  const isPending = createMutation.isPending || updateMutation.isPending;
  const initials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-[#0e0e0e] p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white" data-testid="text-team-title">Funcionários</h1>
            <p className="text-white/40 text-sm mt-1">Gerencie sua equipe de profissionais</p>
          </div>
          <button
            onClick={() => { setEditingBarber(null); setDialogOpen(true); }}
            data-testid="button-new-barber"
            className="flex items-center gap-2 bg-[#C9A24D] hover:bg-[#b8903e] text-black font-semibold px-5 py-2.5 rounded-xl transition-all hover:scale-105 active:scale-95 text-sm"
          >
            <UserPlus className="w-4 h-4" />
            Novo Profissional
          </button>
        </div>

        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <input
            placeholder="Buscar profissional..."
            className="w-full bg-[#151515] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#C9A24D]/50 transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search"
          />
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#151515] border border-white/5 rounded-2xl p-6 animate-pulse">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-full bg-white/10" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-24 bg-white/10 rounded" />
                    <div className="h-3 w-16 bg-white/5 rounded" />
                  </div>
                </div>
                <div className="h-3 w-full bg-white/5 rounded mb-2" />
                <div className="h-3 w-2/3 bg-white/5 rounded" />
              </div>
            ))}
          </div>
        ) : filtered && filtered.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((barber) => (
              <div
                key={barber.id}
                className="group bg-[#151515] border border-white/5 hover:border-[#C9A24D]/20 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-[#C9A24D]/5"
                data-testid={`card-barber-${barber.id}`}
              >
                <div className="relative h-28 bg-gradient-to-br from-[#C9A24D]/20 via-[#1a1a1a] to-[#151515] flex items-center justify-center">
                  {barber.photoUrl ? (
                    <img
                      src={barber.photoUrl}
                      alt={barber.name}
                      className="w-20 h-20 rounded-full object-cover border-2 border-[#C9A24D]/40 shadow-lg"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-[#C9A24D]/10 border-2 border-[#C9A24D]/30 flex items-center justify-center">
                      <span className="text-2xl font-black text-[#C9A24D]">{initials(barber.name)}</span>
                    </div>
                  )}
                  <div className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ${barber.isActive ? "bg-green-500" : "bg-white/20"}`} />
                </div>

                <div className="p-5 space-y-3">
                  <div>
                    <h3 className="font-bold text-white text-lg">{barber.name}</h3>
                    {barber.bio && (
                      <p className="text-white/40 text-sm mt-1 line-clamp-2">{barber.bio}</p>
                    )}
                  </div>

                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center gap-2 text-white/50">
                      <Percent className="w-3.5 h-3.5 text-[#C9A24D]" />
                      <span>{barber.commissionRate}% comissão</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/50">
                      <Clock className="w-3.5 h-3.5 text-[#C9A24D]" />
                      <span>{barber.workStartTime} – {barber.workEndTime}</span>
                    </div>
                    {barber.phone && (
                      <div className="flex items-center gap-2 text-white/50">
                        <Phone className="w-3.5 h-3.5 text-[#C9A24D]" />
                        <span>{barber.phone}</span>
                      </div>
                    )}
                    {barber.email && (
                      <div className="flex items-center gap-2 text-white/50">
                        <Mail className="w-3.5 h-3.5 text-[#C9A24D]" />
                        <span className="truncate">{barber.email}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-white/5">
                    <button
                      onClick={() => openEdit(barber)}
                      data-testid={`button-edit-${barber.id}`}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-white/5 hover:bg-[#C9A24D]/10 hover:text-[#C9A24D] text-white/60 text-sm font-medium py-2 rounded-xl transition-all"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Editar
                    </button>
                    <button
                      onClick={() => setDeleteTarget(barber)}
                      data-testid={`button-delete-${barber.id}`}
                      className="flex items-center justify-center gap-1.5 bg-white/5 hover:bg-red-500/10 hover:text-red-400 text-white/60 text-sm font-medium px-3 py-2 rounded-xl transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#151515] border border-white/5 rounded-2xl py-16 text-center">
            <UserPlus className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-white/40 mb-4">Nenhum profissional encontrado</p>
            <button
              onClick={() => setDialogOpen(true)}
              data-testid="button-empty-new"
              className="inline-flex items-center gap-2 bg-[#C9A24D] hover:bg-[#b8903e] text-black font-semibold px-5 py-2.5 rounded-xl transition-all text-sm"
            >
              <Plus className="w-4 h-4" />
              Adicionar Profissional
            </button>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent className="max-w-lg bg-[#1a1a1a] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingBarber ? "Editar Profissional" : "Novo Profissional"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="flex justify-center">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-24 h-24 rounded-full cursor-pointer group"
                >
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-24 h-24 rounded-full object-cover border-2 border-[#C9A24D]/40" />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-[#C9A24D]/10 border-2 border-dashed border-[#C9A24D]/30 flex items-center justify-center">
                      <Camera className="w-6 h-6 text-[#C9A24D]/60" />
                    </div>
                  )}
                  <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                    data-testid="input-photo-upload"
                  />
                </div>
              </div>
              <p className="text-center text-white/30 text-xs -mt-2">Clique para enviar foto (máx 2MB)</p>

              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/70">Nome *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nome completo" className="bg-[#0e0e0e] border-white/10 text-white" data-testid="input-barber-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/70">Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="email@exemplo.com" className="bg-[#0e0e0e] border-white/10 text-white" data-testid="input-barber-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/70">Telefone</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="(48) 99999-9999" className="bg-[#0e0e0e] border-white/10 text-white" data-testid="input-barber-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="bio" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/70">Bio / Especialidade</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Ex: Especialista em cortes modernos..." className="bg-[#0e0e0e] border-white/10 text-white resize-none" data-testid="input-barber-bio" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-3 gap-4">
                <FormField control={form.control} name="commissionRate" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/70">Comissão (%)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min="0" max="100" className="bg-[#0e0e0e] border-white/10 text-white" data-testid="input-barber-commission" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="workStartTime" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/70">Início</FormLabel>
                    <FormControl>
                      <Input {...field} type="time" className="bg-[#0e0e0e] border-white/10 text-white" data-testid="input-barber-start" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="workEndTime" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/70">Fim</FormLabel>
                    <FormControl>
                      <Input {...field} type="time" className="bg-[#0e0e0e] border-white/10 text-white" data-testid="input-barber-end" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="isActive" render={({ field }) => (
                <FormItem className="flex items-center gap-3 bg-[#0e0e0e] border border-white/10 rounded-xl px-4 py-3">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-active" />
                  </FormControl>
                  <FormLabel className="!mt-0 text-white/70">Profissional ativo</FormLabel>
                </FormItem>
              )} />

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
                  data-testid="button-save-barber"
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
            <AlertDialogTitle className="text-white">Remover profissional?</AlertDialogTitle>
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
