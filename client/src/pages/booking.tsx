import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  MapPin,
  Phone,
  Scissors,
  User,
  Calendar as CalendarIcon,
  CheckCircle,
  Sparkles,
  Heart,
} from "lucide-react";
import { format, addDays, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Barbershop, Service, Barber } from "@shared/schema";
import teixeiraLogoPath from "@assets/image_1766152163278.png";

type BookingStep = "service" | "barber" | "datetime" | "info" | "confirm";

export default function Booking() {
  const { slug } = useParams();
  const [step, setStep] = useState<BookingStep>("service");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [isConfirmed, setIsConfirmed] = useState(false);
  const { toast } = useToast();

  const { data: barbershop, isLoading: barbershopLoading } = useQuery<Barbershop>({
    queryKey: ["/api/barbershops", slug],
    enabled: !!slug,
  });

  const { data: services, isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ["/api/barbershops", slug, "services"],
    enabled: !!slug,
  });

  const { data: barbers, isLoading: barbersLoading } = useQuery<Barber[]>({
    queryKey: ["/api/barbershops", slug, "barbers"],
    enabled: !!slug,
  });

  const formatCurrency = (value: number | string | null) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(num || 0);
  };

  const timeSlots = [
    "08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
    "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
    "14:00", "14:30", "15:00", "15:30", "16:00", "16:30",
    "17:00", "17:30", "18:00", "18:30", "19:00",
  ];

  const handleConfirm = () => {
    if (!clientName || !clientPhone) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }
    setIsConfirmed(true);
  };

  const goBack = () => {
    switch (step) {
      case "barber":
        setStep("service");
        break;
      case "datetime":
        setStep("barber");
        break;
      case "info":
        setStep("datetime");
        break;
      case "confirm":
        setStep("info");
        break;
    }
  };

  const goNext = () => {
    switch (step) {
      case "service":
        if (selectedService) setStep("barber");
        break;
      case "barber":
        if (selectedBarber) setStep("datetime");
        break;
      case "datetime":
        if (selectedTime) setStep("info");
        break;
      case "info":
        if (clientName && clientPhone) setStep("confirm");
        break;
    }
  };

  if (isConfirmed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/10 rounded-full blur-2xl" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-white">
                  <CheckCircle className="h-10 w-10" />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-3xl font-bold mb-2">Perfeito!</h2>
              <p className="text-foreground/60">
                Seu agendamento foi confirmado com sucesso!
              </p>
            </div>

            <Card className="bg-card/50 border-primary/20">
              <CardContent className="p-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3 pb-3 border-b border-primary/10">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Scissors className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-foreground/60">Serviço</p>
                      <p className="font-semibold">{selectedService?.name}</p>
                    </div>
                    <span className="text-primary font-bold">{formatCurrency(selectedService?.price)}</span>
                  </div>

                  <div className="flex items-center gap-3 pb-3 border-b border-primary/10">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-foreground/60">Profissional</p>
                      <p className="font-semibold">{selectedBarber?.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pb-3 border-b border-primary/10">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <CalendarIcon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-foreground/60">Data e Hora</p>
                      <p className="font-semibold">{format(selectedDate, "dd/MM/yyyy")} às {selectedTime}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Heart className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-foreground/60">Cliente</p>
                      <p className="font-semibold">{clientName}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm text-foreground/70">
                  🔔 Você receberá uma confirmação por WhatsApp em breve
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={() => {
                setIsConfirmed(false);
                setStep("service");
                setSelectedService(null);
                setSelectedBarber(null);
                setSelectedTime(null);
                setClientName("");
                setClientPhone("");
              }}
              variant="outline"
              className="w-full"
              data-testid="button-new-booking"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Fazer Novo Agendamento
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const stepTitles = {
    service: "Escolha seu Serviço",
    barber: "Escolha seu Profissional",
    datetime: "Escolha Data e Horário",
    info: "Seus Dados",
    confirm: "Confirme seu Agendamento",
  };

  const stepDescriptions = {
    service: "Qual serviço você deseja?",
    barber: "Escolha seu profissional preferido",
    datetime: "Quando você quer vir?",
    info: "Como podemos encontrá-lo?",
    confirm: "Tudo certo para confirmar?",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header Premium */}
      <header className="sticky top-0 z-50 border-b border-primary/10 bg-background/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <img src={teixeiraLogoPath} alt="Teixeira" className="h-12 w-auto" />
            <div className="text-right">
              <h1 className="font-semibold text-foreground">{barbershop?.name}</h1>
              {barbershop?.phone && (
                <p className="text-xs text-foreground/60 flex items-center gap-1 justify-end">
                  <Phone className="h-3 w-3" />
                  {barbershop.phone}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Step Indicator - Premium */}
        <div className="mb-12">
          <div className="flex items-center gap-2 justify-between mb-6">
            {(["service", "barber", "datetime", "info", "confirm"] as BookingStep[]).map((s, i) => {
              const stepIndex = (["service", "barber", "datetime", "info", "confirm"] as BookingStep[]).indexOf(step);
              const isActive = s === step;
              const isCompleted = i < stepIndex;

              return (
                <div key={s} className="flex-1 flex items-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-primary to-primary/80 text-background ring-2 ring-primary/30 scale-110"
                        : isCompleted
                        ? "bg-green-500/20 text-green-400 ring-1 ring-green-500/30"
                        : "bg-card border border-primary/20 text-foreground/50"
                    }`}
                  >
                    {isCompleted ? <Check className="h-5 w-5" /> : i + 1}
                  </div>
                  {i < 4 && (
                    <div
                      className={`flex-1 h-1 mx-2 rounded-full transition-all ${
                        isCompleted ? "bg-green-500/30" : "bg-card"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="text-center">
            <h2 className="text-3xl font-bold mb-2">{stepTitles[step]}</h2>
            <p className="text-foreground/60">{stepDescriptions[step]}</p>
          </div>
        </div>

        {/* Service Selection */}
        {step === "service" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {servicesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-48" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {services?.filter((s) => s.isActive).map((service) => (
                  <div
                    key={service.id}
                    className={`group cursor-pointer transition-all duration-300 ${
                      selectedService?.id === service.id ? "scale-105" : "hover:scale-102"
                    }`}
                    onClick={() => setSelectedService(service)}
                  >
                    <Card
                      className={`h-full overflow-hidden transition-all duration-300 ${
                        selectedService?.id === service.id
                          ? "ring-2 ring-primary shadow-lg shadow-primary/20"
                          : "hover:shadow-lg hover:shadow-primary/10 hover-elevate"
                      }`}
                      data-testid={`card-service-${service.id}`}
                    >
                      <div className="relative h-32 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity">
                          <Scissors className="h-16 w-16 text-primary absolute top-2 left-2 rotate-12" />
                        </div>
                        {selectedService?.id === service.id && (
                          <div className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-white">
                            <Check className="h-4 w-4" />
                          </div>
                        )}
                      </div>

                      <CardContent className="p-5">
                        <h3 className="font-bold text-lg mb-2">{service.name}</h3>
                        {service.description && (
                          <p className="text-sm text-foreground/60 mb-4">{service.description}</p>
                        )}

                        <div className="flex items-center justify-between pt-4 border-t border-primary/10">
                          <div className="flex items-center gap-2 text-foreground/60">
                            <Clock className="h-4 w-4" />
                            <span className="text-sm">{service.duration} min</span>
                          </div>
                          <span className="text-2xl font-bold text-primary">{formatCurrency(service.price)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Barber Selection */}
        {step === "barber" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {barbersLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-48" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {barbers?.filter((b) => b.isActive).map((barber) => (
                  <div
                    key={barber.id}
                    className={`group cursor-pointer transition-all duration-300 ${
                      selectedBarber?.id === barber.id ? "scale-105" : "hover:scale-102"
                    }`}
                    onClick={() => setSelectedBarber(barber)}
                  >
                    <Card
                      className={`h-full overflow-hidden transition-all duration-300 ${
                        selectedBarber?.id === barber.id
                          ? "ring-2 ring-primary shadow-lg shadow-primary/20"
                          : "hover:shadow-lg hover:shadow-primary/10 hover-elevate"
                      }`}
                      data-testid={`card-barber-${barber.id}`}
                    >
                      <div className="relative h-40 bg-gradient-to-br from-primary/30 to-primary/5 flex items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity" />
                        <Avatar className="h-24 w-24 relative z-10 border-4 border-background">
                          <AvatarImage src={barber.photoUrl || ""} className="object-cover" />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-background text-xl font-bold">
                            {barber.name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        {selectedBarber?.id === barber.id && (
                          <div className="absolute top-3 right-3 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-white">
                            <Check className="h-4 w-4" />
                          </div>
                        )}
                      </div>

                      <CardContent className="p-5 text-center">
                        <h3 className="font-bold text-lg mb-1">{barber.name}</h3>
                        {barber.bio && <p className="text-sm text-foreground/60">{barber.bio}</p>}
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Date & Time Selection */}
        {step === "datetime" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <Card className="border-primary/20">
                  <CardContent className="p-4">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      disabled={(date) => date < new Date()}
                      className="rounded-md border-0 [&_.rdp-head_cell]:text-primary [&_.rdp-cell_button.rdp-day_selected]:bg-primary/20 [&_.rdp-cell_button.rdp-day_selected]:text-primary [&_.rdp-cell_button:hover]:bg-primary/10"
                      locale={ptBR}
                    />
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-2">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold mb-4 text-foreground/70">
                      {`Horários disponíveis em ${format(selectedDate, "EEEE, dd 'de' MMMM", {
                        locale: ptBR,
                      })}`}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {timeSlots.map((time) => (
                      <Button
                        key={time}
                        variant={selectedTime === time ? "default" : "outline"}
                        className={`transition-all ${
                          selectedTime === time
                            ? "bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/30 scale-105"
                            : "hover:border-primary/40 hover:bg-primary/5"
                        }`}
                        onClick={() => setSelectedTime(time)}
                        data-testid={`button-time-${time}`}
                      >
                        {time}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Client Info */}
        {step === "info" && (
          <div className="max-w-2xl mx-auto animate-in fade-in duration-300">
            <Card className="border-primary/20">
              <CardContent className="p-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground/80">Nome Completo</label>
                  <Input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Seu nome"
                    className="border-primary/20 bg-card/50 focus:bg-card h-12"
                    data-testid="input-client-name"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground/80">WhatsApp</label>
                  <Input
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="border-primary/20 bg-card/50 focus:bg-card h-12"
                    data-testid="input-client-phone"
                  />
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 text-sm text-foreground/70 flex gap-3">
                  <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <p>Utilizaremos estas informações para confirmar seu agendamento por WhatsApp</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Confirmation */}
        {step === "confirm" && (
          <div className="max-w-2xl mx-auto animate-in fade-in duration-300">
            <div className="space-y-4">
              <Card className="border-primary/20 overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-primary to-primary/50" />
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-4 pb-4 border-b border-primary/10">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                      <Scissors className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground/60">Serviço</p>
                      <p className="font-bold text-lg">{selectedService?.name}</p>
                      <p className="text-sm text-foreground/50">{selectedService?.duration} min</p>
                    </div>
                    <span className="text-2xl font-bold text-primary flex-shrink-0">
                      {formatCurrency(selectedService?.price)}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 pb-4 border-b border-primary/10">
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarImage src={selectedBarber?.photoUrl || ""} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {selectedBarber?.name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm text-foreground/60">Profissional</p>
                      <p className="font-bold">{selectedBarber?.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pb-4 border-b border-primary/10">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                      <CalendarIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm text-foreground/60">Data e Hora</p>
                      <p className="font-bold">
                        {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                      </p>
                      <p className="text-primary font-semibold">{selectedTime}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                      <User className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm text-foreground/60">Cliente</p>
                      <p className="font-bold">{clientName}</p>
                      <p className="text-sm text-foreground/50">{clientPhone}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-sm text-green-400 flex gap-3">
                <Heart className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <p>Tudo pronto! Clique em confirmar para finalizar seu agendamento</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-3 mt-12 pb-8">
          {step !== "service" && (
            <Button
              variant="outline"
              onClick={goBack}
              className="border-primary/20 hover:bg-primary/5"
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          )}
          <Button
            className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:shadow-lg hover:shadow-primary/40 text-base h-12 font-semibold"
            onClick={step === "confirm" ? handleConfirm : goNext}
            disabled={
              (step === "service" && !selectedService) ||
              (step === "barber" && !selectedBarber) ||
              (step === "datetime" && !selectedTime) ||
              (step === "info" && (!clientName || !clientPhone))
            }
            data-testid="button-next"
          >
            {step === "confirm" ? (
              <>
                <Check className="h-5 w-5 mr-2" />
                Confirmar Agendamento
              </>
            ) : (
              <>
                Continuar
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}
