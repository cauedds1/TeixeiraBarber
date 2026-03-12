import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { LogIn, Loader2, Lock, UserPlus } from "lucide-react";
import teixeiraLogoPath from "@assets/logo.png";

const STORAGE_KEY = "teixeira_remember";
const STORAGE_EMAIL = "teixeira_saved_email";
const STORAGE_PASSWORD = "teixeira_saved_password";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha obrigatória"),
});

const registerSchema = z.object({
  firstName: z.string().min(1, "Nome obrigatório"),
  lastName: z.string().optional(),
  barbershopName: z.string().min(1, "Nome da barbearia obrigatório"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  confirmPassword: z.string().min(1, "Confirme a senha"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

const inputClass = "w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-[#C9A24D]/40 focus:ring-1 focus:ring-[#C9A24D]/20 transition-all text-sm";

function getSavedCredentials() {
  try {
    const remember = localStorage.getItem(STORAGE_KEY) === "true";
    if (!remember) return { remember: false, email: "", password: "" };
    return {
      remember: true,
      email: localStorage.getItem(STORAGE_EMAIL) || "",
      password: localStorage.getItem(STORAGE_PASSWORD) || "",
    };
  } catch {
    return { remember: false, email: "", password: "" };
  }
}

export default function Login() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");

  const saved = getSavedCredentials();
  const [rememberMe, setRememberMe] = useState(saved.remember);

  if (user) {
    navigate("/");
    return null;
  }

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: saved.email, password: saved.password },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: "", lastName: "", barbershopName: "", email: "", password: "", confirmPassword: "" },
  });

  const handleRememberChange = (checked: boolean) => {
    setRememberMe(checked);
    try {
      localStorage.setItem(STORAGE_KEY, String(checked));
      if (!checked) {
        localStorage.removeItem(STORAGE_EMAIL);
        localStorage.removeItem(STORAGE_PASSWORD);
      }
    } catch {}
  };

  const onLogin = async (data: LoginForm) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (response.ok) {
        if (rememberMe) {
          try {
            localStorage.setItem(STORAGE_KEY, "true");
            localStorage.setItem(STORAGE_EMAIL, data.email);
            localStorage.setItem(STORAGE_PASSWORD, data.password);
          } catch {}
        } else {
          try {
            localStorage.removeItem(STORAGE_EMAIL);
            localStorage.removeItem(STORAGE_PASSWORD);
          } catch {}
        }
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
    } catch {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao fazer login",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onRegister = async (data: RegisterForm) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName || "",
          barbershopName: data.barbershopName,
          email: data.email,
          password: data.password,
        }),
        credentials: "include",
      });

      if (response.ok) {
        await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        toast({ title: "Conta criada com sucesso!" });
        navigate("/");
      } else {
        const err = await response.json();
        toast({
          title: "Erro ao criar conta",
          description: err.message || "Tente novamente",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao criar a conta",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = (newMode: "login" | "register") => {
    setMode(newMode);
    loginForm.reset({ email: saved.email, password: saved.password });
    registerForm.reset();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0e0e0e] px-4 py-8">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#C9A24D]/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[#C9A24D]/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="flex flex-col items-center mb-6 text-center">
          <img
            src={teixeiraLogoPath}
            alt="Teixeira Barbearia"
            className="h-20 w-auto mb-4 opacity-90"
            data-testid="img-logo"
          />
          <p className="text-[#C9A24D] text-xs font-semibold tracking-widest uppercase mb-2">Sistema de Gestão</p>
          <p className="text-white/30 text-xs">
            {mode === "login" ? "Acesso exclusivo para proprietários" : "Crie sua conta de proprietário"}
          </p>
        </div>

        <div className="flex mb-4 bg-[#151515] border border-white/5 rounded-xl p-1">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all ${
              mode === "login"
                ? "bg-[#C9A24D] text-[#0e0e0e]"
                : "text-white/40 hover:text-white/60"
            }`}
            data-testid="tab-login"
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => switchMode("register")}
            className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all ${
              mode === "register"
                ? "bg-[#C9A24D] text-[#0e0e0e]"
                : "text-white/40 hover:text-white/60"
            }`}
            data-testid="tab-register"
          >
            Criar conta
          </button>
        </div>

        <div className="bg-[#151515] border border-white/5 rounded-2xl p-6 shadow-xl shadow-black/20">
          {mode === "login" ? (
            <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-5" data-testid="form-login">
              <div className="space-y-2">
                <label className="text-white/60 text-sm font-medium">Email</label>
                <input
                  {...loginForm.register("email")}
                  type="email"
                  placeholder="seu@email.com"
                  disabled={isLoading}
                  className={inputClass}
                  data-testid="input-login-email"
                />
                {loginForm.formState.errors.email && (
                  <p className="text-red-400 text-xs">{loginForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-white/60 text-sm font-medium">Senha</label>
                <input
                  {...loginForm.register("password")}
                  type="password"
                  placeholder="••••••••"
                  disabled={isLoading}
                  className={inputClass}
                  data-testid="input-login-password"
                />
                {loginForm.formState.errors.password && (
                  <p className="text-red-400 text-xs">{loginForm.formState.errors.password.message}</p>
                )}
              </div>

              <label
                className="flex items-center gap-2.5 cursor-pointer group select-none"
                data-testid="label-remember-me"
              >
                <div className="relative flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => handleRememberChange(e.target.checked)}
                    className="sr-only"
                    data-testid="checkbox-remember-me"
                  />
                  <div
                    className={`w-4 h-4 rounded border transition-all ${
                      rememberMe
                        ? "bg-[#C9A24D] border-[#C9A24D]"
                        : "bg-white/5 border-white/20 group-hover:border-white/40"
                    }`}
                  >
                    {rememberMe && (
                      <svg className="w-3 h-3 text-[#0e0e0e] absolute top-0.5 left-0.5" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-white/50 text-xs group-hover:text-white/70 transition-colors">
                  Lembrar acesso
                </span>
              </label>

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
          ) : (
            <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4" data-testid="form-register">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-white/60 text-sm font-medium">Nome *</label>
                  <input
                    {...registerForm.register("firstName")}
                    type="text"
                    placeholder="Seu nome"
                    disabled={isLoading}
                    className={inputClass}
                    data-testid="input-register-firstname"
                  />
                  {registerForm.formState.errors.firstName && (
                    <p className="text-red-400 text-xs">{registerForm.formState.errors.firstName.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-white/60 text-sm font-medium">Sobrenome</label>
                  <input
                    {...registerForm.register("lastName")}
                    type="text"
                    placeholder="Opcional"
                    disabled={isLoading}
                    className={inputClass}
                    data-testid="input-register-lastname"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-white/60 text-sm font-medium">Nome da Barbearia *</label>
                <input
                  {...registerForm.register("barbershopName")}
                  type="text"
                  placeholder="Ex: Barbearia do João"
                  disabled={isLoading}
                  className={inputClass}
                  data-testid="input-register-barbershop"
                />
                {registerForm.formState.errors.barbershopName && (
                  <p className="text-red-400 text-xs">{registerForm.formState.errors.barbershopName.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-white/60 text-sm font-medium">Email *</label>
                <input
                  {...registerForm.register("email")}
                  type="email"
                  placeholder="seu@email.com"
                  disabled={isLoading}
                  className={inputClass}
                  data-testid="input-register-email"
                />
                {registerForm.formState.errors.email && (
                  <p className="text-red-400 text-xs">{registerForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-white/60 text-sm font-medium">Senha *</label>
                <input
                  {...registerForm.register("password")}
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  disabled={isLoading}
                  className={inputClass}
                  data-testid="input-register-password"
                />
                {registerForm.formState.errors.password && (
                  <p className="text-red-400 text-xs">{registerForm.formState.errors.password.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-white/60 text-sm font-medium">Confirmar Senha *</label>
                <input
                  {...registerForm.register("confirmPassword")}
                  type="password"
                  placeholder="Repita a senha"
                  disabled={isLoading}
                  className={inputClass}
                  data-testid="input-register-confirm"
                />
                {registerForm.formState.errors.confirmPassword && (
                  <p className="text-red-400 text-xs">{registerForm.formState.errors.confirmPassword.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#C9A24D] hover:bg-[#b8933f] text-[#0e0e0e] font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                data-testid="button-register"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Criando conta...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Criar conta
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <div className="flex items-center justify-center gap-1.5 mt-6 text-white/15 text-[10px]">
          <Lock className="w-2.5 h-2.5" />
          <span>Conexão segura · Dados protegidos</span>
        </div>
      </div>
    </div>
  );
}
