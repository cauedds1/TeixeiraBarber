import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  FormDescription,
} from "@/components/ui/form";
import {
  Plus,
  Gift,
  Star,
  Ticket,
  Percent,
  MoreVertical,
  Users,
} from "lucide-react";
import { format } from "date-fns";
import { z } from "zod";
import type { LoyaltyPlan, Coupon } from "@shared/schema";

const loyaltyFormSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  description: z.string().optional(),
  pointsPerCurrency: z.string().default("1"),
  rewardThreshold: z.string().min(1, "Pontos necessários é obrigatório"),
  rewardValue: z.string().min(1, "Valor da recompensa é obrigatório"),
  rewardType: z.enum(["discount", "free_service"]).default("discount"),
  isActive: z.boolean().default(true),
});

const couponFormSchema = z.object({
  code: z.string().min(3, "Código deve ter pelo menos 3 caracteres").toUpperCase(),
  description: z.string().optional(),
  discountType: z.enum(["percentage", "fixed"]).default("percentage"),
  discountValue: z.string().min(1, "Valor do desconto é obrigatório"),
  minPurchase: z.string().optional(),
  maxUses: z.string().optional(),
  validFrom: z.string().optional(),
  validUntil: z.string().optional(),
  isActive: z.boolean().default(true),
});

type LoyaltyFormData = z.infer<typeof loyaltyFormSchema>;
type CouponFormData = z.infer<typeof couponFormSchema>;

