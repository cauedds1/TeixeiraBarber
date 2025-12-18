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
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
                B
              </div>
              <span className="font-semibold text-lg">BarberPro</span>
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
        <section className="relative py-20 sm:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="max-w-3xl mx-auto text-center">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                Gerencie sua barbearia com{" "}
                <span className="text-primary">eficiência</span>
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
                Sistema completo de gestão para barbearias. Agendamento online, 
                controle financeiro, gestão de equipe e muito mais em uma única plataforma.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" asChild data-testid="button-start-free">
                  <a href="/api/login">
                    Começar Grátis
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

        <section className="py-20 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Tudo que você precisa</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
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

        <section className="py-20 bg-primary text-primary-foreground">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Pronto para transformar sua barbearia?
            </h2>
            <p className="text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
              Comece gratuitamente e veja os resultados em poucos dias. 
              Sem compromisso, cancele quando quiser.
            </p>
            <Button size="lg" variant="secondary" asChild data-testid="button-cta-start">
              <a href="/api/login">
                Começar Agora
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                B
              </div>
              <span className="font-semibold">BarberPro</span>
            </div>
            <p className="text-sm text-muted-foreground">
              2024 BarberPro. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
