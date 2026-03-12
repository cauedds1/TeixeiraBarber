import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Scissors, User, CalendarDays, Clock, CheckCircle2,
  ChevronLeft, Phone, MessageCircle, Star, Sparkles, ArrowRight,
} from "lucide-react";
import { format, addDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Barbershop, Service, Barber } from "@shared/schema";
import teixeiraLogoPath from "@assets/image_1766152163278.png";

const WHATSAPP_NUMBER = "5548999505167";

const SERVICE_EMOJIS = ["✂️", "💈", "⚡", "🪒", "💇", "🧴", "🎨", "🔥"];
const STEP_COUNT = 5;

function ProgressBar({ step }: { step: number }) {
  const pct = ((step - 1) / (STEP_COUNT - 1)) * 100;
  return (
    <div className="h-0.5 bg-white/5 w-full">
      <div
        className="h-full bg-gradient-to-r from-[#C9A24D] to-[#e8c06a] transition-all duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function SummaryBar({
  step, service, barber, date, time, onClickService, onClickBarber, onClickDate, onClickTime,
}: {
  step: number;
  service: Service | null;
  barber: Barber | null;
  date: string;
  time: string;
  onClickService: () => void;
  onClickBarber: () => void;
  onClickDate: () => void;
  onClickTime: () => void;
}) {
  const hasAny = service || barber || date || time;
  if (!hasAny || step === 1) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#C9A24D]/15 bg-[#0a0a0a]/97 backdrop-blur-md">
      <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {service && (
          <button
            onClick={onClickService}
            className="flex-shrink-0 flex items-center gap-1.5 bg-[#C9A24D]/12 border border-[#C9A24D]/25 rounded-full px-3 py-1.5 text-xs text-[#C9A24D] font-medium hover:bg-[#C9A24D]/20 transition-colors"
            data-testid="summary-service"
          >
            <Scissors className="h-3 w-3" />
            {service.name}
          </button>
        )}
        {barber && (
          <button
            onClick={onClickBarber}
            className="flex-shrink-0 flex items-center gap-1.5 bg-[#C9A24D]/12 border border-[#C9A24D]/25 rounded-full px-3 py-1.5 text-xs text-[#C9A24D] font-medium hover:bg-[#C9A24D]/20 transition-colors"
            data-testid="summary-barber"
          >
            <User className="h-3 w-3" />
            {barber.name}
          </button>
        )}
        {date && (
          <button
            onClick={onClickDate}
            className="flex-shrink-0 flex items-center gap-1.5 bg-[#C9A24D]/12 border border-[#C9A24D]/25 rounded-full px-3 py-1.5 text-xs text-[#C9A24D] font-medium hover:bg-[#C9A24D]/20 transition-colors"
            data-testid="summary-date"
          >
            <CalendarDays className="h-3 w-3" />
            {format(new Date(date + "T12:00:00"), "EEE dd/MM", { locale: ptBR })}
          </button>
        )}
        {time && (
          <button
            onClick={onClickTime}
            className="flex-shrink-0 flex items-center gap-1.5 bg-[#C9A24D]/12 border border-[#C9A24D]/25 rounded-full px-3 py-1.5 text-xs text-[#C9A24D] font-medium hover:bg-[#C9A24D]/20 transition-colors"
            data-testid="summary-time"
          >
            <Clock className="h-3 w-3" />
            {time}
          </button>
        )}
      </div>
    </div>
  );
}

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
  const [confirming, setConfirming] = useState(false);

  const { data: barbershop, isLoading: barbershopLoading } = useQuery<Barbershop>({
    queryKey: ["/api/public/barbershops", slug],
    queryFn: async () => {
      const res = await fetch(`/api/public/barbershops/${slug}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!slug,
  });

  const { data: services = [], isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ["/api/public/barbershops", slug, "services"],
    queryFn: async () => {
      const res = await fetch(`/api/public/barbershops/${slug}/services`);
      if (!res.ok) throw new Error("Err");
      return res.json();
    },
    enabled: !!slug,
  });

  const { data: barbers = [], isLoading: barbersLoading } = useQuery<Barber[]>({
    queryKey: ["/api/public/barbershops", slug, "barbers"],
    queryFn: async () => {
      const res = await fetch(`/api/public/barbershops/${slug}/barbers`);
      if (!res.ok) throw new Error("Err");
      return res.json();
    },
    enabled: !!slug,
  });

  const { data: availability, isLoading: slotsLoading } = useQuery<{ slots: string[]; allSlots: string[] }>({
    queryKey: ["/api/public/barbershops", slug, "availability", selectedBarber?.id, selectedDate, selectedService?.id],
    queryFn: async () => {
      const p = new URLSearchParams({
        barberId: selectedBarber!.id,
        date: selectedDate,
        ...(selectedService ? { serviceId: selectedService.id } : {}),
      });
      const res = await fetch(`/api/public/barbershops/${slug}/availability?${p}`);
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
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Erro ao criar agendamento");
      }
      return res.json();
    },
    onSuccess: () => setBooked(true),
    onError: (e: any) => {
      toast({ title: "Erro ao agendar", description: e.message || "Tente novamente.", variant: "destructive" });
    },
  });

  const calendarDays = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: 30 }, (_, i) => {
      const d = addDays(today, i + 1);
      return { date: format(d, "yyyy-MM-dd"), day: d };
    });
  }, []);

  const activeServices = services.filter((s) => s.isActive);

  const calculateEndTime = (startTime: string, durationMinutes: number) => {
    const [h, m] = startTime.split(":").map(Number);
    const total = h * 60 + m + durationMinutes;
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  };

  const handleConfirm = () => {
    if (!clientName.trim() || !clientPhone.trim()) {
      toast({ title: "Preencha seu nome e WhatsApp", variant: "destructive" });
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

  const handleSelectService = (service: Service) => {
    setSelectedService(service);
    setTimeout(() => setStep(2), 200);
  };

  const handleSelectBarber = (barber: Barber) => {
    setSelectedBarber(barber);
    setTimeout(() => setStep(3), 200);
  };

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    setSelectedTime("");
    setTimeout(() => setStep(4), 200);
  };

  const handleSelectTime = (time: string) => {
    setSelectedTime(time);
    setTimeout(() => setStep(5), 200);
  };

  const hasSummaryBar = !booked && (selectedService || selectedBarber || selectedDate || selectedTime) && step > 1;

  if (barbershopLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0e0e0e]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#C9A24D]" data-testid="loader-booking" />
          <p className="text-white/30 text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!barbershop) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0e0e0e] gap-4 p-8">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-2">
          <Scissors className="h-7 w-7 text-white/20" />
        </div>
        <h1 className="text-xl font-bold text-white">Barbearia não encontrada</h1>
        <p className="text-white/40 text-sm text-center">Verifique o link e tente novamente.</p>
      </div>
    );
  }

  if (booked) {
    const whatsappMsg = encodeURIComponent(
      `Olá! Acabei de agendar um horário na Teixeira Barbearia.\n\nServiço: ${selectedService?.name}\nProfissional: ${selectedBarber?.name}\nData: ${selectedDate ? format(new Date(selectedDate + "T12:00:00"), "dd/MM/yyyy") : ""}\nHorário: ${selectedTime}\n\nNome: ${clientName}`
    );
    return (
      <div className="min-h-screen bg-[#0e0e0e] flex flex-col">
        <div className="border-b border-white/5 bg-[#0e0e0e]">
          <div className="max-w-lg mx-auto px-4 py-4 flex justify-center">
            <img src={teixeiraLogoPath} alt="Teixeira Barbearia" className="h-10 w-auto" style={{ filter: "brightness(1.1)" }} />
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md text-center space-y-8">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-[#C9A24D]/20 rounded-full blur-2xl scale-150" />
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#C9A24D]/30 to-[#C9A24D]/10 border border-[#C9A24D]/40 flex items-center justify-center">
                  <CheckCircle2 className="h-12 w-12 text-[#C9A24D]" />
                </div>
              </div>
            </div>

            <div>
              <h1 className="text-3xl font-bold text-white mb-2" data-testid="text-booking-success">
                Agendado!
              </h1>
              <p className="text-white/40">Seu horário está confirmado. Te esperamos!</p>
            </div>

            <div className="bg-[#151515] border border-white/8 rounded-2xl overflow-hidden text-left">
              <div className="px-5 py-4 border-b border-white/5">
                <p className="text-xs text-white/30 uppercase tracking-widest font-medium">Resumo do agendamento</p>
              </div>
              <div className="divide-y divide-white/5">
                <div className="px-5 py-3.5 flex justify-between items-center">
                  <span className="text-white/40 text-sm flex items-center gap-2">
                    <Scissors className="h-3.5 w-3.5" /> Serviço
                  </span>
                  <span className="text-white text-sm font-medium">{selectedService?.name}</span>
                </div>
                <div className="px-5 py-3.5 flex justify-between items-center">
                  <span className="text-white/40 text-sm flex items-center gap-2">
                    <User className="h-3.5 w-3.5" /> Profissional
                  </span>
                  <span className="text-white text-sm font-medium">{selectedBarber?.name}</span>
                </div>
                <div className="px-5 py-3.5 flex justify-between items-center">
                  <span className="text-white/40 text-sm flex items-center gap-2">
                    <CalendarDays className="h-3.5 w-3.5" /> Data
                  </span>
                  <span className="text-white text-sm font-medium capitalize">
                    {selectedDate && format(new Date(selectedDate + "T12:00:00"), "EEEE, dd/MM/yyyy", { locale: ptBR })}
                  </span>
                </div>
                <div className="px-5 py-3.5 flex justify-between items-center">
                  <span className="text-white/40 text-sm flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" /> Horário
                  </span>
                  <span className="text-[#C9A24D] font-bold">{selectedTime}</span>
                </div>
                <div className="px-5 py-3.5 flex justify-between items-center">
                  <span className="text-white/40 text-sm">Valor</span>
                  <span className="text-[#C9A24D] font-bold text-lg">
                    R$ {Number(selectedService?.price || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMsg}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366] font-medium hover:bg-[#25D366]/25 transition-colors"
                data-testid="button-whatsapp"
              >
                <MessageCircle className="h-5 w-5" />
                Confirmar pelo WhatsApp
              </a>
              <button
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
                className="w-full py-3.5 rounded-xl border border-white/10 text-white/50 text-sm hover:text-white hover:border-white/20 transition-colors"
                data-testid="button-new-booking"
              >
                Fazer novo agendamento
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0e0e] flex flex-col">
      <div className="sticky top-0 z-40 bg-[#0e0e0e]/98 backdrop-blur-sm border-b border-white/5">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                data-testid="button-back"
              >
                <ChevronLeft className="h-4 w-4 text-white/60" />
              </button>
            )}
            <img
              src={teixeiraLogoPath}
              alt="Teixeira Barbearia"
              className="h-9 w-auto"
              style={{ filter: "brightness(1.1)" }}
            />
          </div>
          {barbershop.phone && (
            <a
              href={`tel:${barbershop.phone}`}
              className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              <Phone className="h-3 w-3" />
              {barbershop.phone}
            </a>
          )}
        </div>
        <ProgressBar step={step} />
      </div>

      <div className={`flex-1 max-w-lg mx-auto w-full px-4 pt-8 ${hasSummaryBar ? "pb-24" : "pb-10"}`}>

        {step === 1 && (
          <div data-testid="step-service-content">
            <div className="mb-8">
              <p className="text-[#C9A24D] text-sm font-medium mb-1 flex items-center gap-1.5">
                <Scissors className="h-3.5 w-3.5" /> Passo 1 de 5
              </p>
              <h2 className="text-2xl font-bold text-white">Qual serviço?</h2>
              <p className="text-white/40 text-sm mt-1">Escolha o serviço que você quer realizar</p>
            </div>

            {servicesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : activeServices.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-4xl mb-3">✂️</div>
                <p className="text-white/40">Nenhum serviço disponível no momento</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeServices.map((service, i) => (
                  <button
                    key={service.id}
                    onClick={() => handleSelectService(service)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 group ${
                      selectedService?.id === service.id
                        ? "bg-[#C9A24D]/12 border-[#C9A24D]/50 shadow-[0_0_20px_rgba(201,162,77,0.08)]"
                        : "bg-[#151515] border-white/6 hover:border-[#C9A24D]/30 hover:bg-[#1a1a1a]"
                    }`}
                    data-testid={`card-service-${service.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 transition-colors ${
                        selectedService?.id === service.id ? "bg-[#C9A24D]/20" : "bg-white/5 group-hover:bg-[#C9A24D]/10"
                      }`}>
                        {SERVICE_EMOJIS[i % SERVICE_EMOJIS.length]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white">{service.name}</p>
                        {service.description && (
                          <p className="text-xs text-white/35 mt-0.5 line-clamp-1">{service.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="inline-flex items-center gap-1 text-xs text-white/30 bg-white/5 rounded-full px-2 py-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {service.duration} min
                          </span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-[#C9A24D] font-bold text-lg">
                          R$ {Number(service.price).toFixed(0)}
                        </p>
                        <ArrowRight className="h-4 w-4 text-white/20 group-hover:text-[#C9A24D]/50 transition-colors ml-auto mt-1" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div data-testid="step-barber-content">
            <div className="mb-8">
              <p className="text-[#C9A24D] text-sm font-medium mb-1 flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> Passo 2 de 5
              </p>
              <h2 className="text-2xl font-bold text-white">Quem vai te atender?</h2>
              <p className="text-white/40 text-sm mt-1">Escolha seu profissional favorito</p>
            </div>

            {barbersLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => (
                  <div key={i} className="h-24 rounded-2xl bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={() => {
                    const randomBarber = barbers[Math.floor(Math.random() * barbers.length)];
                    if (randomBarber) handleSelectBarber(randomBarber);
                  }}
                  className="w-full text-left p-4 rounded-2xl border border-[#C9A24D]/20 bg-gradient-to-r from-[#C9A24D]/8 to-transparent hover:from-[#C9A24D]/15 transition-all duration-200 group"
                  data-testid="card-barber-any"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#C9A24D]/25 to-[#C9A24D]/8 border-2 border-[#C9A24D]/20 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="h-6 w-6 text-[#C9A24D]" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-white">Qualquer profissional</p>
                      <p className="text-xs text-white/35 mt-0.5">Próximo disponível no horário escolhido</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-[#C9A24D]/40 group-hover:text-[#C9A24D]/70 transition-colors flex-shrink-0" />
                  </div>
                </button>

                {barbers.map((barber) => (
                  <button
                    key={barber.id}
                    onClick={() => handleSelectBarber(barber)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 group ${
                      selectedBarber?.id === barber.id
                        ? "bg-[#C9A24D]/12 border-[#C9A24D]/50"
                        : "bg-[#151515] border-white/6 hover:border-[#C9A24D]/30 hover:bg-[#1a1a1a]"
                    }`}
                    data-testid={`card-barber-${barber.id}`}
                  >
                    <div className="flex items-center gap-4">
                      {barber.photoUrl ? (
                        <img
                          src={barber.photoUrl}
                          alt={barber.name}
                          className="w-14 h-14 rounded-full object-cover border-2 border-[#C9A24D]/25 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#C9A24D]/20 to-[#C9A24D]/5 border-2 border-[#C9A24D]/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-[#C9A24D] font-bold text-xl">
                            {barber.name[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white">{barber.name}</p>
                        {barber.bio && (
                          <p className="text-xs text-white/35 mt-0.5 line-clamp-1">{barber.bio}</p>
                        )}
                        <div className="flex items-center gap-1 mt-1.5">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} className="h-3 w-3 fill-[#C9A24D] text-[#C9A24D]" />
                          ))}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-white/20 group-hover:text-[#C9A24D]/50 transition-colors flex-shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div data-testid="step-date-content">
            <div className="mb-8">
              <p className="text-[#C9A24D] text-sm font-medium mb-1 flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" /> Passo 3 de 5
              </p>
              <h2 className="text-2xl font-bold text-white">Qual a data?</h2>
              <p className="text-white/40 text-sm mt-1">Escolha o dia do seu atendimento</p>
            </div>

            <div
              className="flex gap-2.5 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {calendarDays.map(({ date, day }) => {
                const dayName = format(day, "EEE", { locale: ptBR });
                const dayNum = format(day, "dd");
                const monthName = format(day, "MMM", { locale: ptBR });
                const isSelected = selectedDate === date;
                return (
                  <button
                    key={date}
                    onClick={() => handleSelectDate(date)}
                    className={`flex-shrink-0 snap-start w-[76px] py-4 px-2 rounded-2xl border text-center transition-all duration-200 ${
                      isSelected
                        ? "bg-[#C9A24D] border-[#C9A24D] shadow-[0_4px_20px_rgba(201,162,77,0.35)]"
                        : "bg-[#151515] border-white/6 hover:border-[#C9A24D]/40 hover:bg-[#1a1a1a]"
                    }`}
                    data-testid={`date-${date}`}
                  >
                    <p className={`text-xs capitalize font-medium ${isSelected ? "text-black/60" : "text-white/35"}`}>
                      {dayName}
                    </p>
                    <p className={`text-2xl font-bold mt-1 leading-none ${isSelected ? "text-black" : "text-white"}`}>
                      {dayNum}
                    </p>
                    <p className={`text-[10px] capitalize mt-1 ${isSelected ? "text-black/50" : "text-white/25"}`}>
                      {monthName}
                    </p>
                  </button>
                );
              })}
            </div>

            {!selectedDate && (
              <p className="text-center text-white/25 text-sm mt-4">
                Toque em um dia para ver os horários disponíveis
              </p>
            )}
          </div>
        )}

        {step === 4 && (
          <div data-testid="step-time-content">
            <div className="mb-8">
              <p className="text-[#C9A24D] text-sm font-medium mb-1 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Passo 4 de 5
              </p>
              <h2 className="text-2xl font-bold text-white">Que horas?</h2>
              <p className="text-white/40 text-sm mt-1 capitalize">
                {selectedDate && format(new Date(selectedDate + "T12:00:00"), "EEEE, d 'de' MMMM", { locale: ptBR })}
              </p>
            </div>

            {slotsLoading ? (
              <div className="grid grid-cols-3 gap-2.5">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-xl bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : availability && availability.allSlots.length > 0 ? (
              <>
                <div className="flex items-center gap-4 mb-5 text-xs text-white/30">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-[#C9A24D]/30 border border-[#C9A24D]/50" />
                    Disponível
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-white/5 border border-white/10" />
                    Ocupado
                  </span>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {availability.allSlots.map((time) => {
                    const isAvailable = availability.slots.includes(time);
                    const isSelected = selectedTime === time;
                    return (
                      <button
                        key={time}
                        onClick={() => { if (isAvailable) handleSelectTime(time); }}
                        disabled={!isAvailable}
                        className={`py-3.5 px-2 rounded-xl border text-center font-mono font-semibold text-sm transition-all duration-150 ${
                          !isAvailable
                            ? "bg-white/[0.02] border-white/5 text-white/15 cursor-not-allowed line-through decoration-white/20"
                            : isSelected
                            ? "bg-[#C9A24D] text-black border-[#C9A24D] shadow-[0_4px_16px_rgba(201,162,77,0.3)]"
                            : "bg-[#151515] border-white/8 text-white hover:border-[#C9A24D]/50 hover:bg-[#C9A24D]/10 hover:text-[#C9A24D]"
                        }`}
                        data-testid={`time-${time}`}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-16">
                <div className="text-4xl mb-3">😔</div>
                <p className="text-white/50 font-medium mb-1">Nenhum horário disponível</p>
                <p className="text-white/30 text-sm mb-6">Tente outra data ou profissional</p>
                <button
                  onClick={() => setStep(3)}
                  className="px-6 py-2.5 rounded-xl border border-[#C9A24D]/30 text-[#C9A24D] text-sm hover:bg-[#C9A24D]/10 transition-colors"
                  data-testid="button-change-date"
                >
                  Escolher outra data
                </button>
              </div>
            )}
          </div>
        )}

        {step === 5 && (
          <div data-testid="step-confirm-content">
            <div className="mb-8">
              <p className="text-[#C9A24D] text-sm font-medium mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Passo 5 de 5
              </p>
              <h2 className="text-2xl font-bold text-white">Seus dados</h2>
              <p className="text-white/40 text-sm mt-1">Quase lá! Só precisamos te identificar</p>
            </div>

            <div className="bg-[#151515] border border-white/6 rounded-2xl overflow-hidden mb-6">
              <div className="px-5 py-3.5 border-b border-white/5">
                <p className="text-xs text-white/30 uppercase tracking-widest font-medium">Resumo</p>
              </div>
              <div className="divide-y divide-white/5">
                <div className="px-5 py-3 flex justify-between items-center">
                  <span className="text-white/40 text-sm">Serviço</span>
                  <span className="text-white text-sm font-medium">{selectedService?.name}</span>
                </div>
                <div className="px-5 py-3 flex justify-between items-center">
                  <span className="text-white/40 text-sm">Profissional</span>
                  <span className="text-white text-sm font-medium">{selectedBarber?.name}</span>
                </div>
                <div className="px-5 py-3 flex justify-between items-center">
                  <span className="text-white/40 text-sm">Data</span>
                  <span className="text-white text-sm font-medium capitalize">
                    {selectedDate && format(new Date(selectedDate + "T12:00:00"), "dd/MM/yyyy")}
                  </span>
                </div>
                <div className="px-5 py-3 flex justify-between items-center">
                  <span className="text-white/40 text-sm">Horário</span>
                  <span className="text-[#C9A24D] font-bold">{selectedTime}</span>
                </div>
                <div className="px-5 py-3 flex justify-between items-center">
                  <span className="text-white/40 text-sm">Valor</span>
                  <span className="text-[#C9A24D] font-bold text-lg">
                    R$ {Number(selectedService?.price || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm text-white/50 mb-2 font-medium">
                  Seu nome completo
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ex: João Silva"
                  autoComplete="name"
                  className="w-full px-4 py-3.5 bg-[#151515] border border-white/8 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-[#C9A24D]/50 focus:bg-[#1a1a1a] transition-all"
                  data-testid="input-name"
                />
              </div>
              <div>
                <label className="block text-sm text-white/50 mb-2 font-medium">
                  WhatsApp
                </label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="(48) 99999-9999"
                  autoComplete="tel"
                  inputMode="tel"
                  className="w-full px-4 py-3.5 bg-[#151515] border border-white/8 rounded-xl text-white placeholder:text-white/20 focus:outline-none focus:border-[#C9A24D]/50 focus:bg-[#1a1a1a] transition-all"
                  data-testid="input-phone"
                />
              </div>
            </div>

            <button
              onClick={handleConfirm}
              disabled={createMutation.isPending || !clientName.trim() || !clientPhone.trim()}
              className="w-full py-4 bg-[#C9A24D] hover:bg-[#b8912f] disabled:opacity-40 disabled:cursor-not-allowed text-black font-bold text-base rounded-xl transition-all shadow-[0_4px_20px_rgba(201,162,77,0.25)] hover:shadow-[0_4px_28px_rgba(201,162,77,0.4)] flex items-center justify-center gap-2"
              data-testid="button-confirm-booking"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Agendando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  Confirmar Agendamento
                </>
              )}
            </button>

            <p className="text-center text-white/20 text-xs mt-4">
              Ao confirmar você concorda em comparecer no horário marcado.
            </p>
          </div>
        )}
      </div>

      <SummaryBar
        step={step}
        service={selectedService}
        barber={selectedBarber}
        date={selectedDate}
        time={selectedTime}
        onClickService={() => setStep(1)}
        onClickBarber={() => setStep(2)}
        onClickDate={() => setStep(3)}
        onClickTime={() => setStep(4)}
      />
    </div>
  );
}
