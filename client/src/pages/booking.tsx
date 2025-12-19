import { useState } from "react";
import { useParams } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
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
  Phone,
  Scissors,
  User,
  Calendar as CalendarIcon,
  CheckCircle,
  Sparkles,
} from "lucide-react";
import { format, addDays } from "date-fns";
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
    const steps: BookingStep[] = ["service", "barber", "datetime", "info", "confirm"];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  const canGoNext = () => {
    switch (step) {
      case "service":
        return !!selectedService;
      case "barber":
        return !!selectedBarber;
      case "datetime":
        return !!selectedTime;
      case "info":
        return !!clientName && !!clientPhone;
      default:
        return true;
    }
  };

  const goNext = () => {
    if (!canGoNext()) return;
    const steps: BookingStep[] = ["service", "barber", "datetime", "info", "confirm"];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  if (isConfirmed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
        <header className="border-b border-primary/10 bg-background/80 backdrop-blur-xl">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <img src={teixeiraLogoPath} alt="Teixeira" className="h-10 w-auto" style={{ mixBlendMode: 'multiply' }} />
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-8">
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
                <p className="text-foreground/60">Seu agendamento foi confirmado</p>
              </div>

              <Card className="bg-card/50 border-primary/20">
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-3 text-left">
                    <div className="flex items-start gap-3">
                      <Scissors className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-foreground/60">Serviço</p>
                        <p className="font-semibold">{selectedService?.name}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <User className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-foreground/60">Profissional</p>
                        <p className="font-semibold">{selectedBarber?.name}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <CalendarIcon className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-foreground/60">Data e Hora</p>
                        <p className="font-semibold">{format(selectedDate, "dd/MM/yyyy")} às {selectedTime}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm text-foreground/70 flex gap-2">
                    <Sparkles className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <p>Confirmação enviada por WhatsApp</p>
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
                className="w-full bg-gradient-to-r from-primary to-primary/80 hover:shadow-lg hover:shadow-primary/30 text-background font-semibold"
              >
                Novo Agendamento
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const stepTitles: Record<BookingStep, string> = {
    service: "Qual serviço?",
    barber: "Quem vai te atender?",
    datetime: "Quando você quer vir?",
    info: "Seus dados",
    confirm: "Confirmar",
  };

  const steps: BookingStep[] = ["service", "barber", "datetime", "info", "confirm"];
  const currentStepIndex = steps.indexOf(step);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
      {/* Header */}
      <header className="border-b border-primary/10 bg-background/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <img src={teixeiraLogoPath} alt="Teixeira" className="h-10 w-auto" style={{ mixBlendMode: 'multiply' }} />
          {barbershop?.phone && (
            <p className="text-xs text-foreground/60 flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {barbershop.phone}
            </p>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center gap-1 mb-6">
            {steps.map((s, i) => {
              const isActive = s === step;
              const isCompleted = i < currentStepIndex;

              return (
                <div key={s} className="flex-1 flex items-center gap-1">
                  <div
                    className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-primary text-background ring-2 ring-primary/30"
                        : isCompleted
                        ? "bg-primary/30 text-primary"
                        : "bg-card border border-primary/20 text-foreground/50"
                    }`}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : i + 1}
                  </div>
                  {i < steps.length - 1 && (
                    <div
                      className={`flex-1 h-1 rounded-full transition-all ${
                        isCompleted ? "bg-primary/30" : "bg-card"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <h2 className="text-2xl font-bold text-center">{stepTitles[step]}</h2>
        </div>

        {/* Content Area */}
        <div className="mb-8">
          {/* Service Selection */}
          {step === "service" && (
            <div className="space-y-3 animate-in fade-in duration-300">
              {servicesLoading ? (
                <>
                  <Skeleton className="h-24" />
                  <Skeleton className="h-24" />
                </>
              ) : services && services.length > 0 ? (
                services.map((service) => (
                  <div
                    key={service.id}
                    onClick={() => setSelectedService(service)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedService?.id === service.id
                        ? "border-primary bg-primary/5 shadow-lg shadow-primary/20"
                        : "border-primary/20 hover:border-primary/40 hover:bg-card/50 hover-elevate"
                    }`}
                    data-testid={`card-service-${service.id}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="font-semibold">{service.name}</h3>
                        {service.description && (
                          <p className="text-sm text-foreground/60 mt-1">{service.description}</p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-primary">{formatCurrency(service.price)}</p>
                        <p className="text-xs text-foreground/50">{service.duration}min</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-foreground/60">
                  <p>Nenhum serviço disponível</p>
                </div>
              )}
            </div>
          )}

          {/* Barber Selection */}
          {step === "barber" && (
            <div className="space-y-3 animate-in fade-in duration-300">
              {barbersLoading ? (
                <>
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                </>
              ) : barbers && barbers.length > 0 ? (
                barbers.map((barber) => (
                  <div
                    key={barber.id}
                    onClick={() => setSelectedBarber(barber)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all flex items-center gap-4 ${
                      selectedBarber?.id === barber.id
                        ? "border-primary bg-primary/5 shadow-lg shadow-primary/20"
                        : "border-primary/20 hover:border-primary/40 hover:bg-card/50 hover-elevate"
                    }`}
                    data-testid={`card-barber-${barber.id}`}
                  >
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarImage src={barber.photoUrl || ""} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {barber.name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-semibold">{barber.name}</h3>
                      {barber.bio && <p className="text-sm text-foreground/60">{barber.bio}</p>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-foreground/60">
                  <p>Nenhum profissional disponível</p>
                </div>
              )}
            </div>
          )}

          {/* Date & Time Selection */}
          {step === "datetime" && (
            <div className="space-y-6 animate-in fade-in duration-300">
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

              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground/70">
                  {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.map((time) => (
                    <Button
                      key={time}
                      variant={selectedTime === time ? "default" : "outline"}
                      size="sm"
                      className={`transition-all ${
                        selectedTime === time
                          ? "bg-primary text-background font-semibold"
                          : "hover:border-primary/40"
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
          )}

          {/* Client Info */}
          {step === "info" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div>
                <label className="text-sm font-semibold text-foreground/80 block mb-2">Nome</label>
                <Input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Seu nome completo"
                  className="border-primary/20 bg-card/50 h-11"
                  data-testid="input-client-name"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-foreground/80 block mb-2">WhatsApp</label>
                <Input
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="border-primary/20 bg-card/50 h-11"
                  data-testid="input-client-phone"
                />
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm text-foreground/70 flex gap-2 mt-4">
                <Sparkles className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                <p>Receberá confirmação por WhatsApp</p>
              </div>
            </div>
          )}

          {/* Confirmation */}
          {step === "confirm" && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <Card className="border-primary/20">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start gap-4 pb-4 border-b border-primary/10">
                    <Scissors className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-foreground/60">Serviço</p>
                      <p className="font-semibold">{selectedService?.name}</p>
                      <p className="text-xs text-foreground/50 mt-1">{formatCurrency(selectedService?.price ?? 0)}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 pb-4 border-b border-primary/10">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage src={selectedBarber?.photoUrl || ""} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                        {selectedBarber?.name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm text-foreground/60">Profissional</p>
                      <p className="font-semibold">{selectedBarber?.name}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <CalendarIcon className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-foreground/60">Data e Hora</p>
                      <p className="font-semibold">{format(selectedDate, "dd/MM/yyyy")}</p>
                      <p className="text-primary font-semibold">{selectedTime}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 sticky bottom-4">
          {currentStepIndex > 0 && (
            <Button
              variant="outline"
              onClick={goBack}
              className="flex-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          )}
          <Button
            onClick={step === "confirm" ? handleConfirm : goNext}
            disabled={!canGoNext()}
            className={`flex-1 ${
              step === "confirm"
                ? "bg-gradient-to-r from-primary to-primary/80 text-background font-semibold hover:shadow-lg hover:shadow-primary/30"
                : ""
            }`}
          >
            {step === "confirm" ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Confirmar
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
