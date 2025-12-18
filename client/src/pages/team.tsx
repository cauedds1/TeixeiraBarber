import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Plus,
  Search,
  Phone,
  Mail,
  Clock,
  Percent,
  MoreVertical,
  UserPlus,
  Calendar,
} from "lucide-react";
import { z } from "zod";
import type { Barber } from "@shared/schema";

const barberFormSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().optional(),
  bio: z.string().optional(),
  commissionRate: z.string().default("50"),
  workStartTime: z.string().default("09:00"),
  workEndTime: z.string().default("19:00"),
  isActive: z.boolean().default(true),
});

type BarberFormData = z.infer<typeof barberFormSchema>;

export default function Team() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<BarberFormData>({
    resolver: zodResolver(barberFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      bio: "",
      commissionRate: "50",
      workStartTime: "09:00",
      workEndTime: "19:00",
      isActive: true,
    },
  });

  const { data: barbers, isLoading } = useQuery<Barber[]>({
    queryKey: ["/api/barbers"],
  });

  const createBarberMutation = useMutation({
    mutationFn: async (data: BarberFormData) => {
      await apiRequest("POST", "/api/barbers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/barbers"] });
      setIsNewDialogOpen(false);
      form.reset();
      toast({ title: "Barbeiro cadastrado com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao cadastrar barbeiro", variant: "destructive" });
    },
  });

  const filteredBarbers = barbers?.filter((barber) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      barber.name?.toLowerCase().includes(query) ||
      barber.email?.toLowerCase().includes(query)
    );
  });

  const onSubmit = (data: BarberFormData) => {
    createBarberMutation.mutate(data);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-team-title">Equipe</h1>
          <p className="text-muted-foreground">
            Gerencie os barbeiros da sua barbearia
          </p>
        </div>
        <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-barber">
              <UserPlus className="h-4 w-4 mr-2" />
              Novo Barbeiro
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Novo Barbeiro</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Nome completo" data-testid="input-barber-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="email@exemplo.com" data-testid="input-barber-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Telefone</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="(11) 99999-9999" data-testid="input-barber-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Descrição do profissional..." data-testid="input-barber-bio" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="commissionRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Comissão (%)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" placeholder="50" data-testid="input-barber-commission" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="workStartTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Início</FormLabel>
                        <FormControl>
                          <Input {...field} type="time" data-testid="input-barber-start" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="workEndTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fim</FormLabel>
                        <FormControl>
                          <Input {...field} type="time" data-testid="input-barber-end" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-active" />
                      </FormControl>
                      <FormLabel className="!mt-0">Barbeiro ativo</FormLabel>
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsNewDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createBarberMutation.isPending} data-testid="button-save-barber">
                    {createBarberMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative w-full sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar barbeiro..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-testid="input-search"
        />
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <Skeleton className="h-16 w-16 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredBarbers && filteredBarbers.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredBarbers.map((barber) => (
            <Card key={barber.id} className="hover-elevate" data-testid={`card-barber-${barber.id}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={barber.photoUrl || ""} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xl">
                        {barber.name?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{barber.name}</h3>
                        {barber.isActive ? (
                          <Badge size="sm" className="bg-green-500/10 text-green-600">Ativo</Badge>
                        ) : (
                          <Badge size="sm" variant="secondary">Inativo</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <Percent className="h-3 w-3" />
                        <span>{barber.commissionRate}% comissão</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" data-testid={`button-more-${barber.id}`}>
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>

                {barber.bio && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{barber.bio}</p>
                )}

                <div className="space-y-2 text-sm">
                  {barber.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{barber.phone}</span>
                    </div>
                  )}
                  {barber.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{barber.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{barber.workStartTime} - {barber.workEndTime}</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <Button variant="outline" size="sm" className="flex-1" data-testid={`button-schedule-${barber.id}`}>
                    <Calendar className="h-4 w-4 mr-1" />
                    Agenda
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" data-testid={`button-edit-${barber.id}`}>
                    Editar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <UserPlus className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum barbeiro encontrado</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setIsNewDialogOpen(true)}
                data-testid="button-empty-new"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Barbeiro
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
