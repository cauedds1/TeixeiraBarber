import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Calendar,
  Users,
  Scissors,
  BarChart3,
  Clock,
  Star,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import teixeiraLogoPath from "@assets/image_1766152163278.png";

const features = [
  {
    icon: Calendar,
    title: "Agendamento Online",
    description: "Clientes agendam 24/7 pelo link ou QR code. Confirme automaticamente via WhatsApp.",
  },
  {
    icon: Users,
    title: "Gestão de Clientes",
    description: "CRM completo com histórico, preferências, fotos antes/depois e programa de fidelidade.",
  },
  {
    icon: Scissors,
    title: "Catálogo de Serviços",
    description: "Tabela de preços organizada com combos, promoções e serviços por profissional.",
  },
  {
    icon: BarChart3,
    title: "Controle Financeiro",
    description: "Caixa diário, comissões automáticas, relatórios detalhados e metas de faturamento.",
  },
  {
    icon: Clock,
    title: "Gestão de Equipe",
    description: "Agenda individual, horários configuráveis, folgas e painel exclusivo para barbeiros.",
  },
  {
    icon: Star,
    title: "Marketing e Fidelização",
    description: "Pontos, cashback, cupons de desconto e campanhas automatizadas para seus clientes.",
  },
];

const benefits = [
  "Agendamento online 24 horas",
  "Confirmações automáticas por WhatsApp",
  "Controle financeiro completo",
  "Relatórios em tempo real",
  "Programa de fidelidade integrado",
  "Suporte dedicado",
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-primary/10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={teixeiraLogoPath} alt="Teixeira" className="h-10 w-auto" />
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button asChild data-testid="button-login">
                <a href="/api/login">Entrar</a>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main>
        <section className="relative py-20 sm:py-40 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="max-w-3xl mx-auto text-center">
              <div className="mb-8 flex justify-center">
                <img src={teixeiraLogoPath} alt="Teixeira Barbearia" className="h-32 w-auto" />
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                Sistema de Gestão{" "}
                <span className="text-primary">Premium</span>
              </h1>
              <p className="text-lg sm:text-xl text-foreground/70 mb-8 max-w-2xl mx-auto">
                Plataforma completa para barbearias modernas. Agendamentos, CRM, 
                controle financeiro, gestão de equipe e muito mais.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild data-testid="button-start-free">
                  <a href="/api/login">
                    Acessar Sistema
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
                <Button size="lg" variant="outline" data-testid="button-learn-more">
                  Conhecer Recursos
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-card/30 border-y border-primary/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Tudo que você precisa</h2>
              <p className="text-foreground/60 max-w-2xl mx-auto">
                Recursos completos para modernizar sua barbearia e aumentar seu faturamento
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature) => (
                <Card key={feature.title} className="hover-elevate">
                  <CardContent className="p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold mb-6">
                  Por que escolher o BarberPro?
                </h2>
                <p className="text-muted-foreground mb-8">
                  Nossa plataforma foi desenvolvida especificamente para barbearias, 
                  com foco na praticidade e resultados reais para o seu negócio.
                </p>
                <ul className="space-y-4">
                  {benefits.map((benefit) => (
                    <li key={benefit} className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  <Button asChild data-testid="button-create-account">
                    <a href="/api/login">Criar Conta Gratuita</a>
                  </Button>
                </div>
              </div>
              <div className="relative">
                <div className="aspect-square rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <div className="text-center p-8">
                    <div className="text-6xl font-bold text-primary mb-2">+500</div>
                    <div className="text-muted-foreground">Barbearias ativas</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
            <h2 className="text-3xl font-bold mb-4">
              Transforme sua Barbearia Agora
            </h2>
            <p className="text-foreground/70 mb-8 max-w-2xl mx-auto">
              Comece em minutos e veja os resultados imediatamente. 
              Sem cadastro de cartão, sem compromisso.
            </p>
            <Button size="lg" asChild data-testid="button-cta-start">
              <a href="/api/login">
                Acessar Agora
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-primary/10 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <img src={teixeiraLogoPath} alt="Teixeira" className="h-8 w-auto" />
            <p className="text-sm text-foreground/50">
              2024 Teixeira Barbearia. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
