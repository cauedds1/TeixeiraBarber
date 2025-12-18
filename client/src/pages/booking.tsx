import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { format, addDays, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Barbershop, Service, Barber } from "@shared/schema";

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
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10 text-green-600 mx-auto mb-6">
              <CheckCircle className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Agendamento Confirmado!</h2>
            <p className="text-muted-foreground mb-6">
              Você receberá uma confirmação por WhatsApp em breve.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2 mb-6">
              <p className="flex justify-between">
                <span className="text-muted-foreground">Serviço:</span>
                <span className="font-medium">{selectedService?.name}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-muted-foreground">Profissional:</span>
                <span className="font-medium">{selectedBarber?.name}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-muted-foreground">Data:</span>
                <span className="font-medium">
                  {format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}
                </span>
              </p>
              <p className="flex justify-between">
                <span className="text-muted-foreground">Horário:</span>
                <span className="font-medium">{selectedTime}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-muted-foreground">Valor:</span>
                <span className="font-bold text-primary">{formatCurrency(selectedService?.price)}</span>
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setIsConfirmed(false);
                setStep("service");
                setSelectedService(null);
                setSelectedBarber(null);
                setSelectedTime(null);
                setClientName("");
                setClientPhone("");
              }}
              data-testid="button-new-booking"
            >
              Fazer Novo Agendamento
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
              {barbershop?.name?.[0] || "B"}
            </div>
            <div>
              <h1 className="font-semibold">{barbershop?.name || "Barbearia"}</h1>
              {barbershop?.address && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {barbershop.address}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          {["service", "barber", "datetime", "info", "confirm"].map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-shrink-0">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                  step === s
                    ? "bg-primary text-primary-foreground"
                    : i < ["service", "barber", "datetime", "info", "confirm"].indexOf(step)
                    ? "bg-green-500 text-white"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i < ["service", "barber", "datetime", "info", "confirm"].indexOf(step) ? (
                  <Check className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </div>
              {i < 4 && <div className="w-8 h-0.5 bg-muted" />}
            </div>
          ))}
        </div>

        {step === "service" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Escolha o Serviço</h2>
            {servicesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {services?.filter((s) => s.isActive).map((service) => (
                  <Card
                    key={service.id}
                    className={`cursor-pointer transition-all ${
                      selectedService?.id === service.id
                        ? "ring-2 ring-primary"
                        : "hover-elevate"
                    }`}
                    onClick={() => setSelectedService(service)}
                    data-testid={`card-service-${service.id}`}
                  >
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Scissors className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">{service.name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {service.duration} min
                          </div>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-primary">
                        {formatCurrency(service.price)}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {step === "barber" && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Escolha o Profissional</h2>
            {barbersLoading ? (
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {barbers?.filter((b) => b.isActive).map((barber) => (
                  <Card
                    key={barber.id}
                    className={`cursor-pointer transition-all ${
                      selectedBarber?.id === barber.id
                        ? "ring-2 ring-primary"
                        : "hover-elevate"
                    }`}
                    onClick={() => setSelectedBarber(barber)}
                    data-testid={`card-barber-${barber.id}`}
                  >
                    <CardContent className="p-4 text-center">
                      <Avatar className="h-16 w-16 mx-auto mb-2">
                        <AvatarImage src={barber.photoUrl || ""} />
                        <AvatarFallback className="bg-primary/10 text-primary text-lg">
                          {barber.name?.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <p className="font-medium">{barber.name}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {step === "datetime" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Escolha Data e Horário</h2>
            <Card>
              <CardContent className="p-4">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  disabled={(date) => date < new Date()}
                  className="rounded-md border-0"
                  locale={ptBR}
                />
              </CardContent>
            </Card>
            <div>
              <p className="text-sm font-medium mb-3">
                Horários disponíveis em {format(selectedDate, "dd/MM", { locale: ptBR })}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {timeSlots.map((time) => (
                  <Button
                    key={time}
                    variant={selectedTime === time ? "default" : "outline"}
                    size="sm"
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

        {step === "info" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Seus Dados</h2>
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome Completo</label>
                  <Input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Seu nome"
                    data-testid="input-client-name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">WhatsApp</label>
                  <Input
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    data-testid="input-client-phone"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Confirme seu Agendamento</h2>
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Scissors className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{selectedService?.name}</p>
                    <p className="text-sm text-muted-foreground">{selectedService?.duration} min</p>
                  </div>
                  <span className="text-lg font-bold text-primary">
                    {formatCurrency(selectedService?.price)}
                  </span>
                </div>
                <div className="flex items-center gap-3 pb-4 border-b">
                  <Avatar>
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {selectedBarber?.name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedBarber?.name}</p>
                    <p className="text-sm text-muted-foreground">Profissional</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 pb-4 border-b">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <CalendarIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
                    </p>
                    <p className="text-sm text-muted-foreground">{selectedTime}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">{clientName}</p>
                    <p className="text-sm text-muted-foreground">{clientPhone}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex gap-3 mt-8">
          {step !== "service" && (
            <Button variant="outline" onClick={goBack} data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          )}
          <Button
            className="flex-1"
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
                <Check className="h-4 w-4 mr-2" />
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
