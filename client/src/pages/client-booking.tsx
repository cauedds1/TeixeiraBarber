import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Scissors,
  User,
  CalendarDays,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Phone,
} from "lucide-react";
import { format, addDays, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Barbershop, Service, Barber } from "@shared/schema";

const STEPS = [
  { id: 1, label: "Serviço", icon: Scissors },
  { id: 2, label: "Profissional", icon: User },
  { id: 3, label: "Data", icon: CalendarDays },
  { id: 4, label: "Horário", icon: Clock },
  { id: 5, label: "Confirmar", icon: CheckCircle2 },
];

export default function ClientBooking() {
  const [, params] = useRoute("/agendar/:slug");
  const slug = params?.slug || "";
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [booked, setBooked] = useState(false);

  const { data: barbershop, isLoading: barbershopLoading } = useQuery<Barbershop>({
    queryKey: ["/api/public/barbershops", slug],
    queryFn: async () => {
      const res = await fetch(`/api/public/barbershops/${slug}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!slug,
  });

  const { data: services = [] } = useQuery<Service[]>({
    queryKey: ["/api/public/barbershops", slug, "services"],
    queryFn: async () => {
      const res = await fetch(`/api/public/barbershops/${slug}/services`);
      if (!res.ok) throw new Error("Err");
      return res.json();
    },
    enabled: !!slug,
  });

  const { data: barbers = [] } = useQuery<Barber[]>({
    queryKey: ["/api/public/barbershops", slug, "barbers"],
    queryFn: async () => {
      const res = await fetch(`/api/public/barbershops/${slug}/barbers`);
      if (!res.ok) throw new Error("Err");
      return res.json();
    },
    enabled: !!slug,
  });

  const { data: availability, isLoading: slotsLoading } = useQuery<{ slots: string[] }>({
    queryKey: ["/api/public/barbershops", slug, "availability", selectedBarber?.id, selectedDate, selectedService?.id],
    queryFn: async () => {
      const params = new URLSearchParams({
        barberId: selectedBarber!.id,
        date: selectedDate,
        ...(selectedService ? { serviceId: selectedService.id } : {}),
      });
      const res = await fetch(`/api/public/barbershops/${slug}/availability?${params}`);
      if (!res.ok) throw new Error("Err");
      return res.json();
    },
    enabled: !!slug && !!selectedBarber && !!selectedDate,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/public/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erro ao criar agendamento");
      return res.json();
    },
    onSuccess: () => {
      setBooked(true);
    },
    onError: () => {
      toast({ title: "Erro ao agendar", description: "Tente novamente.", variant: "destructive" });
    },
  });

  const calendarDays = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: 14 }, (_, i) => {
      const d = addDays(today, i + 1);
      return { date: format(d, "yyyy-MM-dd"), day: d };
    });
  }, []);

  const calculateEndTime = (startTime: string, durationMinutes: number) => {
    const [h, m] = startTime.split(":").map(Number);
    const total = h * 60 + m + durationMinutes;
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  };

  const handleConfirm = () => {
    if (!clientName.trim() || !clientPhone.trim()) {
      toast({ title: "Preencha seus dados", variant: "destructive" });
      return;
    }
    const endTime = calculateEndTime(selectedTime, selectedService?.duration || 30);
    createMutation.mutate({
      slug,
      serviceId: selectedService!.id,
      barberId: selectedBarber!.id,
      date: selectedDate,
      startTime: selectedTime,
      endTime,
      clientName: clientName.trim(),
      clientPhone: clientPhone.trim(),
    });
  };

  const canAdvance = () => {
    switch (step) {
      case 1: return !!selectedService;
      case 2: return !!selectedBarber;
      case 3: return !!selectedDate;
      case 4: return !!selectedTime;
      case 5: return !!clientName.trim() && !!clientPhone.trim();
      default: return false;
    }
  };

  if (barbershopLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0e0e0e]">
        <Loader2 className="h-8 w-8 animate-spin text-[#C9A24D]" data-testid="loader-booking" />
      </div>
    );
  }

  if (!barbershop) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0e0e0e] gap-4">
        <h1 className="text-2xl font-bold text-white">Barbearia não encontrada</h1>
        <p className="text-white/40">Verifique o link e tente novamente.</p>
      </div>
    );
  }

  if (booked) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-10 w-10 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white mb-2" data-testid="text-booking-success">Agendamento Confirmado!</h1>
            <p className="text-white/40 text-sm">Seu horário foi reservado com sucesso.</p>
          </div>
          <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5 text-left space-y-3">
            <div className="flex justify-between">
              <span className="text-white/40 text-sm">Serviço</span>
              <span className="text-white text-sm font-medium">{selectedService?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40 text-sm">Profissional</span>
              <span className="text-white text-sm font-medium">{selectedBarber?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40 text-sm">Data</span>
              <span className="text-white text-sm font-medium">
                {selectedDate && format(new Date(selectedDate + "T12:00:00"), "dd/MM/yyyy")}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40 text-sm">Horário</span>
              <span className="text-[#C9A24D] text-sm font-bold">{selectedTime}</span>
            </div>
          </div>
          <Button
            className="w-full bg-[#C9A24D] hover:bg-[#b8912f] text-black font-semibold"
            onClick={() => {
              setBooked(false);
              setStep(1);
              setSelectedService(null);
              setSelectedBarber(null);
              setSelectedDate("");
              setSelectedTime("");
              setClientName("");
              setClientPhone("");
            }}
            data-testid="button-new-booking"
          >
            Fazer novo agendamento
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0e0e]">
      <div className="border-b border-white/5 bg-[#0e0e0e]/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-lg font-bold text-white" data-testid="text-barbershop-name">{barbershop.name}</h1>
          {barbershop.address && (
            <p className="text-xs text-white/30 flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3" /> {barbershop.address}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              <button
                onClick={() => s.id < step && setStep(s.id)}
                className={`flex flex-col items-center gap-1.5 transition-colors ${
                  s.id === step
                    ? "text-[#C9A24D]"
                    : s.id < step
                    ? "text-[#C9A24D]/60 cursor-pointer"
                    : "text-white/20"
                }`}
                disabled={s.id > step}
                data-testid={`step-${s.id}`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    s.id === step
                      ? "bg-[#C9A24D] text-black"
                      : s.id < step
                      ? "bg-[#C9A24D]/20 text-[#C9A24D]"
                      : "bg-white/5 text-white/20"
                  }`}
                >
                  <s.icon className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-medium hidden sm:block">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-px mx-2 ${
                    s.id < step ? "bg-[#C9A24D]/30" : "bg-white/5"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-3" data-testid="step-service-content">
            <h2 className="text-lg font-semibold text-white mb-4">Escolha o serviço</h2>
            {services.filter(s => s.isActive).map((service) => (
              <button
                key={service.id}
                onClick={() => { setSelectedService(service); setStep(2); }}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selectedService?.id === service.id
                    ? "bg-[#C9A24D]/10 border-[#C9A24D]/40"
                    : "bg-[#1a1a1a] border-white/5 hover:border-white/15"
                }`}
                data-testid={`card-service-${service.id}`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium text-white">{service.name}</p>
                    {service.description && (
                      <p className="text-xs text-white/40 mt-1 line-clamp-2">{service.description}</p>
                    )}
                    <p className="text-xs text-white/30 mt-1.5 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {service.duration} min
                    </p>
                  </div>
                  <span className="text-[#C9A24D] font-bold text-lg ml-4">
                    R$ {Number(service.price).toFixed(2)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3" data-testid="step-barber-content">
            <h2 className="text-lg font-semibold text-white mb-4">Escolha o profissional</h2>
            <button
              onClick={() => {
                const randomBarber = barbers[Math.floor(Math.random() * barbers.length)];
                if (randomBarber) { setSelectedBarber(randomBarber); setStep(3); }
              }}
              className={`w-full text-left p-4 rounded-xl border transition-all bg-[#1a1a1a] border-white/5 hover:border-[#C9A24D]/30`}
              data-testid="card-barber-any"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#C9A24D]/20 to-[#C9A24D]/5 border-2 border-[#C9A24D]/20 flex items-center justify-center">
                  <User className="h-6 w-6 text-[#C9A24D]" />
                </div>
                <div>
                  <p className="font-medium text-white">Qualquer profissional</p>
                  <p className="text-xs text-white/40 mt-0.5">Escolha automática do profissional disponível</p>
                </div>
              </div>
            </button>
            {barbers.map((barber) => (
              <button
                key={barber.id}
                onClick={() => { setSelectedBarber(barber); setStep(3); }}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selectedBarber?.id === barber.id
                    ? "bg-[#C9A24D]/10 border-[#C9A24D]/40"
                    : "bg-[#1a1a1a] border-white/5 hover:border-white/15"
                }`}
                data-testid={`card-barber-${barber.id}`}
              >
                <div className="flex items-center gap-4">
                  {barber.photoUrl ? (
                    <img src={barber.photoUrl} alt={barber.name} className="w-14 h-14 rounded-full object-cover border-2 border-[#C9A24D]/20" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-[#C9A24D]/10 border-2 border-[#C9A24D]/20 flex items-center justify-center">
                      <span className="text-[#C9A24D] font-bold text-lg">{barber.name[0]}</span>
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-white">{barber.name}</p>
                    {barber.bio && <p className="text-xs text-white/40 mt-0.5">{barber.bio}</p>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {step === 3 && (
          <div data-testid="step-date-content">
            <h2 className="text-lg font-semibold text-white mb-4">Escolha a data</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {calendarDays.map(({ date, day }) => {
                const dayOfWeek = format(day, "EEEEEE", { locale: ptBR });
                const dayNum = format(day, "dd");
                const monthName = format(day, "MMM", { locale: ptBR });
                return (
                  <button
                    key={date}
                    onClick={() => { setSelectedDate(date); setSelectedTime(""); setStep(4); }}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      selectedDate === date
                        ? "bg-[#C9A24D]/10 border-[#C9A24D]/40"
                        : "bg-[#1a1a1a] border-white/5 hover:border-white/15"
                    }`}
                    data-testid={`date-${date}`}
                  >
                    <p className="text-xs text-white/40 capitalize">{dayOfWeek}</p>
                    <p className="text-xl font-bold text-white mt-0.5">{dayNum}</p>
                    <p className="text-[10px] text-white/30 capitalize">{monthName}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 4 && (
          <div data-testid="step-time-content">
            <h2 className="text-lg font-semibold text-white mb-2">Escolha o horário</h2>
            <p className="text-sm text-white/30 mb-4">
              {selectedDate && format(new Date(selectedDate + "T12:00:00"), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
            {slotsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-[#C9A24D]" />
              </div>
            ) : availability && availability.slots.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {availability.slots.map((time) => (
                  <button
                    key={time}
                    onClick={() => { setSelectedTime(time); setStep(5); }}
                    className={`py-3 px-2 rounded-xl border text-center font-mono font-medium transition-all ${
                      selectedTime === time
                        ? "bg-[#C9A24D] text-black border-[#C9A24D]"
                        : "bg-[#1a1a1a] border-white/5 text-white hover:border-[#C9A24D]/30 hover:text-[#C9A24D]"
                    }`}
                    data-testid={`time-${time}`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Clock className="h-8 w-8 text-white/20 mx-auto mb-3" />
                <p className="text-white/40 text-sm">Nenhum horário disponível nesta data</p>
                <Button
                  variant="ghost"
                  className="mt-3 text-[#C9A24D] hover:text-[#C9A24D] hover:bg-[#C9A24D]/10"
                  onClick={() => setStep(3)}
                  data-testid="button-change-date"
                >
                  Escolher outra data
                </Button>
              </div>
            )}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-5" data-testid="step-confirm-content">
            <h2 className="text-lg font-semibold text-white mb-4">Confirme seu agendamento</h2>

            <div className="bg-[#1a1a1a] border border-white/10 rounded-xl p-5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-white/40 text-sm">Serviço</span>
                <span className="text-white text-sm font-medium">{selectedService?.name}</span>
              </div>
              <div className="h-px bg-white/5" />
              <div className="flex justify-between items-center">
                <span className="text-white/40 text-sm">Profissional</span>
                <span className="text-white text-sm font-medium">{selectedBarber?.name}</span>
              </div>
              <div className="h-px bg-white/5" />
              <div className="flex justify-between items-center">
                <span className="text-white/40 text-sm">Data</span>
                <span className="text-white text-sm font-medium">
                  {selectedDate && format(new Date(selectedDate + "T12:00:00"), "dd/MM/yyyy")}
                </span>
              </div>
              <div className="h-px bg-white/5" />
              <div className="flex justify-between items-center">
                <span className="text-white/40 text-sm">Horário</span>
                <span className="text-[#C9A24D] text-sm font-bold">{selectedTime}</span>
              </div>
              <div className="h-px bg-white/5" />
              <div className="flex justify-between items-center">
                <span className="text-white/40 text-sm">Valor</span>
                <span className="text-[#C9A24D] font-bold text-lg">
                  R$ {Number(selectedService?.price || 0).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm text-white/60 mb-1.5">Seu nome</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Digite seu nome completo"
                  className="w-full px-4 py-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-[#C9A24D]/50 transition-colors"
                  data-testid="input-name"
                />
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-1.5">WhatsApp</label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="(48) 99999-9999"
                  className="w-full px-4 py-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-[#C9A24D]/50 transition-colors"
                  data-testid="input-phone"
                />
              </div>
            </div>

            <Button
              onClick={handleConfirm}
              disabled={createMutation.isPending || !clientName.trim() || !clientPhone.trim()}
              className="w-full py-6 bg-[#C9A24D] hover:bg-[#b8912f] text-black font-bold text-base rounded-xl"
              data-testid="button-confirm-booking"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Agendando...
                </>
              ) : (
                "Confirmar Agendamento"
              )}
            </Button>
          </div>
        )}

        {step > 1 && (
          <div className="mt-6 flex justify-center">
            <Button
              variant="ghost"
              className="text-white/40 hover:text-white hover:bg-white/5"
              onClick={() => setStep(step - 1)}
              data-testid="button-back"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
