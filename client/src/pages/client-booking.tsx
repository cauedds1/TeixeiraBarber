import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, Scissors, User, CalendarDays, Clock,
  CheckCircle2, Phone, MessageCircle, Sparkles, ChevronRight,
  ChevronDown, XCircle, AlertCircle,
} from "lucide-react";
import { format, addDays, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Barbershop, Service, Barber, WorkSchedule } from "@shared/schema";
import { DEFAULT_WORK_SCHEDULE } from "@shared/schema";
import teixeiraLogoPath from "@assets/logo.png";

const WHATSAPP_NUMBER = "5548999505167";
const WS_DAY_KEYS: (keyof WorkSchedule)[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
function getDayKey(d: Date): keyof WorkSchedule { return WS_DAY_KEYS[d.getDay()]; }

type BarberWithAvailability = Barber & { available: boolean; nextSlots: string[] };

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function minutesToTime(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
function generateSlots(open: string, close: string, duration: number) {
  const start = timeToMinutes(open);
  const end = timeToMinutes(close);
  const slots: string[] = [];
  for (let m = start; m + duration <= end; m += 30) slots.push(minutesToTime(m));
  return slots;
}

function SectionHeader({
  icon, title, done, doneLabel,
}: { icon: React.ReactNode; title: string; done?: boolean; doneLabel?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${done ? "bg-[#C9A24D] text-black" : "bg-white/8 text-white/40"}`}>
        {done ? <CheckCircle2 className="h-4 w-4" /> : icon}
      </div>
      <div>
        <p className="text-white font-semibold text-sm leading-none">{title}</p>
        {done && doneLabel && <p className="text-[#C9A24D] text-xs mt-0.5">{doneLabel}</p>}
      </div>
    </div>
  );
}

export default function ClientBooking() {
  const [, params] = useRoute("/agendar/:slug");
  const slug = params?.slug || "";
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const todayStr = format(startOfDay(new Date()), "yyyy-MM-dd");

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [expandedBarber, setExpandedBarber] = useState<string | null>(null);
  const [showAllServices, setShowAllServices] = useState(false);
  const [expandedDesc, setExpandedDesc] = useState<Set<string>>(new Set());
  const [clientName, setClientName] = useState(() => localStorage.getItem("teixeira_client_name") || "");
  const [clientPhone, setClientPhone] = useState(() => localStorage.getItem("teixeira_client_phone") || "");
  const [booked, setBooked] = useState(false);

  const dateRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLDivElement>(null);
  const barberRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);

  const scrollTo = (ref: React.RefObject<HTMLDivElement>) => {
    setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
  };

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

  const { data: barbersForSlot = [], isLoading: barbersLoading } = useQuery<BarberWithAvailability[]>({
    queryKey: ["/api/public/barbershops", slug, "barbers-for-slot", selectedDate, selectedTime, selectedService?.id],
    queryFn: async () => {
      const p = new URLSearchParams({
        date: selectedDate,
        time: selectedTime,
        ...(selectedService ? { serviceId: selectedService.id } : {}),
      });
      const res = await fetch(`/api/public/barbershops/${slug}/barbers-for-slot?${p}`);
      if (!res.ok) throw new Error("Err");
      return res.json();
    },
    enabled: !!slug && !!selectedDate && !!selectedTime,
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
    onSuccess: () => {
      localStorage.setItem("teixeira_client_name", clientName.trim());
      localStorage.setItem("teixeira_client_phone", clientPhone.trim());
      setBooked(true);
    },
    onError: (e: any) => {
      toast({ title: "Erro ao agendar", description: e.message || "Tente novamente.", variant: "destructive" });
    },
  });

  const ws: WorkSchedule = (barbershop?.workSchedule as WorkSchedule | null) || DEFAULT_WORK_SCHEDULE;

  const calendarDays = useMemo(() => {
    const today = startOfDay(new Date());
    const todayStr = format(today, "yyyy-MM-dd");
    const days = [];
    for (let i = 0; days.length < 30 && i < 90; i++) {
      const d = addDays(today, i);
      const key = getDayKey(d);
      if (ws[key].isOpen) {
        const dateStr = format(d, "yyyy-MM-dd");
        days.push({ date: dateStr, day: d, isToday: dateStr === todayStr });
      }
    }
    return days;
  }, [barbershop]);

  const generalTimeSlots = useMemo(() => {
    if (!barbershop) return [];
    const dayKey = getDayKey(new Date(selectedDate + "T12:00:00"));
    const daySchedule = ws[dayKey];
    const slots = generateSlots(
      daySchedule.open || barbershop.openingTime || "09:00",
      daySchedule.close || barbershop.closingTime || "19:00",
      selectedService?.duration || 30
    );
    if (selectedDate === todayStr) {
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const roundedNow = Math.ceil(nowMinutes / 30) * 30;
      return slots.filter((time) => {
        const [h, m] = time.split(":").map(Number);
        return h * 60 + m > roundedNow;
      });
    }
    return slots;
  }, [barbershop, selectedService, selectedDate, todayStr]);

  const activeServices = services.filter((s) => s.isActive);
  const featuredServices = activeServices.filter((s) => s.isFeatured);
  const otherServices = activeServices.filter((s) => !s.isFeatured);
  const hasFeatured = featuredServices.length > 0;
  const canConfirm = selectedService && selectedBarber && selectedDate && selectedTime && clientName.trim() && clientPhone.trim();

  const handleConfirm = () => {
    if (!canConfirm) {
      toast({ title: "Complete todas as seleções acima", variant: "destructive" });
      return;
    }
    const duration = selectedService!.duration || 30;
    const [h, m] = selectedTime.split(":").map(Number);
    const total = h * 60 + m + duration;
    const endTime = `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
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

  if (barbershopLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0e0e0e]">
        <Loader2 className="h-7 w-7 animate-spin text-[#C9A24D]" data-testid="loader-booking" />
      </div>
    );
  }
  if (!barbershop) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0e0e0e] gap-3 p-8">
        <Scissors className="h-10 w-10 text-white/15" />
        <h1 className="text-xl font-bold text-white">Barbearia não encontrada</h1>
        <p className="text-white/40 text-sm text-center">Verifique o link e tente novamente.</p>
      </div>
    );
  }

  if (booked) {
    const whatsappMsg = encodeURIComponent(
      `Olá! Acabei de agendar na Teixeira Barbearia.\n\nServiço: ${selectedService?.name}\nProfissional: ${selectedBarber?.name}\nData: ${selectedDate ? format(new Date(selectedDate + "T12:00:00"), "dd/MM/yyyy") : ""}\nHorário: ${selectedTime}\nNome: ${clientName}`
    );
    return (
      <div className="min-h-screen bg-[#0e0e0e] flex flex-col">
        <header className="border-b border-white/5 bg-[#0e0e0e]">
          <div className="max-w-2xl mx-auto px-6 py-4 flex justify-center">
            <img
              src={teixeiraLogoPath}
              alt="Teixeira Barbearia"
              className="h-10 w-auto cursor-pointer"
              onClick={() => navigate("/")}
              data-testid="img-logo-success"
            />
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md text-center space-y-8">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-[#C9A24D]/20 rounded-full blur-3xl scale-150" />
                <div className="relative w-24 h-24 rounded-full bg-[#C9A24D]/15 border border-[#C9A24D]/35 flex items-center justify-center">
                  <CheckCircle2 className="h-12 w-12 text-[#C9A24D]" />
                </div>
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2" data-testid="text-booking-success">Agendado!</h1>
              <p className="text-white/40">Seu horário está confirmado. Te esperamos!</p>
            </div>
            <div className="bg-[#151515] border border-white/8 rounded-2xl overflow-hidden text-left">
              <div className="divide-y divide-white/5">
                {[
                  { label: "Serviço", value: selectedService?.name },
                  { label: "Profissional", value: selectedBarber?.name },
                  { label: "Data", value: selectedDate ? format(new Date(selectedDate + "T12:00:00"), "dd/MM/yyyy") : "" },
                  { label: "Horário", value: selectedTime, gold: true },
                  { label: "Valor", value: `R$ ${Number(selectedService?.price || 0).toFixed(2)}`, gold: true },
                ].map(({ label, value, gold }) => (
                  <div key={label} className="px-5 py-3.5 flex justify-between items-center">
                    <span className="text-white/40 text-sm">{label}</span>
                    <span className={`text-sm font-medium ${gold ? "text-[#C9A24D] font-bold" : "text-white"}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMsg}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-[#25D366]/12 border border-[#25D366]/30 text-[#25D366] font-medium hover:bg-[#25D366]/20 transition-colors"
                data-testid="button-whatsapp"
              >
                <MessageCircle className="h-5 w-5" />
                Confirmar pelo WhatsApp
              </a>
              <button
                onClick={() => {
                  setBooked(false);
                  setSelectedService(null);
                  setSelectedDate(todayStr);
                  setSelectedTime("");
                  setSelectedBarber(null);
                  setClientName(localStorage.getItem("teixeira_client_name") || "");
                  setClientPhone(localStorage.getItem("teixeira_client_phone") || "");
                }}
                className="w-full py-3.5 rounded-xl border border-white/8 text-white/40 text-sm hover:text-white hover:border-white/20 transition-colors"
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
    <div className="min-h-screen bg-[#0e0e0e]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0e0e0e]/97 backdrop-blur-sm border-b border-white/5">
        <div className="max-w-2xl mx-auto px-6 py-3 flex items-center justify-between">
          <img
            src={teixeiraLogoPath}
            alt="Teixeira Barbearia"
            className="h-9 w-auto cursor-pointer"
            onClick={() => navigate("/")}
            data-testid="img-logo-booking"
          />
          {barbershop.phone && (
            <a href={`tel:${barbershop.phone}`} className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors">
              <Phone className="h-3 w-3" />
              {barbershop.phone}
            </a>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-10 pb-14">

        {/* ─── 1. SERVIÇO ──────────────────────────────────────────── */}
        <section data-testid="step-service-content">
          <SectionHeader
            icon={<Scissors className="h-4 w-4" />}
            title="Serviço"
            done={!!selectedService}
            doneLabel={selectedService ? `${selectedService.name} · R$ ${Number(selectedService.price).toFixed(2)} · ${selectedService.duration} min` : undefined}
          />
          {servicesLoading ? (
            <div className="space-y-2.5">
              {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse" />)}
            </div>
          ) : activeServices.length === 0 ? (
            <p className="text-white/25 text-sm py-6">Nenhum serviço disponível no momento.</p>
          ) : (
            <div className="space-y-4">
              {hasFeatured && (
                <>
                  <p className="text-xs font-semibold text-[#C9A24D]/80 uppercase tracking-widest">Serviços Principais</p>
                  <div className="space-y-2.5">
                    {featuredServices.map((service) => {
                      const sel = selectedService?.id === service.id;
                      return (
                        <button
                          key={service.id}
                          onClick={() => { setSelectedService(service); if (!selectedTime) scrollTo(dateRef); }}
                          className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 group active:scale-[0.99] ${sel ? "bg-[#C9A24D]/12 border-[#C9A24D]/45" : "bg-[#141414] border-white/6 hover:border-white/15"}`}
                          data-testid={`card-service-${service.id}`}
                        >
                          <div className="flex items-center gap-3.5">
                            <span className="text-2xl w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">{service.emoji || "✂️"}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-white text-sm">{service.name}</p>
                              {service.description && (
                                service.description.length > 120 ? (
                                  <div>
                                    <p className={`text-xs text-white/30 mt-0.5 ${expandedDesc.has(String(service.id)) ? "" : "line-clamp-2"}`}>{service.description}</p>
                                    <button onClick={(e) => { e.stopPropagation(); setExpandedDesc(prev => { const next = new Set(prev); next.has(String(service.id)) ? next.delete(String(service.id)) : next.add(String(service.id)); return next; }); }} className="text-[10px] text-[#C9A24D]/70 hover:text-[#C9A24D] mt-0.5 font-medium" data-testid={`btn-lerMais-${service.id}`}>{expandedDesc.has(String(service.id)) ? "← Ler menos" : "Ler mais →"}</button>
                                  </div>
                                ) : (
                                  <p className="text-xs text-white/30 mt-0.5">{service.description}</p>
                                )
                              )}
                              <p className="text-xs text-white/25 mt-1 flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{service.duration} min</p>
                            </div>
                            <div className="flex-shrink-0 text-right">
                              <p className={`font-bold text-base ${sel ? "text-[#C9A24D]" : "text-white"}`}>R$ {Number(service.price).toFixed(0)}</p>
                              <ChevronRight className={`h-4 w-4 ml-auto mt-1 transition-colors ${sel ? "text-[#C9A24D]" : "text-white/15 group-hover:text-white/30"}`} />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {hasFeatured && otherServices.length > 0 && (
                <button
                  onClick={() => setShowAllServices(v => !v)}
                  className="w-full flex items-center justify-between pt-2 group"
                  data-testid="button-toggle-all-services"
                >
                  <span className="text-xs font-semibold text-white/30 uppercase tracking-widest group-hover:text-white/50 transition-colors">
                    Todos os serviços ({otherServices.length})
                  </span>
                  <ChevronDown className={`h-4 w-4 text-white/30 group-hover:text-white/50 transition-all duration-200 ${showAllServices ? "rotate-180" : ""}`} />
                </button>
              )}

              {otherServices.length > 0 && (hasFeatured ? showAllServices : true) && (
                <div className="space-y-2.5">
                  {otherServices.map((service) => {
                    const sel = selectedService?.id === service.id;
                    return (
                      <button
                        key={service.id}
                        onClick={() => { setSelectedService(service); if (!selectedTime) scrollTo(dateRef); }}
                        className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 group active:scale-[0.99] ${sel ? "bg-[#C9A24D]/12 border-[#C9A24D]/45" : "bg-[#141414] border-white/6 hover:border-white/15"}`}
                        data-testid={`card-service-${service.id}`}
                      >
                        <div className="flex items-center gap-3.5">
                          <span className="text-2xl w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">{service.emoji || "✂️"}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white text-sm">{service.name}</p>
                            {service.description && (
                              service.description.length > 120 ? (
                                <div>
                                  <p className={`text-xs text-white/30 mt-0.5 ${expandedDesc.has(String(service.id)) ? "" : "line-clamp-2"}`}>{service.description}</p>
                                  <button onClick={(e) => { e.stopPropagation(); setExpandedDesc(prev => { const next = new Set(prev); next.has(String(service.id)) ? next.delete(String(service.id)) : next.add(String(service.id)); return next; }); }} className="text-[10px] text-[#C9A24D]/70 hover:text-[#C9A24D] mt-0.5 font-medium" data-testid={`btn-lerMais-${service.id}`}>{expandedDesc.has(String(service.id)) ? "← Ler menos" : "Ler mais →"}</button>
                                </div>
                              ) : (
                                <p className="text-xs text-white/30 mt-0.5">{service.description}</p>
                              )
                            )}
                            <p className="text-xs text-white/25 mt-1 flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{service.duration} min</p>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <p className={`font-bold text-base ${sel ? "text-[#C9A24D]" : "text-white"}`}>R$ {Number(service.price).toFixed(0)}</p>
                            <ChevronRight className={`h-4 w-4 ml-auto mt-1 transition-colors ${sel ? "text-[#C9A24D]" : "text-white/15 group-hover:text-white/30"}`} />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>

        {/* ─── 2. DATA ─────────────────────────────────────────────── */}
        <section ref={dateRef} className="scroll-mt-[60px]" data-testid="step-date-content">
          <SectionHeader
            icon={<CalendarDays className="h-4 w-4" />}
            title="Data"
            done={!!selectedDate}
            doneLabel={selectedDate ? format(new Date(selectedDate + "T12:00:00"), "EEEE, dd/MM/yyyy", { locale: ptBR }) : undefined}
          />
          <div
            className="flex gap-2.5 overflow-x-auto pb-3 snap-x snap-mandatory"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {calendarDays.map(({ date, day, isToday }) => {
              const sel = selectedDate === date;
              return (
                <button
                  key={date}
                  onClick={() => {
                    setSelectedDate(date);
                    setSelectedTime("");
                    setSelectedBarber(null);
                    if (!selectedTime) scrollTo(timeRef);
                  }}
                  className={`flex-shrink-0 snap-start w-[70px] py-3.5 px-1.5 rounded-2xl border text-center transition-all duration-200 active:scale-95 ${sel ? "bg-[#C9A24D] border-[#C9A24D] shadow-[0_4px_16px_rgba(201,162,77,0.3)]" : "bg-[#141414] border-white/6 hover:border-[#C9A24D]/35"}`}
                  data-testid={`date-${date}`}
                >
                  <p className={`text-[10px] capitalize font-medium ${sel ? "text-black/60" : isToday ? "text-[#C9A24D]/70" : "text-white/30"}`}>
                    {isToday ? "hoje" : format(day, "EEE", { locale: ptBR })}
                  </p>
                  <p className={`text-xl font-bold mt-0.5 leading-none ${sel ? "text-black" : "text-white"}`}>
                    {format(day, "dd")}
                  </p>
                  <p className={`text-[9px] capitalize mt-0.5 ${sel ? "text-black/50" : "text-white/20"}`}>
                    {format(day, "MMM", { locale: ptBR })}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* ─── 3. HORÁRIO ──────────────────────────────────────────── */}
        <section ref={timeRef} data-testid="step-time-content">
          <SectionHeader
            icon={<Clock className="h-4 w-4" />}
            title="Horário"
            done={!!selectedTime}
            doneLabel={selectedTime || undefined}
          />
          {generalTimeSlots.length === 0 ? (
            <p className="text-white/25 text-sm py-4">Carregando horários...</p>
          ) : (
            <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 gap-2" data-testid="time-grid">
              {generalTimeSlots.map((time) => {
                const sel = selectedTime === time;
                return (
                  <button
                    key={time}
                    onClick={() => {
                      setSelectedTime(time);
                      setSelectedBarber(null);
                      setExpandedBarber(null);
                      scrollTo(barberRef);
                    }}
                    className={`py-3 px-1 rounded-xl border text-center font-mono font-semibold text-xs transition-all duration-150 active:scale-95 ${sel ? "bg-[#C9A24D] text-black border-[#C9A24D] shadow-[0_2px_12px_rgba(201,162,77,0.3)]" : "bg-[#141414] border-white/8 text-white hover:border-[#C9A24D]/40 hover:text-[#C9A24D]"}`}
                    data-testid={`time-${time}`}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* ─── 4. PROFISSIONAL ─────────────────────────────────────── */}
        <section ref={barberRef} data-testid="step-barber-content">
          <SectionHeader
            icon={<User className="h-4 w-4" />}
            title="Profissional"
            done={!!selectedBarber}
            doneLabel={selectedBarber?.name}
          />

          {!selectedDate || !selectedTime ? (
            <p className="text-white/25 text-sm py-4">Selecione a data e horário acima para ver os profissionais disponíveis.</p>
          ) : barbersLoading ? (
            <div className="space-y-2.5">
              {[1, 2].map(i => <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse" />)}
            </div>
          ) : barbersForSlot.length === 0 ? (
            <p className="text-white/25 text-sm py-4">Nenhum profissional cadastrado.</p>
          ) : (
            <div className="space-y-2.5">
              {/* Sort: available first */}
              {[...barbersForSlot].sort((a, b) => (b.available ? 1 : 0) - (a.available ? 1 : 0)).map((barber) => {
                const sel = selectedBarber?.id === barber.id;
                const isExpanded = expandedBarber === barber.id;

                return (
                  <div key={barber.id}>
                    <button
                      onClick={() => {
                        if (!barber.available) return;
                        setSelectedBarber(barber);
                        scrollTo(infoRef);
                      }}
                      className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 group ${barber.available
                        ? sel
                          ? "bg-[#C9A24D]/12 border-[#C9A24D]/45 active:scale-[0.99]"
                          : "bg-[#141414] border-white/6 hover:border-white/15 active:scale-[0.99] cursor-pointer"
                        : "bg-[#141414]/60 border-white/4 cursor-default"
                        }`}
                      data-testid={`card-barber-${barber.id}`}
                    >
                      <div className="flex items-center gap-3.5">
                        {barber.photoUrl ? (
                          <img src={barber.photoUrl} alt={barber.name}
                            className={`w-12 h-12 rounded-full object-cover border flex-shrink-0 ${barber.available ? "border-[#C9A24D]/25" : "border-white/8 opacity-50 grayscale"}`} />
                        ) : (
                          <div className={`w-12 h-12 rounded-full border flex items-center justify-center flex-shrink-0 ${barber.available ? "bg-[#C9A24D]/12 border-[#C9A24D]/20" : "bg-white/5 border-white/8"}`}>
                            <span className={`font-bold text-base ${barber.available ? "text-[#C9A24D]" : "text-white/20"}`}>
                              {barber.name[0].toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm ${barber.available ? "text-white" : "text-white/35"}`}>{barber.name}</p>
                          {barber.bio && <p className="text-xs text-white/25 mt-0.5 line-clamp-1">{barber.bio}</p>}
                          {barber.available ? (
                            <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-emerald-400 bg-emerald-400/10 rounded-full px-2 py-0.5 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Disponível às {selectedTime}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-white/30 bg-white/5 rounded-full px-2 py-0.5 font-medium">
                              <XCircle className="h-2.5 w-2.5" />
                              Indisponível neste horário
                            </span>
                          )}
                        </div>
                        {barber.available ? (
                          <ChevronRight className={`h-4 w-4 flex-shrink-0 transition-colors ${sel ? "text-[#C9A24D]" : "text-white/15 group-hover:text-white/30"}`} />
                        ) : barber.nextSlots.length > 0 ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); setExpandedBarber(isExpanded ? null : barber.id); }}
                            className="flex-shrink-0 flex items-center gap-1 text-[10px] text-[#C9A24D] border border-[#C9A24D]/25 rounded-full px-2.5 py-1 hover:bg-[#C9A24D]/10 transition-colors whitespace-nowrap"
                            data-testid={`button-next-slots-${barber.id}`}
                          >
                            Ver próximos
                            <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                          </button>
                        ) : (
                          <span className="text-[10px] text-white/20 flex-shrink-0">Sem vagas hoje</span>
                        )}
                      </div>
                    </button>

                    {/* Próximos horários expandido */}
                    {!barber.available && isExpanded && barber.nextSlots.length > 0 && (
                      <div className="mt-1.5 bg-[#0e0e0e] border border-[#C9A24D]/20 rounded-2xl p-4">
                        <p className="text-xs text-white/40 mb-3 flex items-center gap-1.5">
                          <AlertCircle className="h-3 w-3 text-[#C9A24D]" />
                          Próximos horários disponíveis com {barber.name}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {barber.nextSlots.map((slot) => (
                            <button
                              key={slot}
                              onClick={() => {
                                setSelectedTime(slot);
                                setSelectedBarber(barber);
                                setExpandedBarber(null);
                                scrollTo(infoRef);
                              }}
                              className="px-4 py-2 rounded-xl bg-[#C9A24D]/12 border border-[#C9A24D]/30 text-[#C9A24D] font-mono font-semibold text-sm hover:bg-[#C9A24D]/20 transition-colors"
                              data-testid={`next-slot-${barber.id}-${slot}`}
                            >
                              {slot}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ─── 5. DADOS + CONFIRMAR ────────────────────────────────── */}
        <section ref={infoRef} data-testid="step-confirm-content">
          <SectionHeader
            icon={<CheckCircle2 className="h-4 w-4" />}
            title="Confirmar agendamento"
            done={!!(clientName && clientPhone && canConfirm)}
          />

          {(selectedService || selectedBarber || selectedTime) && (
            <div className="bg-[#141414] border border-white/6 rounded-2xl overflow-hidden mb-5">
              <div className="px-4 py-3 border-b border-white/5">
                <p className="text-[10px] text-white/25 uppercase tracking-widest font-medium">Resumo</p>
              </div>
              <div className="divide-y divide-white/5">
                {selectedService && (
                  <div className="px-4 py-2.5 flex justify-between">
                    <span className="text-white/35 text-xs">Serviço</span>
                    <span className="text-white text-xs font-medium">{selectedService.name} · R$ {Number(selectedService.price).toFixed(2)}</span>
                  </div>
                )}
                {selectedDate && (
                  <div className="px-4 py-2.5 flex justify-between">
                    <span className="text-white/35 text-xs">Data</span>
                    <span className="text-white text-xs font-medium capitalize">{format(new Date(selectedDate + "T12:00:00"), "EEEE, dd/MM/yyyy", { locale: ptBR })}</span>
                  </div>
                )}
                {selectedTime && (
                  <div className="px-4 py-2.5 flex justify-between">
                    <span className="text-white/35 text-xs">Horário</span>
                    <span className="text-[#C9A24D] text-xs font-bold">{selectedTime}</span>
                  </div>
                )}
                {selectedBarber && (
                  <div className="px-4 py-2.5 flex justify-between">
                    <span className="text-white/35 text-xs">Profissional</span>
                    <span className="text-white text-xs font-medium">{selectedBarber.name}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {localStorage.getItem("teixeira_client_name") && (
            <div className="flex items-center justify-between mb-3 px-1">
              <p className="text-[#C9A24D] text-xs flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" />
                Bem-vindo de volta, {localStorage.getItem("teixeira_client_name")?.split(" ")[0]}!
              </p>
              <button
                onClick={() => {
                  localStorage.removeItem("teixeira_client_name");
                  localStorage.removeItem("teixeira_client_phone");
                  setClientName("");
                  setClientPhone("");
                }}
                className="text-white/25 text-xs hover:text-white/60 transition-colors"
                data-testid="button-clear-client-data"
              >
                Não é você?
              </button>
            </div>
          )}

          <div className="space-y-3">
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Seu nome completo"
              autoComplete="name"
              className={`w-full px-4 py-3.5 bg-[#141414] border rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#C9A24D]/50 transition-all ${clientName && localStorage.getItem("teixeira_client_name") === clientName ? "border-[#C9A24D]/30" : "border-white/8"}`}
              data-testid="input-name"
            />
            <input
              type="tel"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="WhatsApp (48) 99999-9999"
              autoComplete="tel"
              inputMode="tel"
              className={`w-full px-4 py-3.5 bg-[#141414] border rounded-xl text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#C9A24D]/50 transition-all ${clientPhone && localStorage.getItem("teixeira_client_phone") === clientPhone ? "border-[#C9A24D]/30" : "border-white/8"}`}
              data-testid="input-phone"
            />
          </div>

          <button
            onClick={handleConfirm}
            disabled={createMutation.isPending || !canConfirm}
            className="w-full mt-5 py-4 bg-[#C9A24D] hover:bg-[#b8912f] disabled:opacity-30 disabled:cursor-not-allowed text-black font-bold text-base rounded-xl transition-all shadow-[0_4px_20px_rgba(201,162,77,0.2)] hover:shadow-[0_4px_28px_rgba(201,162,77,0.35)] flex items-center justify-center gap-2"
            data-testid="button-confirm-booking"
          >
            {createMutation.isPending ? (
              <><Loader2 className="h-5 w-5 animate-spin" />Agendando...</>
            ) : (
              <><CheckCircle2 className="h-5 w-5" />Confirmar Agendamento</>
            )}
          </button>
        </section>
      </div>
    </div>
  );
}
