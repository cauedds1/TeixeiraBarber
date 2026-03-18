import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, MapPin, Phone, Clock, Star, Scissors, ChevronDown, Menu, X, Instagram, MessageCircle, Calendar, Award, Users, Lock } from "lucide-react";
import teixeiraLogoPath from "@assets/logo.png";
import interiorPhotoPath from "@assets/WhatsApp_Image_2026-03-15_at_22.13.50_1773624658523.jpeg";
import facadePhotoPath from "@assets/WhatsApp_Image_2026-03-15_at_22.13.51_1773624658521.jpeg";
import droneVideoPath from "@assets/WhatsApp_Video_2026-03-15_at_22.13.50_1773624658523.mp4";
import type { Service, Barber, Barbershop, WorkSchedule } from "@shared/schema";
import { DEFAULT_WORK_SCHEDULE } from "@shared/schema";

const WHATSAPP_NUMBER = "5548999505167";
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}`;
const BOOKING_LINK = "/agendar/teixeira";
const INSTAGRAM_LINK = "https://instagram.com/teixeirabarbeariaoficial";
const MAPS_LINK = "https://maps.google.com/?q=Rua+Koesa+430+Kobrasol+Sao+Jose+SC";

const fallbackServices = [
  { name: "Corte Masculino", duration: 30, price: "60", icon: "✂️" },
  { name: "Corte e Barba", duration: 60, price: "98", icon: "💈" },
  { name: "Corte e Máquina", duration: 60, price: "85", icon: "⚡" },
  { name: "Barba", duration: 30, price: "50", icon: "🪒" },
];

const fallbackTeam = [
  { name: "Franciele", bio: "Especialista em cortes modernos", photoUrl: null as string | null, initials: "FR", color: "from-amber-700 to-amber-900" },
  { name: "Jean Carlos", bio: "Mestre em design capilar", photoUrl: null as string | null, initials: "JC", color: "from-stone-600 to-stone-800" },
  { name: "Jeferson", bio: "Artista em barbearia clássica", photoUrl: null as string | null, initials: "JF", color: "from-yellow-700 to-yellow-900" },
];

const serviceIcons = ["✂️", "💈", "⚡", "🪒", "💇", "🧴"];
const teamColors = ["from-amber-700 to-amber-900", "from-stone-600 to-stone-800", "from-yellow-700 to-yellow-900"];

const staticReviews = [
  { text: "Ótimo atendimento!! Melhor barbearia da região 🙏", author: "José", date: "Jan 2026", rating: 5 },
  { text: "Nota 10! Profissionais incríveis, ambiente muito agradável.", author: "Edson", date: "Dez 2025", rating: 5 },
  { text: "Melhor barbearia de Floripa ♡ Sempre saio satisfeito!", author: "Octavio", date: "Dez 2025", rating: 5 },
  { text: "Simplesmente a melhor profissional do ramo. Recomendo demais!", author: "Davi", date: "Out 2025", rating: 5 },
  { text: "Serviço impecável, ambiente top. Virei cliente fiel!", author: "Priscila", date: "Out 2025", rating: 5 },
  { text: "Atendimento perfeito, resultado sempre incrível. 5 estrelas!", author: "Leonardo", date: "Dez 2025", rating: 5 },
];

type ReviewData = { text: string; author: string; date: string; rating: number };

const WS_KEYS: (keyof WorkSchedule)[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LABELS: Record<string, string> = {
  mon: "Segunda", tue: "Terça", wed: "Quarta", thu: "Quinta",
  fri: "Sexta", sat: "Sábado", sun: "Domingo",
};

function computeHoursDisplay(ws: WorkSchedule) {
  const groups: { day: string; time: string; open: boolean }[] = [];
  for (const key of WS_KEYS) {
    const d = ws[key];
    const sig = `${d.isOpen}-${d.open}-${d.close}`;
    const prev = groups[groups.length - 1];
    if (prev && prev._sig === sig) {
      (prev as any)._endLabel = DAY_LABELS[key];
    } else {
      groups.push({
        day: DAY_LABELS[key],
        time: d.isOpen ? `${d.open} – ${d.close}` : "Fechado",
        open: d.isOpen,
        _sig: sig,
        _endLabel: "",
      } as any);
    }
  }
  return groups.map((g: any) => ({
    day: g._endLabel ? `${g.day} a ${g._endLabel}` : g.day,
    time: g.time,
    open: g.open,
  }));
}

const formatCurrency = (value: number | string | null) => {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return `R$ ${(num || 0).toFixed(0)}`;
};

const formatDuration = (mins: number) => {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
};

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeReview, setActiveReview] = useState(0);
  const reviewInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: barbershopData } = useQuery<Barbershop>({
    queryKey: ["/api/public/barbershops/teixeira"],
    queryFn: async () => {
      const res = await fetch("/api/public/barbershops/teixeira");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    staleTime: 60000,
    retry: false,
  });

  const ws: WorkSchedule = (barbershopData?.workSchedule as WorkSchedule | null) || DEFAULT_WORK_SCHEDULE;
  const hours = computeHoursDisplay(ws);
  const weekdayLabel = ws.mon.isOpen ? `${ws.mon.open}–${ws.mon.close}` : "Agende online";

  const { data: apiServices, isError: servicesError } = useQuery<Service[]>({
    queryKey: ["/api/public/barbershops/teixeira/services"],
    queryFn: async () => {
      const res = await fetch("/api/public/barbershops/teixeira/services");
      if (!res.ok) throw new Error("Failed to fetch services");
      return res.json();
    },
    staleTime: 60000,
    retry: false,
  });

  const { data: apiBarbers, isError: barbersError } = useQuery<Barber[]>({
    queryKey: ["/api/public/barbershops/teixeira/barbers"],
    queryFn: async () => {
      const res = await fetch("/api/public/barbershops/teixeira/barbers");
      if (!res.ok) throw new Error("Failed to fetch barbers");
      return res.json();
    },
    staleTime: 60000,
    retry: false,
  });

  const { data: reviewsData } = useQuery<{
    testimonials: Array<{ id: string; comment: string; clientName: string | null; rating: number | null; barbershopRating: number | null; createdAt: string }>;
    avgBarbershopRating: number;
    overallAvg: number;
    totalReviews: number;
    totalWithRating: number;
  }>({
    queryKey: ["/api/public/barbershops/teixeira/reviews"],
    queryFn: async () => {
      const res = await fetch("/api/public/barbershops/teixeira/reviews");
      if (!res.ok) throw new Error("Failed to fetch reviews");
      return res.json();
    },
    staleTime: 120000,
    retry: false,
  });

  const activeApiServices = apiServices?.filter(s => s.isActive) || [];

  const services = servicesError
    ? fallbackServices.map(s => ({
        name: s.name,
        duration: formatDuration(s.duration),
        price: formatCurrency(s.price),
        icon: s.icon,
      }))
    : activeApiServices.map((s, i) => ({
        name: s.name,
        duration: formatDuration(s.duration),
        price: formatCurrency(s.price),
        icon: s.emoji || serviceIcons[i % serviceIcons.length],
      }));

  const team = barbersError
    ? fallbackTeam.map((b, i) => ({
        name: b.name,
        role: b.bio || "Profissional",
        photoUrl: b.photoUrl,
        initials: b.initials,
        color: b.color,
        coverPhotoUrl: null as string | null,
        cardBgColor: null as string | null,
        cardBgOpacity: 30,
        avgRating: 0,
      }))
    : (apiBarbers || []).map((b, i) => ({
        name: b.name,
        role: b.bio || "Profissional",
        photoUrl: b.photoUrl,
        initials: b.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase(),
        color: teamColors[i % teamColors.length],
        coverPhotoUrl: b.coverPhotoUrl ?? null,
        cardBgColor: b.cardBgColor ?? null,
        cardBgOpacity: b.cardBgOpacity ?? 30,
        avgRating: (b as { avgRating?: number }).avgRating ?? 0,
      }));

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const displayReviews: ReviewData[] = (() => {
    const dbTestimonials = reviewsData?.testimonials || [];
    if (dbTestimonials.length >= 3) {
      return dbTestimonials.map(r => ({
        text: r.comment,
        author: r.clientName || "Cliente",
        date: new Date(r.createdAt).toLocaleDateString("pt-BR", { month: "short", year: "numeric" }),
        rating: r.rating || r.barbershopRating || 5,
      }));
    }
    return staticReviews;
  })();

  const totalReviewCount = reviewsData?.totalReviews && reviewsData.totalReviews > 0
    ? reviewsData.totalReviews
    : 28;

  const displayAvg = reviewsData?.overallAvg && reviewsData.overallAvg > 0
    ? reviewsData.overallAvg
    : 5.0;

  const displayAvgRounded = Math.round(displayAvg * 10) / 10;
  const displayStars = Math.round(displayAvgRounded);

  useEffect(() => {
    reviewInterval.current = setInterval(() => {
      setActiveReview((prev) => (prev + 1) % displayReviews.length);
    }, 3500);
    return () => { if (reviewInterval.current) clearInterval(reviewInterval.current); };
  }, [displayReviews.length]);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white overflow-x-hidden">

      {/* ─── HEADER ───────────────────────────────────────────────── */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "bg-[#0e0e0e]/95 backdrop-blur-md border-b border-white/5 shadow-xl" : "bg-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <img src={teixeiraLogoPath} alt="Teixeira Barbearia" className="h-10 w-auto" />

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8 text-sm text-white/70">
            <button onClick={() => scrollTo("servicos")} className="hover:text-[#C9A24D] transition-colors">Serviços</button>
            <button onClick={() => scrollTo("equipe")} className="hover:text-[#C9A24D] transition-colors">Equipe</button>
            <button onClick={() => scrollTo("avaliacoes")} className="hover:text-[#C9A24D] transition-colors">Avaliações</button>
            <button onClick={() => scrollTo("contato")} className="hover:text-[#C9A24D] transition-colors">Contato</button>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href={BOOKING_LINK}
              data-testid="button-header-booking"
              className="hidden md:flex items-center gap-2 bg-[#C9A24D] hover:bg-[#b8903e] text-black font-semibold text-sm px-5 py-2.5 rounded-full transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <Calendar className="w-4 h-4" />
              Agendar
            </a>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 text-white/80 hover:text-white transition-colors"
              data-testid="button-menu-toggle"
              aria-label="Menu"
            >
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden bg-[#151515] border-t border-white/5 px-4 py-6 space-y-1">
            {[
              { label: "Serviços", id: "servicos" },
              { label: "Equipe", id: "equipe" },
              { label: "Avaliações", id: "avaliacoes" },
              { label: "Contato", id: "contato" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className="w-full text-left px-4 py-3.5 text-white/80 hover:text-white hover:bg-white/5 rounded-xl transition-all text-base font-medium"
              >
                {item.label}
              </button>
            ))}
            <div className="pt-3 border-t border-white/10 mt-3">
              <a
                href={BOOKING_LINK}
                className="flex items-center justify-center gap-2 w-full bg-[#C9A24D] text-black font-bold py-4 rounded-2xl text-base"
              >
                <Calendar className="w-5 h-5" />
                Agendar Agora
              </a>
            </div>
          </div>
        )}
      </header>

      {/* ─── HERO ─────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-16 pb-32 overflow-hidden md:flex-row md:items-center md:justify-between md:gap-12 md:px-12 md:pb-16 lg:px-24">
        {/* Background layers */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a1408] via-[#0e0e0e] to-[#0e0e0e]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(201,162,77,0.15),transparent)]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#C9A24D]/40 to-transparent" />

        {/* Content — centered on mobile, left column on desktop */}
        <div className="relative z-10 max-w-2xl mx-auto text-center space-y-8 md:max-w-none md:w-1/2 md:mx-0 md:text-left md:space-y-4">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-[#C9A24D]/10 border border-[#C9A24D]/20 text-[#C9A24D] text-xs font-semibold px-4 py-2 rounded-full tracking-widest uppercase">
            <Award className="w-3.5 h-3.5" />
            Est. 2018 · Kobrasol, São José
          </div>

          {/* Logo — visible on mobile only; desktop has it in the fixed navbar */}
          <div className="flex justify-center md:hidden">
            <img
              src={teixeiraLogoPath}
              alt="Teixeira Barbearia"
              className="w-48 sm:w-64 h-auto drop-shadow-2xl"
            />
          </div>

          {/* Headline */}
          <div className="space-y-3">
            <h1 className="font-baskerville text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.15] animate-fadeinup">
              <span className="text-white">Seu visual no </span>
              <span className="text-[#C9A24D] animate-glowpulse">melhor momento</span>
            </h1>
            <p className="text-base sm:text-lg text-white/55 max-w-md mx-auto leading-relaxed md:mx-0">
              A barbearia que transforma seu estilo com tradição, cuidado e o toque que só a Teixeira tem.
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
            <a
              href={BOOKING_LINK}
              data-testid="button-hero-booking"
              className="flex items-center justify-center gap-2 bg-[#C9A24D] hover:bg-[#b8903e] text-black font-bold text-base px-8 py-4 rounded-2xl transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg shadow-[#C9A24D]/20"
            >
              <Calendar className="w-5 h-5" />
              Agendar Horário
            </a>
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="button-hero-whatsapp"
              className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-base px-8 py-4 rounded-2xl transition-all duration-200 hover:scale-105 active:scale-95"
            >
              <MessageCircle className="w-5 h-5 text-[#C9A24D]" />
              WhatsApp
            </a>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-6 sm:gap-10 pt-4 border-t border-white/5 md:justify-start">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-[#C9A24D]">
                {[...Array(5)].map((_, i) => <Star key={i} className={`w-3.5 h-3.5 fill-current ${i < displayStars ? "text-[#C9A24D]" : "text-white/20"}`} />)}
              </div>
              <p className="text-xs text-white/40 mt-1">{totalReviewCount} avaliações</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <p className="text-2xl font-black text-white">{team.length}</p>
              <p className="text-xs text-white/40">profissionais</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <p className="text-2xl font-black text-white">7+</p>
              <p className="text-xs text-white/40">anos de história</p>
            </div>
          </div>
        </div>

        {/* Desktop only: right column with contained video */}
        <div className="hidden md:flex relative z-10 w-1/2 items-center justify-center">
          <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl shadow-black/60 ring-1 ring-white/10">
            <video
              src={droneVideoPath}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-[62vh] object-cover block"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e]/80 via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6 right-6">
              <p className="text-[#C9A24D] text-xs font-semibold tracking-widest uppercase mb-1">Conheça nosso espaço</p>
              <h3 className="text-white font-black text-xl drop-shadow-lg">Teixeira Barbearia</h3>
              <p className="text-white/60 text-sm mt-1">Kobrasol, São José – SC · Desde 2018</p>
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <button
          onClick={() => scrollTo("servicos")}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/20 hover:text-white/50 transition-colors"
        >
          <span className="text-xs tracking-widest uppercase">Ver mais</span>
          <ChevronDown className="w-4 h-4 animate-bounce" />
        </button>
      </section>

      {/* ─── VÍDEO DRONE (mobile only — desktop has it in the hero) ── */}
      <section className="relative w-full overflow-hidden md:hidden" data-testid="section-drone-video">
        <div className="relative w-full">
          <video
            src={droneVideoPath}
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-auto block"
            data-testid="video-drone"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0e0e0e]/60 via-black/20 to-[#0e0e0e]/70" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
            <p className="text-[#C9A24D] text-xs font-semibold tracking-widest uppercase mb-2">Conheça nosso espaço</p>
            <h2 className="text-white text-2xl sm:text-3xl lg:text-4xl font-black drop-shadow-lg">
              Teixeira Barbearia
            </h2>
            <p className="text-white/60 text-sm mt-2 max-w-xs">Kobrasol, São José – SC · Desde 2018</p>
          </div>
        </div>
      </section>

      {/* ─── SERVIÇOS ─────────────────────────────────────────────── */}
      <section id="servicos" className="py-20 px-4 md:py-28">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[#C9A24D] text-xs font-semibold tracking-widest uppercase mb-3">O que oferecemos</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black">Nossos Serviços</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.length === 0 && (
              <div className="col-span-full text-center py-12">
                <p className="text-white/40 text-sm">Nossos serviços serão listados em breve.</p>
                <a href={BOOKING_LINK} className="inline-flex items-center gap-2 mt-4 text-[#C9A24D] text-sm font-semibold hover:underline" data-testid="link-services-booking">
                  <Calendar className="w-4 h-4" />
                  Agende pelo WhatsApp
                </a>
              </div>
            )}
            {services.map((service) => (
              <a
                key={service.name}
                href={BOOKING_LINK}
                data-testid={`card-service-${service.name.toLowerCase().replace(/\s+/g, "-")}`}
                className="group flex items-center justify-between bg-[#151515] hover:bg-[#1a1a1a] border border-white/5 hover:border-[#C9A24D]/20 rounded-2xl p-5 transition-all duration-200 hover:shadow-lg hover:shadow-[#C9A24D]/5 cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#C9A24D]/10 flex items-center justify-center text-xl flex-shrink-0">
                    {service.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white">{service.name}</h3>
                    <div className="flex items-center gap-1.5 mt-1 text-white/40 text-sm">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{service.duration}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[#C9A24D] font-black text-lg">{service.price}</span>
                  <div className="w-8 h-8 rounded-full bg-[#C9A24D]/10 group-hover:bg-[#C9A24D] flex items-center justify-center transition-colors">
                    <ArrowRight className="w-4 h-4 text-[#C9A24D] group-hover:text-black transition-colors" />
                  </div>
                </div>
              </a>
            ))}
          </div>

          <div className="mt-8 text-center">
            <a
              href={BOOKING_LINK}
              data-testid="button-services-cta"
              className="inline-flex items-center gap-2 bg-[#C9A24D] hover:bg-[#b8903e] text-black font-bold px-8 py-4 rounded-2xl transition-all duration-200 hover:scale-105 active:scale-95 text-sm"
            >
              <Calendar className="w-4 h-4" />
              Agendar agora
            </a>
          </div>
        </div>
      </section>

      {/* ─── FOTO INTERIOR ────────────────────────────────────────── */}
      <div className="relative w-full overflow-hidden md:h-[480px] border-y border-[#C9A24D]/30" data-testid="banner-interior">
        <img
          src={interiorPhotoPath}
          alt="Ambiente interno da Teixeira Barbearia"
          loading="lazy"
          className="w-full h-auto block md:h-full md:object-cover md:object-[center_20%]"
        />
        {/* Mobile: dark bottom gradient | Desktop: full dark overlay for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0e0e0e]/50 via-black/10 to-[#111111]/80 md:hidden" />
        <div className="absolute inset-0 hidden md:block bg-gradient-to-r from-black/75 via-black/40 to-black/10" />
        <div className="absolute inset-0 hidden md:block bg-gradient-to-b from-transparent via-transparent to-[#0e0e0e]/60" />

        {/* Mobile: text at bottom center */}
        <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 text-center md:hidden">
          <p className="text-[#C9A24D] text-xs font-semibold tracking-widest uppercase mb-1">Nosso ambiente</p>
          <p className="text-white text-base sm:text-lg font-semibold drop-shadow">Ambiente profissional pensado para você</p>
        </div>

        {/* Desktop: text anchored left, vertically centered */}
        <div className="absolute inset-0 hidden md:flex flex-col justify-center px-16 max-w-2xl">
          <p className="text-[#C9A24D] text-xs font-semibold tracking-widest uppercase mb-3">Nosso ambiente</p>
          <h2 className="text-white text-4xl lg:text-5xl font-black leading-tight drop-shadow-2xl">
            Ambiente profissional<br />pensado para você
          </h2>
          <p className="text-white/60 text-base mt-4 leading-relaxed max-w-sm">
            Um espaço criado com cuidado para proporcionar conforto e estilo a cada visita.
          </p>
        </div>
      </div>

      {/* ─── EQUIPE ───────────────────────────────────────────────── */}
      <section id="equipe" className="py-20 px-4 bg-[#111111] md:py-28">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[#C9A24D] text-xs font-semibold tracking-widest uppercase mb-3">Quem vai cuidar de você</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black">Nossa Equipe</h2>
            <p className="text-white/40 mt-3 text-sm max-w-sm mx-auto">Profissionais apaixonados pelo que fazem, prontos para te atender.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 md:gap-6">
            {team.length === 0 && (
              <div className="col-span-full text-center py-12">
                <p className="text-white/40 text-sm">Nossa equipe será apresentada em breve.</p>
              </div>
            )}
            {team.map((barber) => (
              <div
                key={barber.name}
                className="group bg-[#151515] border border-white/5 hover:border-[#C9A24D]/20 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-[#C9A24D]/5"
                data-testid={`card-barber-${barber.name.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div
                  className={`h-36 md:h-52 flex items-center justify-center relative overflow-hidden${!(barber.coverPhotoUrl || barber.cardBgColor) ? ` bg-gradient-to-br ${barber.color}` : ""}`}
                  style={
                    barber.coverPhotoUrl
                      ? { backgroundImage: `url(${barber.coverPhotoUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
                      : barber.cardBgColor
                      ? { backgroundColor: barber.cardBgColor }
                      : undefined
                  }
                >
                  {barber.coverPhotoUrl || barber.cardBgColor ? (
                    <div className="absolute inset-0 bg-black" style={{ opacity: barber.cardBgOpacity / 100 }} />
                  ) : (
                    <div className="absolute inset-0 bg-[#0e0e0e]/30" />
                  )}
                  {barber.photoUrl ? (
                    <img
                      src={barber.photoUrl}
                      alt={barber.name}
                      className="relative z-10 w-20 h-20 rounded-full object-cover border-2 border-[#C9A24D]/40 shadow-lg"
                    />
                  ) : (
                    <div className="relative z-10 w-20 h-20 rounded-full bg-white/10 backdrop-blur border-2 border-[#C9A24D]/40 flex items-center justify-center">
                      <span className="text-2xl font-black text-[#C9A24D]">{barber.initials}</span>
                    </div>
                  )}
                </div>
                <div className="p-5 space-y-2">
                  <h3 className="font-bold text-lg text-white">{barber.name}</h3>
                  <p className="text-white/40 text-sm leading-relaxed">{barber.role}</p>
                  <div className="flex items-center gap-1.5 pt-1">
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 fill-current ${
                            barber.avgRating > 0
                              ? i < Math.round(barber.avgRating) ? "text-[#C9A24D]" : "text-white/20"
                              : "text-[#C9A24D]"
                          }`}
                        />
                      ))}
                    </div>
                    {barber.avgRating > 0 && (
                      <span className="text-[#C9A24D] text-xs font-bold">{barber.avgRating.toFixed(1)}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── AVALIAÇÕES ───────────────────────────────────────────── */}
      <section id="avaliacoes" className="py-20 px-4 relative overflow-hidden md:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_50%,rgba(201,162,77,0.04),transparent)]" />
        <div className="max-w-6xl mx-auto relative">
          {/* Header — always centered */}
          <div className="text-center mb-12">
            <p className="text-[#C9A24D] text-xs font-semibold tracking-widest uppercase mb-3">O que dizem nossos clientes</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black">Avaliações</h2>
            <div className="flex items-center justify-center gap-2 mt-4">
              <div className="flex">
                {[...Array(5)].map((_, i) => <Star key={i} className={`w-5 h-5 fill-current ${i < displayStars ? "text-[#C9A24D]" : "text-white/20"}`} />)}
              </div>
              <span className="text-white font-bold text-lg">{displayAvgRounded > 0 ? displayAvgRounded.toFixed(1) : "5.0"}</span>
              <span className="text-white/40 text-sm">· {totalReviewCount} avaliações</span>
            </div>
          </div>

          {/* Desktop: 2-column — featured left, mini grid right | Mobile: stacked */}
          <div className="md:grid md:grid-cols-2 md:gap-8 md:items-start">
            {/* Left: featured review + dots */}
            <div>
              {displayReviews.length > 0 && (
                <div className="bg-[#151515] border border-white/5 rounded-3xl p-8 mb-6 min-h-[160px] md:min-h-[280px] flex flex-col justify-between transition-all duration-500">
                  <div>
                    <div className="flex gap-0.5 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-4 h-4 fill-current ${i < (displayReviews[activeReview % displayReviews.length].rating || 5) ? "text-[#C9A24D]" : "text-white/20"}`} />
                      ))}
                    </div>
                    <p className="text-white/80 text-base sm:text-lg md:text-xl leading-relaxed italic">
                      "{displayReviews[activeReview % displayReviews.length].text}"
                    </p>
                  </div>
                  <div className="flex items-center gap-3 mt-6">
                    <div className="w-9 h-9 rounded-full bg-[#C9A24D]/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-[#C9A24D] text-sm font-bold">
                        {displayReviews[activeReview % displayReviews.length].author[0]}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-white">{displayReviews[activeReview % displayReviews.length].author}</p>
                      <p className="text-white/30 text-xs">{displayReviews[activeReview % displayReviews.length].date}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Dot indicators */}
              <div className="flex justify-center gap-2 mb-8 md:justify-start md:mb-0">
                {displayReviews.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setActiveReview(i); if (reviewInterval.current) clearInterval(reviewInterval.current); }}
                    className={`transition-all duration-300 rounded-full ${
                      i === activeReview % displayReviews.length ? "w-6 h-2 bg-[#C9A24D]" : "w-2 h-2 bg-white/20 hover:bg-white/40"
                    }`}
                    data-testid={`button-review-dot-${i}`}
                  />
                ))}
              </div>
            </div>

            {/* Right: mini reviews grid (shows 6 on desktop, 3 on mobile) */}
            <div className="md:mt-0">
              <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-2 gap-3">
                {displayReviews.slice(0, 6).map((review, i) => (
                  <div
                    key={i}
                    onClick={() => setActiveReview(i)}
                    className={`bg-[#151515] border rounded-2xl p-4 cursor-pointer transition-all hover:bg-[#1a1a1a] ${
                      i === activeReview % displayReviews.length ? "border-[#C9A24D]/30" : "border-white/5 hover:border-[#C9A24D]/15"
                    }`}
                    data-testid={`card-review-${i}`}
                  >
                    <div className="flex gap-0.5 mb-2">
                      {[...Array(5)].map((_, j) => (
                        <Star key={j} className={`w-3 h-3 fill-current ${j < (review.rating || 5) ? "text-[#C9A24D]" : "text-white/20"}`} />
                      ))}
                    </div>
                    <p className="text-white/60 text-xs leading-relaxed line-clamp-3">"{review.text}"</p>
                    <p className="text-white/30 text-xs mt-2 font-medium">— {review.author}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── POR QUÊ AGENDAR ONLINE ───────────────────────────────── */}
      <section className="py-16 px-4 bg-[#111111] md:py-20">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-6">
            {[
              { icon: "⚡", title: "Rápido", desc: "Agendamento em menos de 1 minuto" },
              { icon: "📱", title: "Fácil", desc: "Sem cadastro, sem complicação" },
              { icon: "🕐", title: weekdayLabel, desc: "Horário de funcionamento" },
              { icon: "💬", title: "WhatsApp", desc: "Confirmação direto no seu celular" },
            ].map((item) => (
              <div key={item.title} className="bg-[#151515] border border-white/5 rounded-2xl p-5 md:p-8 text-center">
                <div className="text-3xl md:text-4xl mb-3">{item.icon}</div>
                <h3 className="font-bold text-white text-sm md:text-base mb-1">{item.title}</h3>
                <p className="text-white/35 text-xs md:text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CONTATO / LOCALIZAÇÃO ────────────────────────────────── */}
      <section id="contato" className="py-20 px-4 md:py-28">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-[#C9A24D] text-xs font-semibold tracking-widest uppercase mb-3">Onde estamos</p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black">Venha nos visitar</h2>
          </div>

          {/* Facade photo */}
          <div className="relative w-full rounded-3xl overflow-hidden mb-8 md:h-[380px]" data-testid="banner-facade">
            <img
              src={facadePhotoPath}
              alt="Fachada da Teixeira Barbearia"
              loading="lazy"
              className="w-full h-auto block md:h-full md:object-cover md:object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 p-6">
              <p className="text-white font-bold text-lg drop-shadow">Rua Koesa, 430 – Kobrasol, São José</p>
              <p className="text-white/60 text-sm mt-0.5">48 99950-5167 · @teixeirabarbeariaoficial</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {/* Info card */}
            <div className="bg-[#151515] border border-white/5 rounded-3xl p-7 space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-[#C9A24D]/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-[#C9A24D]" />
                </div>
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wide mb-1">Endereço</p>
                  <p className="font-semibold text-white">Rua Koesa, 430, Sala 03</p>
                  <p className="text-white/50 text-sm">Kobrasol, São José – SC</p>
                  <a
                    href={MAPS_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[#C9A24D] text-xs mt-2 hover:underline"
                    data-testid="link-google-maps"
                  >
                    Ver no mapa →
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-[#C9A24D]/10 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-[#C9A24D]" />
                </div>
                <div>
                  <p className="text-white/40 text-xs uppercase tracking-wide mb-1">Telefone</p>
                  <a
                    href={`tel:+55${WHATSAPP_NUMBER.slice(2)}`}
                    className="font-semibold text-white hover:text-[#C9A24D] transition-colors"
                    data-testid="link-phone"
                  >
                    (48) 99950-5167
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-[#C9A24D]/10 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-[#C9A24D]" />
                </div>
                <div className="flex-1">
                  <p className="text-white/40 text-xs uppercase tracking-wide mb-2">Horários</p>
                  <div className="space-y-2">
                    {hours.map((h) => (
                      <div key={h.day} className="flex items-center justify-between">
                        <span className="text-white/60 text-sm">{h.day}</span>
                        <span className={`text-sm font-medium ${h.open ? "text-white" : "text-white/30"}`}>
                          {h.time}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Social links */}
              <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                <a
                  href={INSTAGRAM_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="link-instagram"
                  className="flex items-center gap-2 flex-1 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl px-4 py-3 transition-all"
                >
                  <Instagram className="w-4 h-4 text-pink-400" />
                  <span className="text-sm text-white/70">@teixeirabarbeariaoficial</span>
                </a>
              </div>
            </div>

            {/* CTA card */}
            <div className="bg-gradient-to-br from-[#1a1408] to-[#151515] border border-[#C9A24D]/20 rounded-3xl p-7 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-[#C9A24D]/10 flex items-center justify-center">
                  <Scissors className="w-7 h-7 text-[#C9A24D]" />
                </div>
                <h3 className="text-2xl font-black text-white">Pronto para o seu novo visual?</h3>
                <p className="text-white/50 text-sm leading-relaxed">
                  Escolha seu serviço, seu barbeiro preferido e o horário que funciona pra você. Rápido, fácil e sem fila.
                </p>
              </div>
              <div className="space-y-3 mt-8">
                <a
                  href={BOOKING_LINK}
                  data-testid="button-contact-booking"
                  className="flex items-center justify-center gap-2 w-full bg-[#C9A24D] hover:bg-[#b8903e] text-black font-bold py-4 rounded-2xl transition-all hover:scale-105 active:scale-95"
                >
                  <Calendar className="w-5 h-5" />
                  Agendar Horário
                </a>
                <a
                  href={WHATSAPP_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="button-contact-whatsapp"
                  className="flex items-center justify-center gap-2 w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold py-4 rounded-2xl transition-all"
                >
                  <MessageCircle className="w-5 h-5 text-[#C9A24D]" />
                  Falar no WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ───────────────────────────────────────────────── */}
      <footer className="bg-[#0a0a0a] border-t border-white/5 py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex flex-col items-center sm:items-start gap-2">
              <img src={teixeiraLogoPath} alt="Teixeira Barbearia" className="h-8 w-auto opacity-80" />
              <p className="text-white/30 text-xs">Rua Koesa, 430 · Kobrasol, São José – SC</p>
            </div>
            <div className="flex flex-col items-center sm:items-end gap-2">
              <div className="flex items-center gap-4">
                <a href={INSTAGRAM_LINK} target="_blank" rel="noopener noreferrer" data-testid="footer-link-instagram" className="text-white/30 hover:text-white/70 transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" data-testid="footer-link-whatsapp" className="text-white/30 hover:text-white/70 transition-colors">
                  <MessageCircle className="w-5 h-5" />
                </a>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-white/20 text-xs">© 2025 Teixeira Barbearia. Todos os direitos reservados.</p>
                <span className="text-white/10">·</span>
                <a href="/login" data-testid="link-owner-login" className="inline-flex items-center gap-1 text-white/15 hover:text-white/40 text-[10px] transition-colors">
                  <Lock className="w-2.5 h-2.5" />
                  Área do Proprietário
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* ─── WHATSAPP FLOATING BUTTON ─────────────────────────────── */}
      <a
        href={WHATSAPP_LINK}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="button-whatsapp-fab"
        className="fixed bottom-24 right-4 sm:bottom-8 sm:right-6 z-50 w-14 h-14 bg-[#0e0e0e] border border-[#C9A24D]/50 hover:border-[#C9A24D] rounded-full flex items-center justify-center shadow-2xl shadow-[#C9A24D]/20 transition-all duration-200 hover:scale-110 active:scale-95"
        aria-label="Falar no WhatsApp"
      >
        <MessageCircle className="w-7 h-7 text-[#C9A24D]" />
      </a>

      {/* ─── MOBILE STICKY BOTTOM CTA ─────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#0e0e0e]/95 backdrop-blur-md border-t border-white/5 px-4 py-3 safe-area-bottom">
        <a
          href={BOOKING_LINK}
          data-testid="button-mobile-sticky-booking"
          className="flex items-center justify-center gap-2 w-full bg-[#C9A24D] hover:bg-[#b8903e] text-black font-bold text-base py-3.5 rounded-2xl transition-all active:scale-95"
        >
          <Calendar className="w-5 h-5" />
          Agendar Agora — é rápido e grátis
        </a>
      </div>
    </div>
  );
}
