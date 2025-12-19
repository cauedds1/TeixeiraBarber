import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Scissors,
  Clock,
  Star,
  ArrowRight,
  MapPin,
  Phone,
} from "lucide-react";
import teixeiraLogoPath from "@assets/image_1766152163278.png";

const barbers = [
  {
    name: "Fran",
    bio: "Especialista em cortes modernos",
    initials: "FR",
  },
  {
    name: "Jefferson",
    bio: "Mestre em design capilar",
    initials: "JF",
  },
  {
    name: "Jean",
    bio: "Artista em barbearia clássica",
    initials: "JN",
  },
];

const services = [
  {
    name: "Corte Masculino",
    duration: "30 min",
    price: "R$ 55",
  },
  {
    name: "Corte e Barba",
    duration: "1h",
    price: "R$ 92",
  },
  {
    name: "Barba",
    duration: "30 min",
    price: "R$ 49",
  },
  {
    name: "Corte e Máquina",
    duration: "1h",
    price: "R$ 75",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header Premium */}
      <header className="sticky top-0 z-50 border-b border-primary/10 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <img src={teixeiraLogoPath} alt="Teixeira Barbearia" className="h-12 w-auto mix-blend-mode-multiply" style={{ mixBlendMode: 'multiply' }} />
            <div className="flex gap-3">
              <Button asChild variant="outline" size="lg" data-testid="button-login">
                <a href="/api/auth/login">
                  Entrar
                </a>
              </Button>
              <Button asChild size="lg" className="bg-gradient-to-r from-primary to-primary/80" data-testid="button-booking">
                <a href="/book/teixeira">
                  Agendar Agora
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative py-20 sm:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-primary/5" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="max-w-3xl mx-auto text-center space-y-8">
              <div className="flex justify-center mb-6">
                <img src={teixeiraLogoPath} alt="Teixeira Barbearia" className="h-40 w-auto" style={{ mixBlendMode: 'multiply' }} />
              </div>

              <div className="space-y-4">
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight">
                  Bem-vindo à{" "}
                  <span className="text-primary">Teixeira</span>
                </h1>
                <p className="text-xl sm:text-2xl text-foreground/70 max-w-2xl mx-auto">
                  Onde a tradição encontra a modernidade. Seus barbeiros preferidos, sempre prontos para transformar seu visual.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Button size="lg" asChild className="bg-gradient-to-r from-primary to-primary/80 text-base h-12 shadow-lg shadow-primary/30" data-testid="button-booking-cta">
                  <a href="/book/teixeira">
                    Agendar Agora
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </div>

              {/* Quick Info */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-8 border-t border-primary/10">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary mb-1">3</div>
                  <p className="text-sm text-foreground/60">Profissionais</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary mb-1">4+</div>
                  <p className="text-sm text-foreground/60">Serviços</p>
                </div>
                <div className="text-center col-span-2 sm:col-span-1">
                  <div className="text-3xl font-bold text-primary mb-1">24/7</div>
                  <p className="text-sm text-foreground/60">Agendamento</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Barbeiros */}
        <section className="py-20 bg-card/30 border-y border-primary/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4">Conheça Nossa Equipe</h2>
              <p className="text-lg text-foreground/60 max-w-2xl mx-auto">
                Profissionais experientes prontos para cuidar do seu visual
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {barbers.map((barber) => (
                <Card key={barber.name} className="overflow-hidden border-primary/20 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover-elevate">
                  <div className="relative h-48 bg-gradient-to-br from-primary/30 to-primary/5 flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 opacity-30" />
                    <Avatar className="h-32 w-32 relative z-10 border-4 border-background">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-background text-2xl font-bold text-xl">
                        {barber.initials}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <CardContent className="p-6 text-center space-y-3">
                    <div>
                      <h3 className="text-2xl font-bold">{barber.name}</h3>
                      <p className="text-foreground/60 mt-1">{barber.bio}</p>
                    </div>
                    <div className="flex items-center justify-center gap-1 text-primary">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-current" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Serviços */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4">Nossos Serviços</h2>
              <p className="text-lg text-foreground/60 max-w-2xl mx-auto">
                Qualidade e excelência em cada detalhe
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {services.map((service) => (
                <Card key={service.name} className="overflow-hidden border-primary/20 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover-elevate">
                  <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Scissors className="h-16 w-16 text-primary/40" />
                  </div>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold">{service.name}</h3>
                      <div className="flex items-center justify-between pt-4 border-t border-primary/10">
                        <div className="flex items-center gap-2 text-foreground/60">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm">{service.duration}</span>
                        </div>
                        <span className="text-2xl font-bold text-primary">{service.price}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Localização */}
        <section className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <Card className="border-primary/20 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-primary to-primary/50" />
              <CardContent className="p-8 space-y-6">
                <h2 className="text-3xl font-bold text-center">Visite-nos</h2>
                
                <div className="grid sm:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0 mt-1">
                        <MapPin className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm text-foreground/60">Localização</p>
                        <p className="font-semibold text-lg">Rua Rosa, 430, Sala 03</p>
                        <p className="text-foreground/70">Kobrasol, São José - SC</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0 mt-1">
                        <Phone className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-sm text-foreground/60">Contato</p>
                        <p className="font-semibold text-lg">(48) 3261-2310</p>
                        <p className="text-foreground/70">Seg-Sab: 09:00 às 20:00</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 space-y-3">
                      <h3 className="font-semibold text-lg">Por que agendar online?</h3>
                      <ul className="space-y-2 text-sm text-foreground/70">
                        <li className="flex gap-2">
                          <span className="text-primary">✓</span>
                          <span>Rápido e fácil</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="text-primary">✓</span>
                          <span>Sem fila de espera</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="text-primary">✓</span>
                          <span>Confirmação por WhatsApp</span>
                        </li>
                        <li className="flex gap-2">
                          <span className="text-primary">✓</span>
                          <span>Agendamento 24/7</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Final */}
        <section className="py-20 bg-gradient-to-br from-primary/10 via-transparent to-primary/5">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">
              Pronto para seu novo visual?
            </h2>
            <p className="text-xl text-foreground/70 mb-8">
              Agende agora mesmo e prepare-se para sair daqui transformado
            </p>
            <Button size="lg" asChild className="bg-gradient-to-r from-primary to-primary/80 text-base h-12 shadow-lg shadow-primary/30" data-testid="button-final-cta">
              <a href="/book/teixeira">
                Agendar Agora
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-primary/10 py-8 bg-card/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <img src={teixeiraLogoPath} alt="Teixeira Barbearia" className="h-10 w-auto" style={{ mixBlendMode: 'multiply' }} />
            <p className="text-sm text-foreground/50">
              © 2024 Teixeira Barbearia. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