export default function Loyalty() {
  const [activeTab, setActiveTab] = useState("programs");
  const [isLoyaltyDialogOpen, setIsLoyaltyDialogOpen] = useState(false);
  const [isCouponDialogOpen, setIsCouponDialogOpen] = useState(false);
  const { toast } = useToast();

  const loyaltyForm = useForm<LoyaltyFormData>({
    resolver: zodResolver(loyaltyFormSchema),
    defaultValues: {
      name: "",
      description: "",
      pointsPerCurrency: "1",
      rewardThreshold: "100",
      rewardValue: "",
      rewardType: "discount",
      isActive: true,
    },
  });

  const couponForm = useForm<CouponFormData>({
    resolver: zodResolver(couponFormSchema),
    defaultValues: {
      code: "",
      description: "",
      discountType: "percentage",
      discountValue: "",
      minPurchase: "",
      maxUses: "",
      validFrom: "",
      validUntil: "",
      isActive: true,
    },
  });

  const { data: loyaltyPlans, isLoading: plansLoading } = useQuery<LoyaltyPlan[]>({
    queryKey: ["/api/loyalty-plans"],
  });

  const { data: coupons, isLoading: couponsLoading } = useQuery<Coupon[]>({
    queryKey: ["/api/coupons"],
  });

  const createLoyaltyMutation = useMutation({
    mutationFn: async (data: LoyaltyFormData) => {
      await apiRequest("POST", "/api/loyalty-plans", {
        ...data,
        pointsPerCurrency: parseInt(data.pointsPerCurrency),
        rewardThreshold: parseInt(data.rewardThreshold),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty-plans"] });
      setIsLoyaltyDialogOpen(false);
      loyaltyForm.reset();
      toast({ title: "Programa de fidelidade criado" });
    },
  });

  const createCouponMutation = useMutation({
    mutationFn: async (data: CouponFormData) => {
      await apiRequest("POST", "/api/coupons", {
        ...data,
        code: data.code.toUpperCase(),
        maxUses: data.maxUses ? parseInt(data.maxUses) : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coupons"] });
      setIsCouponDialogOpen(false);
      couponForm.reset();
      toast({ title: "Cupom criado com sucesso" });
    },
  });

  const formatCurrency = (value: number | string | null) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(num || 0);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-loyalty-title">Fidelidade e Cupons</h1>
          <p className="text-muted-foreground">
            Programas de pontos, cashback e cupons de desconto
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="programs" data-testid="tab-programs">
            <Star className="h-4 w-4 mr-2" />
            Programas
          </TabsTrigger>
          <TabsTrigger value="coupons" data-testid="tab-coupons">
            <Ticket className="h-4 w-4 mr-2" />
            Cupons
          </TabsTrigger>
        </TabsList>

        <TabsContent value="programs" className="space-y-6 mt-6">
          <div className="flex justify-end">
            <Dialog open={isLoyaltyDialogOpen} onOpenChange={setIsLoyaltyDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-new-program">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Programa
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Novo Programa de Fidelidade</DialogTitle>
                </DialogHeader>
                <Form {...loyaltyForm}>
                  <form onSubmit={loyaltyForm.handleSubmit((data) => createLoyaltyMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={loyaltyForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Ex: Cliente VIP" data-testid="input-program-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loyaltyForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Descrição do programa..." data-testid="input-program-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={loyaltyForm.control}
                        name="pointsPerCurrency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pontos por R$</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" placeholder="1" data-testid="input-points-per" />
                            </FormControl>
                            <FormDescription>Pontos ganhos a cada R$1</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loyaltyForm.control}
                        name="rewardThreshold"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pontos p/ Recompensa *</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" placeholder="100" data-testid="input-threshold" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={loyaltyForm.control}
                        name="rewardType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Recompensa</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-reward-type">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="discount">Desconto em R$</SelectItem>
                                <SelectItem value="free_service">Serviço Grátis</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loyaltyForm.control}
                        name="rewardValue"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor da Recompensa *</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" step="0.01" placeholder="0.00" data-testid="input-reward-value" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={loyaltyForm.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-active" />
                          </FormControl>
                          <FormLabel className="!mt-0">Programa ativo</FormLabel>
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsLoyaltyDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={createLoyaltyMutation.isPending} data-testid="button-save-program">
                        {createLoyaltyMutation.isPending ? "Salvando..." : "Salvar"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {plansLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-6 w-32 mb-4" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-3/4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : loyaltyPlans && loyaltyPlans.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {loyaltyPlans.map((plan) => (
                <Card key={plan.id} className="hover-elevate" data-testid={`card-program-${plan.id}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-500/10 text-yellow-600">
                          <Star className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{plan.name}</h3>
                            {plan.isActive ? (
                              <Badge size="sm" className="bg-green-500/10 text-green-600">Ativo</Badge>
                            ) : (
                              <Badge size="sm" variant="secondary">Inativo</Badge>
                            )}
                          </div>
                          {plan.description && (
                            <p className="text-sm text-muted-foreground">{plan.description}</p>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-primary">{plan.pointsPerCurrency}</p>
                        <p className="text-xs text-muted-foreground">ponto/R$</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{plan.rewardThreshold}</p>
                        <p className="text-xs text-muted-foreground">pontos p/ resgate</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">{formatCurrency(plan.rewardValue)}</p>
                        <p className="text-xs text-muted-foreground">recompensa</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Gift className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhum programa de fidelidade</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setIsLoyaltyDialogOpen(true)}
                  data-testid="button-empty-program"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Programa
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="coupons" className="space-y-6 mt-6">
          <div className="flex justify-end">
            <Dialog open={isCouponDialogOpen} onOpenChange={setIsCouponDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-new-coupon">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Cupom
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Novo Cupom de Desconto</DialogTitle>
                </DialogHeader>
                <Form {...couponForm}>
                  <form onSubmit={couponForm.handleSubmit((data) => createCouponMutation.mutate(data))} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={couponForm.control}
                        name="code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Código *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="DESCONTO10" className="uppercase" data-testid="input-coupon-code" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={couponForm.control}
                        name="discountType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-discount-type">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                                <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={couponForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Descrição do cupom" data-testid="input-coupon-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={couponForm.control}
                        name="discountValue"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valor do Desconto *</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" step="0.01" placeholder="0.00" data-testid="input-discount-value" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={couponForm.control}
                        name="minPurchase"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Compra Mínima</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" step="0.01" placeholder="0.00" data-testid="input-min-purchase" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <FormField
                        control={couponForm.control}
                        name="maxUses"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Usos Máximos</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" placeholder="Ilimitado" data-testid="input-max-uses" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={couponForm.control}
                        name="validFrom"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Início</FormLabel>
                            <FormControl>
                              <Input {...field} type="date" data-testid="input-valid-from" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={couponForm.control}
                        name="validUntil"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fim</FormLabel>
                            <FormControl>
                              <Input {...field} type="date" data-testid="input-valid-until" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={couponForm.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-coupon-active" />
                          </FormControl>
                          <FormLabel className="!mt-0">Cupom ativo</FormLabel>
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsCouponDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={createCouponMutation.isPending} data-testid="button-save-coupon">
                        {createCouponMutation.isPending ? "Salvando..." : "Salvar"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          {couponsLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-8 w-24 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : coupons && coupons.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {coupons.map((coupon) => (
                <Card key={coupon.id} className="hover-elevate" data-testid={`card-coupon-${coupon.id}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <code className="text-lg font-bold bg-primary/10 text-primary px-2 py-1 rounded">
                          {coupon.code}
                        </code>
                        {coupon.isActive ? (
                          <Badge size="sm" className="bg-green-500/10 text-green-600">Ativo</Badge>
                        ) : (
                          <Badge size="sm" variant="secondary">Inativo</Badge>
                        )}
                      </div>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                    {coupon.description && (
                      <p className="text-sm text-muted-foreground mb-3">{coupon.description}</p>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-2xl font-bold text-green-600">
                        {coupon.discountType === "percentage"
                          ? `${coupon.discountValue}%`
                          : formatCurrency(coupon.discountValue)}
                      </span>
                      <div className="text-right text-muted-foreground">
                        <p>{coupon.usedCount || 0} usos</p>
                        {coupon.maxUses && <p>de {coupon.maxUses}</p>}
                      </div>
                    </div>
                    {(coupon.validFrom || coupon.validUntil) && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {coupon.validFrom && `De ${format(new Date(coupon.validFrom), "dd/MM/yyyy")}`}
                        {coupon.validFrom && coupon.validUntil && " "}
                        {coupon.validUntil && `até ${format(new Date(coupon.validUntil), "dd/MM/yyyy")}`}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Ticket className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhum cupom cadastrado</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setIsCouponDialogOpen(true)}
                  data-testid="button-empty-coupon"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Cupom
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
