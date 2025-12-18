import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Building2,
  User,
  Bell,
  Palette,
  Clock,
  Save,
  LogOut,
  ExternalLink,
  Copy,
  QrCode,
} from "lucide-react";
import { z } from "zod";
import type { Barbershop } from "@shared/schema";

const barbershopFormSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  description: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  openingTime: z.string(),
  closingTime: z.string(),
  primaryColor: z.string(),
});

type BarbershopFormData = z.infer<typeof barbershopFormSchema>;

export default function Settings() {
  const [activeTab, setActiveTab] = useState("business");
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: barbershop, isLoading } = useQuery<Barbershop>({
    queryKey: ["/api/barbershop"],
  });

  const form = useForm<BarbershopFormData>({
    resolver: zodResolver(barbershopFormSchema),
    defaultValues: {
      name: barbershop?.name || "",
      description: barbershop?.description || "",
      address: barbershop?.address || "",
      phone: barbershop?.phone || "",
      email: barbershop?.email || "",
      openingTime: barbershop?.openingTime || "09:00",
      closingTime: barbershop?.closingTime || "19:00",
      primaryColor: barbershop?.primaryColor || "#0066FF",
    },
  });

  const updateBarbershopMutation = useMutation({
    mutationFn: async (data: BarbershopFormData) => {
      await apiRequest("PATCH", "/api/barbershop", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/barbershop"] });
      toast({ title: "Configurações salvas com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao salvar configurações", variant: "destructive" });
    },
  });

  const bookingUrl = barbershop?.slug
    ? `${window.location.origin}/book/${barbershop.slug}`
    : "";

  const copyBookingUrl = () => {
    navigator.clipboard.writeText(bookingUrl);
    toast({ title: "Link copiado para a área de transferência" });
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-settings-title">Configurações</h1>
          <p className="text-muted-foreground">
            Personalize sua barbearia
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="business" data-testid="tab-business">
            <Building2 className="h-4 w-4 mr-2" />
            Negócio
          </TabsTrigger>
          <TabsTrigger value="profile" data-testid="tab-profile">
            <User className="h-4 w-4 mr-2" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="booking" data-testid="tab-booking">
            <ExternalLink className="h-4 w-4 mr-2" />
            Agendamento
          </TabsTrigger>
          <TabsTrigger value="notifications" data-testid="tab-notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notificações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="business" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações da Barbearia</CardTitle>
              <CardDescription>
                Configure os dados básicos do seu estabelecimento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => updateBarbershopMutation.mutate(data))} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome da Barbearia *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Nome do estabelecimento" data-testid="input-business-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Descreva sua barbearia..." data-testid="input-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Endereço</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Endereço completo" data-testid="input-address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="(11) 99999-9999" data-testid="input-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder="contato@barbearia.com" data-testid="input-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Horário de Funcionamento
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="openingTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Abertura</FormLabel>
                            <FormControl>
                              <Input {...field} type="time" data-testid="input-opening" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="closingTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fechamento</FormLabel>
                            <FormControl>
                              <Input {...field} type="time" data-testid="input-closing" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="font-medium flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Personalização
                    </h3>
                    <FormField
                      control={form.control}
                      name="primaryColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cor Principal</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-3">
                              <Input {...field} type="color" className="w-16 h-10 p-1" data-testid="input-color" />
                              <Input {...field} placeholder="#0066FF" className="flex-1" />
                            </div>
                          </FormControl>
                          <FormDescription>
                            Essa cor será usada no portal de agendamento do cliente
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={updateBarbershopMutation.isPending} data-testid="button-save-settings">
                      <Save className="h-4 w-4 mr-2" />
                      {updateBarbershopMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Seu Perfil</CardTitle>
              <CardDescription>
                Informações da sua conta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={user?.profileImageUrl || ""} />
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                    {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">
                    {user?.firstName} {user?.lastName}
                  </h3>
                  <p className="text-muted-foreground">{user?.email}</p>
                  <p className="text-sm text-muted-foreground capitalize">{user?.role || "Proprietário"}</p>
                </div>
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button variant="destructive" onClick={handleLogout} data-testid="button-logout">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair da Conta
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="booking" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Link de Agendamento</CardTitle>
              <CardDescription>
                Compartilhe este link com seus clientes para agendamento online
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-2">
                <Input
                  value={bookingUrl}
                  readOnly
                  className="flex-1"
                  data-testid="input-booking-url"
                />
                <Button variant="outline" onClick={copyBookingUrl} data-testid="button-copy-url">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" data-testid="button-qr-code">
                  <QrCode className="h-4 w-4" />
                </Button>
              </div>

              <div className="bg-muted/50 rounded-lg p-6 text-center">
                <div className="w-32 h-32 bg-background rounded-lg mx-auto mb-4 flex items-center justify-center border">
                  <QrCode className="h-16 w-16 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  QR Code para agendamento rápido
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Notificações</CardTitle>
              <CardDescription>
                Configure lembretes e mensagens automáticas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Confirmação de Agendamento</p>
                    <p className="text-sm text-muted-foreground">
                      Enviar mensagem ao cliente após o agendamento
                    </p>
                  </div>
                  <Switch defaultChecked data-testid="switch-confirmation" />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Lembrete 24h Antes</p>
                    <p className="text-sm text-muted-foreground">
                      Lembrar cliente um dia antes do agendamento
                    </p>
                  </div>
                  <Switch defaultChecked data-testid="switch-reminder-24h" />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Lembrete 1h Antes</p>
                    <p className="text-sm text-muted-foreground">
                      Lembrar cliente uma hora antes do agendamento
                    </p>
                  </div>
                  <Switch data-testid="switch-reminder-1h" />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Follow-up Pós-Atendimento</p>
                    <p className="text-sm text-muted-foreground">
                      Solicitar avaliação após o serviço
                    </p>
                  </div>
                  <Switch defaultChecked data-testid="switch-followup" />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Aniversário do Cliente</p>
                    <p className="text-sm text-muted-foreground">
                      Enviar mensagem de aniversário com cupom
                    </p>
                  </div>
                  <Switch defaultChecked data-testid="switch-birthday" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
