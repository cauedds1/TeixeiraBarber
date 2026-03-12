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
  Plus, Search, Package, AlertTriangle, TrendingUp, Pencil, Trash2, BarChart3,
} from "lucide-react";
import { z } from "zod";
import type { Product } from "@shared/schema";

const productFormSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  description: z.string().optional(),
  sku: z.string().optional(),
  price: z.string().min(1, "Preço de venda é obrigatório"),
  costPrice: z.string().optional(),
  stockQuantity: z.string().default("0"),
  lowStockThreshold: z.string().default("5"),
  isActive: z.boolean().default(true),
});

type ProductFormData = z.infer<typeof productFormSchema>;

export default function Products() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const { toast } = useToast();

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "", description: "", sku: "", price: "", costPrice: "",
      stockQuantity: "0", lowStockThreshold: "5", isActive: true,
    },
  });

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      await apiRequest("POST", "/api/products", {
        ...data,
        stockQuantity: parseInt(data.stockQuantity),
        lowStockThreshold: parseInt(data.lowStockThreshold),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      closeDialog();
      toast({ title: "Produto cadastrado com sucesso" });
    },
    onError: () => {
      toast({ title: "Erro ao cadastrar produto", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ProductFormData }) => {
      await apiRequest("PATCH", `/api/products/${id}`, {
        ...data,
        stockQuantity: parseInt(data.stockQuantity),
        lowStockThreshold: parseInt(data.lowStockThreshold),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      closeDialog();
      toast({ title: "Produto atualizado" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar produto", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      setDeleteTarget(null);
      toast({ title: "Produto removido" });
    },
    onError: () => {
      toast({ title: "Erro ao remover produto", variant: "destructive" });
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingProduct(null);
    form.reset({
      name: "", description: "", sku: "", price: "", costPrice: "",
      stockQuantity: "0", lowStockThreshold: "5", isActive: true,
    });
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    form.reset({
      name: product.name,
      description: product.description || "",
      sku: product.sku || "",
      price: product.price?.toString() || "",
      costPrice: product.costPrice?.toString() || "",
      stockQuantity: product.stockQuantity?.toString() || "0",
      lowStockThreshold: product.lowStockThreshold?.toString() || "5",
      isActive: product.isActive ?? true,
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: ProductFormData) => {
    const normalized = {
      ...data,
      costPrice: data.costPrice && data.costPrice.trim() !== "" ? data.costPrice : null,
      price: data.price && data.price.trim() !== "" ? data.price : "0",
    };
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: normalized });
    } else {
      createMutation.mutate(normalized);
    }
  };

  const formatCurrency = (value: number | string | null) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(num || 0);
  };

  const calculateMargin = (price: string | null, cost: string | null) => {
    const p = parseFloat(price || "0");
    const c = parseFloat(cost || "0");
    if (p === 0 || c === 0) return null;
    return ((p - c) / p) * 100;
  };

  const filtered = products?.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q);
  });

  const lowStockCount = products?.filter((p) => (p.stockQuantity || 0) <= (p.lowStockThreshold || 5)).length || 0;
  const totalStockValue = products?.reduce(
    (acc, p) => acc + parseFloat(p.price?.toString() || "0") * (p.stockQuantity || 0), 0
  ) || 0;
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="min-h-screen bg-[#0e0e0e] p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white" data-testid="text-products-title">Produtos</h1>
            <p className="text-white/40 text-sm mt-1">Controle de estoque e vendas</p>
          </div>
          <button
            onClick={() => { setEditingProduct(null); setDialogOpen(true); }}
            data-testid="button-new-product"
            className="flex items-center gap-2 bg-[#C9A24D] hover:bg-[#b8903e] text-black font-semibold px-5 py-2.5 rounded-xl transition-all hover:scale-105 active:scale-95 text-sm"
          >
            <Plus className="w-4 h-4" />
            Novo Produto
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#151515] border border-white/5 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider">Total Produtos</p>
                <p className="text-2xl font-black text-white mt-1" data-testid="text-total-products">{products?.length || 0}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-[#C9A24D]/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-[#C9A24D]" />
              </div>
            </div>
          </div>
          <div className="bg-[#151515] border border-white/5 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider">Estoque Baixo</p>
                <p className={`text-2xl font-black mt-1 ${lowStockCount > 0 ? "text-amber-400" : "text-white"}`} data-testid="text-low-stock">
                  {lowStockCount}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${lowStockCount > 0 ? "bg-amber-500/10" : "bg-white/5"}`}>
                <AlertTriangle className={`w-5 h-5 ${lowStockCount > 0 ? "text-amber-400" : "text-white/30"}`} />
              </div>
            </div>
          </div>
          <div className="bg-[#151515] border border-white/5 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/40 text-xs uppercase tracking-wider">Valor em Estoque</p>
                <p className="text-2xl font-black text-white mt-1" data-testid="text-stock-value">
                  {formatCurrency(totalStockValue)}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <input
            placeholder="Buscar produto ou SKU..."
            className="w-full bg-[#151515] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#C9A24D]/50 transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search"
          />
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-[#151515] border border-white/5 rounded-2xl p-6 animate-pulse">
                <div className="h-5 w-32 bg-white/10 rounded mb-2" />
                <div className="h-3 w-full bg-white/5 rounded mb-4" />
                <div className="flex justify-between">
                  <div className="h-6 w-20 bg-white/10 rounded" />
                  <div className="h-6 w-16 bg-white/5 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered && filtered.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((product) => {
              const isLowStock = (product.stockQuantity || 0) <= (product.lowStockThreshold || 5);
              const margin = calculateMargin(product.price?.toString(), product.costPrice?.toString());
              const stockPercent = Math.min(
                ((product.stockQuantity || 0) / Math.max((product.lowStockThreshold || 5) * 4, 1)) * 100, 100
              );

              return (
                <div
                  key={product.id}
                  className={`group bg-[#151515] border hover:border-[#C9A24D]/20 rounded-2xl p-5 transition-all duration-200 hover:shadow-lg hover:shadow-[#C9A24D]/5 ${
                    product.isActive ? "border-white/5" : "border-white/5 opacity-60"
                  }`}
                  data-testid={`card-product-${product.id}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-white">{product.name}</h3>
                        {!product.isActive && (
                          <span className="text-[10px] uppercase tracking-wider font-semibold bg-white/5 text-white/30 px-2 py-0.5 rounded-full">Inativo</span>
                        )}
                      </div>
                      {product.sku && (
                        <p className="text-xs text-white/30 mt-0.5">SKU: {product.sku}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => openEdit(product)}
                        data-testid={`button-edit-${product.id}`}
                        className="p-1.5 text-white/30 hover:text-[#C9A24D] hover:bg-[#C9A24D]/10 rounded-lg transition-all"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(product)}
                        data-testid={`button-delete-${product.id}`}
                        className="p-1.5 text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {product.description && (
                    <p className="text-sm text-white/40 mb-4 line-clamp-2">{product.description}</p>
                  )}

                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[#C9A24D] font-black text-xl">{formatCurrency(product.price)}</span>
                    {margin !== null && (
                      <div className="flex items-center gap-1 bg-green-500/10 text-green-400 text-xs font-semibold px-2 py-1 rounded-lg">
                        <BarChart3 className="w-3 h-3" />
                        {margin.toFixed(0)}% margem
                      </div>
                    )}
                  </div>

                  {product.costPrice && (
                    <div className="flex items-center justify-between text-xs text-white/30 mb-3">
                      <span>Custo: {formatCurrency(product.costPrice)}</span>
                      <span>Lucro: {formatCurrency(parseFloat(product.price?.toString() || "0") - parseFloat(product.costPrice?.toString() || "0"))}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className={isLowStock ? "text-amber-400 font-medium" : "text-white/50"}>
                        {isLowStock && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                        Estoque: {product.stockQuantity || 0} un.
                      </span>
                      <span className="text-white/30 text-xs">Min: {product.lowStockThreshold || 5}</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isLowStock ? "bg-amber-400" : "bg-[#C9A24D]"
                        }`}
                        style={{ width: `${stockPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-[#151515] border border-white/5 rounded-2xl py-16 text-center">
            <Package className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-white/40 mb-4">Nenhum produto encontrado</p>
            <button
              onClick={() => setDialogOpen(true)}
              data-testid="button-empty-new"
              className="inline-flex items-center gap-2 bg-[#C9A24D] hover:bg-[#b8903e] text-black font-semibold px-5 py-2.5 rounded-xl transition-all text-sm"
            >
              <Plus className="w-4 h-4" />
              Adicionar Produto
            </button>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent className="max-w-lg bg-[#1a1a1a] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingProduct ? "Editar Produto" : "Novo Produto"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/70">Nome *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nome do produto" className="bg-[#0e0e0e] border-white/10 text-white" data-testid="input-product-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/70">Descrição</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Descrição do produto..." className="bg-[#0e0e0e] border-white/10 text-white resize-none" data-testid="input-product-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="sku" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/70">SKU</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Código" className="bg-[#0e0e0e] border-white/10 text-white" data-testid="input-product-sku" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="price" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/70">Preço de Venda (R$) *</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" min="0" placeholder="0.00" className="bg-[#0e0e0e] border-white/10 text-white" data-testid="input-product-price" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField control={form.control} name="costPrice" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/70">Custo (R$)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" min="0" placeholder="0.00" className="bg-[#0e0e0e] border-white/10 text-white" data-testid="input-product-cost" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="stockQuantity" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/70">Estoque</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min="0" placeholder="0" className="bg-[#0e0e0e] border-white/10 text-white" data-testid="input-product-stock" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="lowStockThreshold" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/70">Alerta Mín.</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min="0" placeholder="5" className="bg-[#0e0e0e] border-white/10 text-white" data-testid="input-product-threshold" />
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
                  <FormLabel className="!mt-0 text-white/70">Produto ativo</FormLabel>
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
                  data-testid="button-save-product"
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
            <AlertDialogTitle className="text-white">Remover produto?</AlertDialogTitle>
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
