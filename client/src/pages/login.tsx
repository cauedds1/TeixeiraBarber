import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { LogIn, Loader2, Lock } from "lucide-react";
import teixeiraLogoPath from "@assets/logo.png";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha obrigatória"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  if (user) {
    navigate("/");
    return null;
  }

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        toast({ title: "Login realizado com sucesso!" });
        navigate("/");
      } else {
        const err = await response.json();
        toast({
          title: "Erro no login",
          description: err.message || "Email ou senha inválidos",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao fazer login",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0e0e0e] px-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#C9A24D]/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#C9A24D]/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="flex flex-col items-center mb-8 text-center">
          <img
            src={teixeiraLogoPath}
            alt="Teixeira Barbearia"
            className="h-20 w-auto mb-4 opacity-90"
            data-testid="img-logo"
          />
          <p className="text-[#C9A24D] text-xs font-semibold tracking-widest uppercase mb-2">Sistema de Gestão</p>
          <p className="text-white/30 text-xs">Acesso exclusivo para proprietários</p>
        </div>

        <div className="bg-[#151515] border border-white/5 rounded-2xl p-6 shadow-xl shadow-black/20">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <label className="text-white/60 text-sm font-medium">Email</label>
              <input
                {...form.register("email")}
                type="email"
                placeholder="seu@email.com"
                disabled={isLoading}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-[#C9A24D]/40 focus:ring-1 focus:ring-[#C9A24D]/20 transition-all text-sm"
                data-testid="input-email"
              />
              {form.formState.errors.email && (
                <p className="text-red-400 text-xs">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-white/60 text-sm font-medium">Senha</label>
              <input
                {...form.register("password")}
                type="password"
                placeholder="••••••••"
                disabled={isLoading}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-[#C9A24D]/40 focus:ring-1 focus:ring-[#C9A24D]/20 transition-all text-sm"
                data-testid="input-password"
              />
              {form.formState.errors.password && (
                <p className="text-red-400 text-xs">{form.formState.errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#C9A24D] hover:bg-[#b8933f] text-[#0e0e0e] font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              data-testid="button-login"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Entrar
                </>
              )}
            </button>
          </form>
        </div>

        <div className="flex items-center justify-center gap-1.5 mt-6 text-white/15 text-[10px]">
          <Lock className="w-2.5 h-2.5" />
          <span>Conexão segura · Dados protegidos</span>
        </div>
      </div>
    </div>
  );
}
