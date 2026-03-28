import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, registerAuthRoutes, seedOwner } from "./auth";
import { format, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { whatsappService } from "./whatsapp";
import { BOOKING_URL } from "./reminder";

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);
  await seedOwner();

  // Get or create user's barbershop
  const getBarbershopForUser = async (_userId: string) => {
    let barbershop = await storage.getBarbershopBySlug("teixeira");
    if (!barbershop) {
      barbershop = await storage.getFirstBarbershop();
    }
    if (!barbershop) {
      barbershop = await storage.createBarbershop({
        ownerId: _userId,
        name: "Teixeira Barbearia",
        slug: "teixeira",
      });
    }
    return barbershop;
  };

  // ===== PUBLIC CLIENT ROUTES (BLOCO 1) =====

  app.get("/api/public/barbershops/:slug", async (req: Request, res: Response) => {
    try {
      const barbershop = await storage.getBarbershopBySlug(req.params.slug);
      if (!barbershop) {
        return res.status(404).json({ message: "Barbearia não encontrada" });
      }
      res.json(barbershop);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar barbearia" });
    }
  });

  app.get("/api/public/barbershops/:slug/services", async (req: Request, res: Response) => {
    try {
      const barbershop = await storage.getBarbershopBySlug(req.params.slug);
      if (!barbershop) {
        return res.status(404).json({ message: "Barbearia não encontrada" });
      }
      const services = await storage.getServices(barbershop.id);
      res.json(services);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar serviços" });
    }
  });

  app.get("/api/public/barbershops/:slug/barbers", async (req: Request, res: Response) => {
    try {
      const barbershop = await storage.getBarbershopBySlug(req.params.slug);
      if (!barbershop) {
        return res.status(404).json({ message: "Barbearia não encontrada" });
      }
      const barbers = await storage.getBarbers(barbershop.id);
      const activeBarbers = barbers.filter(b => b.isActive);
      const barbersWithRatings = await Promise.all(
        activeBarbers.map(async (b) => ({
          ...b,
          avgRating: await storage.getBarberAverageRating(b.id),
        }))
      );
      res.json(barbersWithRatings);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar barbeiros" });
    }
  });

  app.get("/api/public/barbershops/:slug/reviews", async (req: Request, res: Response) => {
    try {
      const barbershop = await storage.getBarbershopBySlug(req.params.slug);
      if (!barbershop) {
        return res.status(404).json({ message: "Barbearia não encontrada" });
      }
      const allReviews = await storage.getReviews(barbershop.id);
      const publicReviews = allReviews.filter(r => r.isPublic);

      const barbershopRatings = publicReviews.map(r => r.barbershopRating).filter((r): r is number => r != null);
      const barberRatings = publicReviews.map(r => r.rating).filter((r): r is number => r != null);
      const allRatings = [...barbershopRatings, ...barberRatings];

      const avgBarbershopRating = barbershopRatings.length > 0
        ? barbershopRatings.reduce((s, r) => s + r, 0) / barbershopRatings.length
        : 0;
      const avgBarberRating = barberRatings.length > 0
        ? barberRatings.reduce((s, r) => s + r, 0) / barberRatings.length
        : 0;
      const overallAvg = allRatings.length > 0
        ? allRatings.reduce((s, r) => s + r, 0) / allRatings.length
        : 0;

      const testimonials = publicReviews
        .filter(r => r.comment && r.comment.trim().length > 0)
        .slice(0, 20);

      res.json({
        reviews: publicReviews,
        testimonials,
        avgBarbershopRating: Math.round(avgBarbershopRating * 10) / 10,
        avgBarberRating: Math.round(avgBarberRating * 10) / 10,
        overallAvg: Math.round(overallAvg * 10) / 10,
        totalReviews: publicReviews.length,
        totalWithRating: allRatings.length,
      });
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar avaliações" });
    }
  });

  app.get("/api/public/barbershops/:slug/availability", async (req: Request, res: Response) => {
    try {
      const barbershop = await storage.getBarbershopBySlug(req.params.slug);
      if (!barbershop) {
        return res.status(404).json({ message: "Barbearia não encontrada" });
      }

      const { barberId, date, serviceId } = req.query as { barberId?: string; date?: string; serviceId?: string };
      if (!barberId || !date) {
        return res.status(400).json({ message: "barberId e date são obrigatórios" });
      }

      const barber = await storage.getBarber(barberId);
      if (!barber || barber.barbershopId !== barbershop.id) {
        return res.status(404).json({ message: "Barbeiro não encontrado" });
      }

      let serviceDuration = 30;
      if (serviceId) {
        const service = await storage.getService(serviceId);
        if (service) serviceDuration = service.duration;
      }

      const existingAppointments = await storage.getAppointmentsByBarber(barberId, date);
      const bookedSlots = existingAppointments
        .filter(a => a.status !== "cancelled")
        .map(a => ({ start: a.startTime, end: a.endTime }));

      const openingTime = barbershop.openingTime || "09:00";
      const closingTime = barbershop.closingTime || "19:00";
      const barberStart = barber.workStartTime || openingTime;
      const barberEnd = barber.workEndTime || closingTime;

      const startMinutes = timeToMinutes(barberStart);
      const endMinutes = timeToMinutes(barberEnd);

      const slots: string[] = [];
      const allSlots: string[] = [];
      for (let m = startMinutes; m + serviceDuration <= endMinutes; m += 30) {
        const slotStart = minutesToTime(m);

        const hasConflict = bookedSlots.some(booked => {
          const bookedStart = timeToMinutes(booked.start);
          const bookedEnd = timeToMinutes(booked.end);
          return m < bookedEnd && (m + serviceDuration) > bookedStart;
        });

        allSlots.push(slotStart);
        if (!hasConflict) {
          slots.push(slotStart);
        }
      }

      res.json({ slots, allSlots, date, barberId });
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar disponibilidade" });
    }
  });

  app.get("/api/public/barbershops/:slug/barbers-for-slot", async (req: Request, res: Response) => {
    try {
      const barbershop = await storage.getBarbershopBySlug(req.params.slug);
      if (!barbershop) return res.status(404).json({ message: "Barbearia não encontrada" });

      const { date, time, serviceId } = req.query as { date?: string; time?: string; serviceId?: string };
      if (!date || !time) return res.status(400).json({ message: "date e time são obrigatórios" });

      let serviceDuration = 30;
      if (serviceId) {
        const service = await storage.getService(serviceId);
        if (service) serviceDuration = service.duration;
      }

      const allBarbers = await storage.getBarbers(barbershop.id);
      const reqStart = timeToMinutes(time);
      const reqEnd = reqStart + serviceDuration;

      const result = await Promise.all(allBarbers.map(async (barber) => {
        const barberStart = timeToMinutes(barber.workStartTime || barbershop.openingTime || "09:00");
        const barberEnd = timeToMinutes(barber.workEndTime || barbershop.closingTime || "19:00");

        if (reqStart < barberStart || reqEnd > barberEnd) {
          return { ...barber, available: false, nextSlots: [] as string[] };
        }

        const appointments = await storage.getAppointmentsByBarber(barber.id, date);
        const bookedSlots = appointments
          .filter(a => a.status !== "cancelled")
          .map(a => ({ start: a.startTime, end: a.endTime }));

        const hasConflict = bookedSlots.some(b =>
          reqStart < timeToMinutes(b.end) && reqEnd > timeToMinutes(b.start)
        );

        if (!hasConflict) return { ...barber, available: true, nextSlots: [] as string[] };

        const nextSlots: string[] = [];
        for (let m = barberStart; m + serviceDuration <= barberEnd; m += 30) {
          if (m === reqStart) continue;
          const conflict = bookedSlots.some(b =>
            m < timeToMinutes(b.end) && (m + serviceDuration) > timeToMinutes(b.start)
          );
          if (!conflict) nextSlots.push(minutesToTime(m));
        }

        return { ...barber, available: false, nextSlots };
      }));

      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar disponibilidade dos barbeiros" });
    }
  });

  app.post("/api/public/appointments", async (req: Request, res: Response) => {
    try {
      const { slug, clientName, clientPhone, date, startTime, endTime, barberId, serviceId } = req.body;

      if (!slug || !clientName || !clientPhone || !date || !startTime || !endTime || !barberId || !serviceId) {
        return res.status(400).json({ message: "Todos os campos são obrigatórios" });
      }

      const barbershop = await storage.getBarbershopBySlug(slug);
      if (!barbershop) {
        return res.status(404).json({ message: "Barbearia não encontrada" });
      }

      const service = await storage.getService(serviceId);
      if (!service || service.barbershopId !== barbershop.id) {
        return res.status(404).json({ message: "Serviço não encontrado" });
      }

      const barber = await storage.getBarber(barberId);
      if (!barber || barber.barbershopId !== barbershop.id) {
        return res.status(404).json({ message: "Barbeiro não encontrado" });
      }

      const existingAppointments = await storage.getAppointmentsByBarber(barberId, date);
      const reqStart = timeToMinutes(startTime);
      const reqEnd = timeToMinutes(endTime);
      const hasConflict = existingAppointments
        .filter(a => a.status !== "cancelled")
        .some(a => {
          const aStart = timeToMinutes(a.startTime);
          const aEnd = timeToMinutes(a.endTime);
          return reqStart < aEnd && reqEnd > aStart;
        });

      if (hasConflict) {
        return res.status(409).json({ message: "Horário indisponível. Outro agendamento já existe neste período." });
      }

      const appointment = await storage.createAppointment({
        barbershopId: barbershop.id,
        barberId,
        serviceId,
        date,
        startTime,
        endTime,
        price: service.price,
        clientName,
        clientPhone,
        status: "pending",
      });

      try {
        const barberInfo = await storage.getBarber(barberId);
        const apptDate = new Date(date + "T12:00:00");
        const diaSemana = format(apptDate, "EEEE", { locale: ptBR });
        const diaSemanaCapit = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);
        const dataFmt = format(apptDate, "dd/MM/yyyy");
        const msg =
          `Olá, *${clientName}*! ✂️\n\n` +
          `Recebemos seu agendamento aqui na *Teixeira Barbearia*. Tudo pronto para o seu ritual!\n\n` +
          `📅 *Data:* ${diaSemanaCapit}, ${dataFmt}\n` +
          `⏰ *Horário:* ${startTime}\n` +
          `👤 *Barbeiro:* ${barberInfo?.name || "A definir"}\n` +
          `🛠️ *Serviço:* ${service.name}\n\n` +
          `📍 Estamos na Rua Koesa, 430 (Kobrasol).\n` +
          `☕ O café já está no fogo. Te esperamos!\n\n` +
          `_Responda esta mensagem se precisar remarcar ou cancelar._`;
        const sent = await whatsappService.sendMessage(clientPhone, msg);
        if (sent) {
          await storage.markReminderSent(appointment.id);
          await storage.updateAppointmentStatus(appointment.id, "confirmed");
        }
      } catch (_) {}

      res.status(201).json(appointment);
    } catch (error) {
      res.status(500).json({ message: "Erro ao criar agendamento" });
    }
  });

  // ===== EXISTING AUTHENTICATED ROUTES =====

  // Barbershop routes
  app.get("/api/barbershop", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      res.json(barbershop);
    } catch (error) {
      res.status(500).json({ message: "Error fetching barbershop" });
    }
  });

  app.patch("/api/barbershop", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const updated = await storage.updateBarbershop(barbershop.id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Error updating barbershop" });
    }
  });

  // Public barbershop routes for booking
  app.get("/api/barbershops/:slug", async (req: Request, res: Response) => {
    try {
      const barbershop = await storage.getBarbershopBySlug(req.params.slug);
      if (!barbershop) {
        return res.status(404).json({ message: "Barbershop not found" });
      }
      res.json(barbershop);
    } catch (error) {
      res.status(500).json({ message: "Error fetching barbershop" });
    }
  });

  app.get("/api/barbershops/:slug/services", async (req: Request, res: Response) => {
    try {
      const barbershop = await storage.getBarbershopBySlug(req.params.slug);
      if (!barbershop) {
        return res.status(404).json({ message: "Barbershop not found" });
      }
      const services = await storage.getServices(barbershop.id);
      res.json(services);
    } catch (error) {
      res.status(500).json({ message: "Error fetching services" });
    }
  });

  app.get("/api/barbershops/:slug/barbers", async (req: Request, res: Response) => {
    try {
      const barbershop = await storage.getBarbershopBySlug(req.params.slug);
      if (!barbershop) {
        return res.status(404).json({ message: "Barbershop not found" });
      }
      const barbers = await storage.getBarbers(barbershop.id);
      res.json(barbers);
    } catch (error) {
      res.status(500).json({ message: "Error fetching barbers" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const today = format(new Date(), "yyyy-MM-dd");
      const todayAppointments = await storage.getAppointments(barbershop.id, today);
      const allTransactions = await storage.getTransactions(barbershop.id);
      const clients = await storage.getClients(barbershop.id);
      const allBarbers = await storage.getBarbers(barbershop.id);
      const activeBarbers = allBarbers.filter(b => b.isActive);

      const todayTransactions = allTransactions.filter(t => t.date === today);

      const todayRevenue = todayTransactions
        .filter((t) => t.type !== "expense" && t.type !== "refund")
        .reduce((sum, t) => sum + parseFloat(t.amount?.toString() || "0"), 0);

      const currentMonth = format(new Date(), "yyyy-MM");
      const monthlyRevenue = allTransactions
        .filter((t) => t.date?.startsWith(currentMonth) && t.type !== "expense" && t.type !== "refund")
        .reduce((sum, t) => sum + parseFloat(t.amount?.toString() || "0"), 0);

      const openTime = barbershop.openingTime || "09:00";
      const closeTime = barbershop.closingTime || "19:00";
      const openH = parseInt(openTime.split(":")[0]);
      const closeH = parseInt(closeTime.split(":")[0]);
      const totalSlots = activeBarbers.length * (closeH - openH) * 2;
      const activeAppts = todayAppointments.filter(a => a.status !== "cancelled");
      const occupancyRate = totalSlots > 0 ? Math.round((activeAppts.length / totalSlots) * 100) : 0;

      const normalizePayment = (method: string | null | undefined): string => {
        const m = (method || "").toLowerCase();
        if (m === "pix") return "PIX";
        if (m === "cash" || m === "dinheiro") return "Dinheiro";
        if (m === "credit" || m === "debit" || m === "crédito" || m === "débito" || m === "cartão") return "Cartão";
        return "Outro";
      };

      const paymentBreakdown: Record<string, number> = {};
      todayTransactions
        .filter(t => t.type !== "expense" && t.type !== "refund")
        .forEach(t => {
          const method = normalizePayment(t.paymentMethod);
          paymentBreakdown[method] = (paymentBreakdown[method] || 0) + parseFloat(t.amount?.toString() || "0");
        });

      const pendingCommissions = todayTransactions
        .filter(t => t.type === "service" && t.commissionAmount)
        .reduce((sum, t) => sum + parseFloat(t.commissionAmount?.toString() || "0"), 0);

      const botConfirmed = todayAppointments.filter(a => a.status === "confirmed" && a.reminderSent).length;

      const now = new Date();
      const nowTime = format(now, "HH:mm");
      const upcomingAppts = todayAppointments
        .filter(a => a.startTime >= nowTime && a.status !== "cancelled" && a.status !== "completed")
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
      const nextAppt = upcomingAppts[0] || null;

      let nextClientInfo = null;
      if (nextAppt) {
        const clientPhone = nextAppt.clientPhone;
        const allAppts = await storage.getAppointments(barbershop.id);
        const clientVisits = clientPhone
          ? allAppts.filter(a => a.clientPhone === clientPhone && a.status === "completed").length
          : 0;
        nextClientInfo = {
          clientName: nextAppt.clientName || "Cliente",
          clientPhone: nextAppt.clientPhone,
          barberId: nextAppt.barberId,
          startTime: nextAppt.startTime,
          visitCount: clientVisits,
          isNew: clientVisits === 0,
          isVIP: clientVisits >= 10,
        };
      }

      const latestReview = (await storage.getReviews(barbershop.id))[0] || null;
      const productVelocity = await storage.getProductVelocity(barbershop.id, 30);

      res.json({
        todayAppointments: todayAppointments.length,
        todayRevenue,
        monthlyRevenue,
        occupancyRate,
        paymentBreakdown,
        pendingCommissions,
        botConfirmed,
        nextClientInfo,
        latestReview,
        productVelocity,
        pendingAppointments: todayAppointments.filter((a) => a.status === "pending").length,
        newClients: clients.filter((c) => {
          const created = c.createdAt ? new Date(c.createdAt) : null;
          if (!created) return false;
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return created >= thirtyDaysAgo;
        }).length,
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching stats" });
    }
  });

  // Appointments
  app.get("/api/appointments", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const date = req.query.date as string | undefined;
      const detailed = req.query.detailed as string | undefined;
      if (detailed === "true") {
        const appointments = await storage.getAppointmentsWithDetails(barbershop.id, date);
        return res.json(appointments);
      }
      const appointments = await storage.getAppointments(barbershop.id, date);
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ message: "Error fetching appointments" });
    }
  });

  app.get("/api/appointments/today", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const today = format(new Date(), "yyyy-MM-dd");
      const appointments = await storage.getAppointmentsWithDetails(barbershop.id, today);
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ message: "Error fetching appointments" });
    }
  });

  app.post("/api/appointments", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const appointment = await storage.createAppointment({
        ...req.body,
        barbershopId: barbershop.id,
      });
      res.status(201).json(appointment);
    } catch (error) {
      res.status(500).json({ message: "Error creating appointment" });
    }
  });

  app.patch("/api/appointments/:id/status", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const existing = await storage.getAppointment(req.params.id);
      if (!existing || existing.barbershopId !== barbershop.id) {
        return res.status(404).json({ message: "Agendamento não encontrado" });
      }
      const appointment = await storage.updateAppointmentStatus(req.params.id, req.body.status);

      if (req.body.status === "cancelled" && existing.clientPhone) {
        try {
          const dataFmt = format(new Date(existing.date + "T12:00:00"), "dd/MM/yyyy");
          const msg =
            `Olá, *${existing.clientName}*.\n\n` +
            `Passando para confirmar que o seu agendamento para o dia *${dataFmt}* às *${existing.startTime}* foi cancelado.\n\n` +
            `Se desejar escolher um novo horário, você pode fazer isso rapidinho por este link:\n${BOOKING_URL}\n\n` +
            `Esperamos te ver em breve! 👋`;
          await whatsappService.sendMessage(existing.clientPhone, msg);
        } catch (_) {}
      }

      res.json(appointment);
    } catch (error) {
      res.status(500).json({ message: "Error updating appointment" });
    }
  });

  app.post("/api/appointments/:id/checkout", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const existing = await storage.getAppointment(req.params.id);
      if (!existing || existing.barbershopId !== barbershop.id) {
        return res.status(404).json({ message: "Agendamento não encontrado" });
      }
      if (existing.status === "completed") {
        return res.status(400).json({ message: "Agendamento já foi finalizado" });
      }

      const { paymentMethod, finalPrice, extraServiceIds = [], products: soldProducts = [] } = req.body;
      if (!paymentMethod) {
        return res.status(400).json({ message: "Forma de pagamento é obrigatória" });
      }

      const extraServices: { serviceId: string; price: number }[] = [];
      for (const serviceId of extraServiceIds) {
        const svc = await storage.getService(serviceId);
        if (svc) extraServices.push({ serviceId, price: parseFloat(svc.price?.toString() || "0") });
      }

      const productsData: { productId: string; quantity: number; unitPrice: number }[] = [];
      for (const p of soldProducts) {
        const prod = await storage.getProduct(p.productId);
        if (prod) productsData.push({ productId: p.productId, quantity: p.quantity || 1, unitPrice: parseFloat(prod.price?.toString() || "0") });
      }

      const basePrice = parseFloat(existing.price?.toString() || "0");
      const calculatedTotal = basePrice
        + extraServices.reduce((s, e) => s + e.price, 0)
        + productsData.reduce((s, p) => s + p.unitPrice * p.quantity, 0);
      const effectiveFinalPrice = typeof finalPrice === "number" ? finalPrice : calculatedTotal;

      const appointment = await storage.completeAppointmentCheckout(req.params.id, {
        paymentMethod,
        finalPrice: effectiveFinalPrice,
        extraServices,
        products: productsData,
        barbershopId: barbershop.id,
      });

      res.json(appointment);
    } catch (error) {
      console.error("Checkout error:", error);
      res.status(500).json({ message: "Erro ao finalizar atendimento" });
    }
  });

  // Barbers
  app.get("/api/barbers", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const barbers = await storage.getBarbers(barbershop.id);
      const barbersWithRatings = await Promise.all(
        barbers.map(async (b) => ({
          ...b,
          avgRating: await storage.getBarberAverageRating(b.id),
        }))
      );
      res.json(barbersWithRatings);
    } catch (error) {
      res.status(500).json({ message: "Error fetching barbers" });
    }
  });

  app.post("/api/barbers", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const barber = await storage.createBarber({
        ...req.body,
        barbershopId: barbershop.id,
      });
      res.status(201).json(barber);
    } catch (error) {
      res.status(500).json({ message: "Error creating barber" });
    }
  });

  app.patch("/api/barbers/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const barber = await storage.getBarber(req.params.id);
      if (!barber || barber.barbershopId !== barbershop.id) {
        return res.status(404).json({ message: "Barber not found" });
      }
      const updated = await storage.updateBarber(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Error updating barber" });
    }
  });

  app.delete("/api/barbers/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const barber = await storage.getBarber(req.params.id);
      if (!barber || barber.barbershopId !== barbershop.id) {
        return res.status(404).json({ message: "Barber not found" });
      }
      await storage.deleteBarber(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting barber" });
    }
  });

  // Services
  app.get("/api/services", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const services = await storage.getServices(barbershop.id);
      res.json(services);
    } catch (error) {
      res.status(500).json({ message: "Error fetching services" });
    }
  });

  app.post("/api/services", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const service = await storage.createService({
        ...req.body,
        barbershopId: barbershop.id,
      });
      res.status(201).json(service);
    } catch (error) {
      res.status(500).json({ message: "Error creating service" });
    }
  });

  app.patch("/api/services/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const service = await storage.getService(req.params.id);
      if (!service || service.barbershopId !== barbershop.id) {
        return res.status(404).json({ message: "Service not found" });
      }
      const updated = await storage.updateService(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Error updating service" });
    }
  });

  app.delete("/api/services/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const service = await storage.getService(req.params.id);
      if (!service || service.barbershopId !== barbershop.id) {
        return res.status(404).json({ message: "Service not found" });
      }
      await storage.deleteService(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting service" });
    }
  });

  // Service Categories
  app.get("/api/service-categories", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const categories = await storage.getServiceCategories(barbershop.id);
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Error fetching categories" });
    }
  });

  app.post("/api/service-categories", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const category = await storage.createServiceCategory({
        ...req.body,
        barbershopId: barbershop.id,
      });
      res.status(201).json(category);
    } catch (error) {
      res.status(500).json({ message: "Error creating category" });
    }
  });

  // Clients
  app.get("/api/clients", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const clients = await storage.getClients(barbershop.id);
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: "Error fetching clients" });
    }
  });

  app.post("/api/clients", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const client = await storage.createClient({
        ...req.body,
        barbershopId: barbershop.id,
      });
      res.status(201).json(client);
    } catch (error) {
      res.status(500).json({ message: "Error creating client" });
    }
  });

  app.patch("/api/clients/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const client = await storage.updateClient(req.params.id, req.body);
      res.json(client);
    } catch (error) {
      res.status(500).json({ message: "Error updating client" });
    }
  });

  // Products
  app.get("/api/products", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const products = await storage.getProducts(barbershop.id);
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Error fetching products" });
    }
  });

  app.post("/api/products", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const product = await storage.createProduct({
        ...req.body,
        barbershopId: barbershop.id,
      });
      res.status(201).json(product);
    } catch (error: any) {
      console.error("[Products] Erro ao criar produto:", error?.message ?? error);
      res.status(500).json({ message: "Error creating product", detail: error?.message });
    }
  });

  app.patch("/api/products/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const product = await storage.getProduct(req.params.id);
      if (!product || product.barbershopId !== barbershop.id) {
        return res.status(404).json({ message: "Product not found" });
      }
      const updated = await storage.updateProduct(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Error updating product" });
    }
  });

  app.delete("/api/products/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const product = await storage.getProduct(req.params.id);
      if (!product || product.barbershopId !== barbershop.id) {
        return res.status(404).json({ message: "Product not found" });
      }
      await storage.deleteProduct(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting product" });
    }
  });

  // Transactions
  app.get("/api/transactions", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const transactions = await storage.getTransactions(barbershop.id);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Error fetching transactions" });
    }
  });

  app.get("/api/transactions/recent", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const transactions = await storage.getTransactions(barbershop.id);
      res.json(transactions.slice(0, 10));
    } catch (error) {
      res.status(500).json({ message: "Error fetching transactions" });
    }
  });

  app.post("/api/transactions", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const transaction = await storage.createTransaction({
        ...req.body,
        barbershopId: barbershop.id,
      });
      res.status(201).json(transaction);
    } catch (error) {
      res.status(500).json({ message: "Error creating transaction" });
    }
  });

  // Finance stats
  app.get("/api/finances/stats", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const transactions = await storage.getTransactions(barbershop.id);
      const today = format(new Date(), "yyyy-MM-dd");
      const currentMonth = format(new Date(), "yyyy-MM");

      const todayRevenue = transactions
        .filter((t) => t.date === today && t.type !== "expense" && t.type !== "refund")
        .reduce((sum, t) => sum + parseFloat(t.amount?.toString() || "0"), 0);

      const monthlyRevenue = transactions
        .filter((t) => t.date?.startsWith(currentMonth) && t.type !== "expense" && t.type !== "refund")
        .reduce((sum, t) => sum + parseFloat(t.amount?.toString() || "0"), 0);

      const monthlyExpenses = transactions
        .filter((t) => t.date?.startsWith(currentMonth) && (t.type === "expense" || t.type === "refund"))
        .reduce((sum, t) => sum + parseFloat(t.amount?.toString() || "0"), 0);

      res.json({
        todayRevenue,
        monthlyRevenue,
        monthlyExpenses,
        netProfit: monthlyRevenue - monthlyExpenses,
        pendingPayments: 0,
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching stats" });
    }
  });

  // Cashflow (period-filtered transactions)
  app.get("/api/finances/cashflow", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const { start, end } = req.query as { start?: string; end?: string };
      const today = format(new Date(), "yyyy-MM-dd");
      const startDate = start || format(startOfMonth(new Date()), "yyyy-MM-dd");
      const endDate = end || today;
      const txns = await storage.getTransactionsByPeriod(barbershop.id, startDate, endDate);
      const totalIn = txns.filter(t => t.type !== "expense" && t.type !== "refund").reduce((s, t) => s + parseFloat(t.amount?.toString() || "0"), 0);
      const totalOut = txns.filter(t => t.type === "expense" || t.type === "refund").reduce((s, t) => s + parseFloat(t.amount?.toString() || "0"), 0);
      res.json({ transactions: txns, totalIn, totalOut, balance: totalIn - totalOut });
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar fluxo de caixa" });
    }
  });

  // Manual transaction creation
  app.post("/api/finances/transactions", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const txn = await storage.createTransaction({
        ...req.body,
        barbershopId: barbershop.id,
      });
      res.json(txn);
    } catch (error) {
      res.status(500).json({ message: "Erro ao criar lançamento" });
    }
  });

  // Commissions pending per barber
  app.get("/api/finances/commissions", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const allBarbers = await storage.getBarbers(barbershop.id);
      const allTxns = await storage.getTransactions(barbershop.id);
      const allPayments = await storage.getCommissionPayments(barbershop.id);

      const result = allBarbers.filter(b => b.isActive).map(barber => {
        const earned = allTxns
          .filter(t => t.barberId === barber.id && t.commissionAmount && parseFloat(t.commissionAmount.toString()) > 0)
          .reduce((s, t) => s + parseFloat(t.commissionAmount?.toString() || "0"), 0);
        const paid = allPayments
          .filter(p => p.barberId === barber.id)
          .reduce((s, p) => s + parseFloat(p.amount?.toString() || "0"), 0);
        const lastPayment = allPayments.filter(p => p.barberId === barber.id).sort((a, b) => new Date(b.paidAt!).getTime() - new Date(a.paidAt!).getTime())[0];
        return {
          barberId: barber.id,
          barberName: barber.name,
          barberPhotoUrl: barber.photoUrl || null,
          accumulated: Math.max(0, earned - paid),
          totalEarned: earned,
          totalPaid: paid,
          lastPaidAt: lastPayment?.paidAt || null,
          commissionRate: barber.commissionRate,
        };
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar comissões" });
    }
  });

  // Pay a commission
  app.post("/api/finances/commissions/pay", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const { barberId, amount, period, notes } = req.body;
      const payment = await storage.createCommissionPayment({
        barbershopId: barbershop.id,
        barberId,
        amount,
        period: period || format(new Date(), "yyyy-MM"),
        notes,
      });
      res.status(201).json(payment);
    } catch (error) {
      res.status(500).json({ message: "Erro ao registrar pagamento de comissão" });
    }
  });

  // Fixed Expenses CRUD
  app.get("/api/finances/fixed-expenses", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const expenses = await storage.getFixedExpenses(barbershop.id);
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar despesas fixas" });
    }
  });

  app.post("/api/finances/fixed-expenses", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const expense = await storage.createFixedExpense({ ...req.body, barbershopId: barbershop.id });
      res.status(201).json(expense);
    } catch (error) {
      res.status(500).json({ message: "Erro ao criar despesa fixa" });
    }
  });

  app.patch("/api/finances/fixed-expenses/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const expense = await storage.updateFixedExpense(req.params.id, req.body);
      res.json(expense);
    } catch (error) {
      res.status(500).json({ message: "Erro ao atualizar despesa fixa" });
    }
  });

  app.delete("/api/finances/fixed-expenses/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      await storage.deleteFixedExpense(req.params.id);
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ message: "Erro ao excluir despesa fixa" });
    }
  });

  // Receivables (upcoming confirmed appointments)
  app.get("/api/finances/receivables", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const days = parseInt((req.query.days as string) || "7", 10);
      const appts = await storage.getUpcomingAppointments(barbershop.id, days);
      const total = appts.reduce((s, a) => s + parseFloat(a.price?.toString() || "0"), 0);
      res.json({ appointments: appts, total });
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar contas a receber" });
    }
  });

  // Revenue detail by service and product
  app.get("/api/finances/revenue-detail", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const { start, end } = req.query as { start?: string; end?: string };
      const startDate = start || format(startOfMonth(new Date()), "yyyy-MM-dd");
      const endDate = end || format(new Date(), "yyyy-MM-dd");
      const [byService, byProduct] = await Promise.all([
        storage.getRevenueByService(barbershop.id, startDate, endDate),
        storage.getRevenueByProduct(barbershop.id, startDate, endDate),
      ]);
      res.json({ byService, byProduct });
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar receita detalhada" });
    }
  });

  // Bills CRUD
  app.get("/api/finances/bills", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const allBills = await storage.getBills(barbershop.id);
      res.json(allBills);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar contas" });
    }
  });

  app.post("/api/finances/bills", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const bill = await storage.createBill({ ...req.body, barbershopId: barbershop.id });
      res.json(bill);
    } catch (error) {
      res.status(500).json({ message: "Erro ao criar conta" });
    }
  });

  app.patch("/api/finances/bills/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const existing = await storage.getBill(req.params.id);
      if (!existing || existing.barbershopId !== barbershop.id) {
        return res.status(404).json({ message: "Conta não encontrada" });
      }
      const bill = await storage.updateBill(req.params.id, req.body);
      res.json(bill);
    } catch (error) {
      res.status(500).json({ message: "Erro ao atualizar conta" });
    }
  });

  app.delete("/api/finances/bills/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const existing = await storage.getBill(req.params.id);
      if (!existing || existing.barbershopId !== barbershop.id) {
        return res.status(404).json({ message: "Conta não encontrada" });
      }
      await storage.deleteBill(req.params.id);
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ message: "Erro ao excluir conta" });
    }
  });

  app.patch("/api/finances/bills/:id/pay", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const existing = await storage.getBill(req.params.id);
      if (!existing || existing.barbershopId !== barbershop.id) {
        return res.status(404).json({ message: "Conta não encontrada" });
      }
      if (existing.status === "paid") {
        return res.status(409).json({ message: "Conta já está paga" });
      }
      const bill = await storage.markBillPaid(req.params.id);
      if (!bill) return res.status(404).json({ message: "Conta não encontrada" });

      const today = new Date().toISOString().slice(0, 10);
      await storage.createTransaction({
        barbershopId: barbershop.id,
        type: bill.billType === "payable" ? "expense" : "income",
        category: bill.billType === "payable" ? "Conta a Pagar" : "Conta a Receber",
        description: bill.title,
        amount: bill.amount,
        paymentMethod: bill.paymentMethod || undefined,
        date: today,
      });

      res.json(bill);
    } catch (error) {
      res.status(500).json({ message: "Erro ao marcar conta como paga" });
    }
  });

  app.get("/api/finances/bills/summary", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const summary = await storage.getBillsSummary(barbershop.id);
      res.json(summary);
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar resumo de contas" });
    }
  });

  // Loyalty Plans
  app.get("/api/loyalty-plans", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const plans = await storage.getLoyaltyPlans(barbershop.id);
      res.json(plans);
    } catch (error) {
      res.status(500).json({ message: "Error fetching loyalty plans" });
    }
  });

  app.post("/api/loyalty-plans", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const plan = await storage.createLoyaltyPlan({
        ...req.body,
        barbershopId: barbershop.id,
      });
      res.status(201).json(plan);
    } catch (error) {
      res.status(500).json({ message: "Error creating loyalty plan" });
    }
  });

  // Subscription Packages
  app.get("/api/packages", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const packages = await storage.getPackages(barbershop.id);
      res.json(packages);
    } catch (error) {
      res.status(500).json({ message: "Error fetching packages" });
    }
  });

  app.post("/api/packages", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const pkg = await storage.createPackage({
        ...req.body,
        barbershopId: barbershop.id,
      });
      res.status(201).json(pkg);
    } catch (error) {
      res.status(500).json({ message: "Error creating package" });
    }
  });

  // Coupons
  app.get("/api/coupons", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const coupons = await storage.getCoupons(barbershop.id);
      res.json(coupons);
    } catch (error) {
      res.status(500).json({ message: "Error fetching coupons" });
    }
  });

  app.post("/api/coupons", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const coupon = await storage.createCoupon({
        ...req.body,
        barbershopId: barbershop.id,
      });
      res.status(201).json(coupon);
    } catch (error) {
      res.status(500).json({ message: "Error creating coupon" });
    }
  });

  // Reviews
  app.get("/api/reviews", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const reviews = await storage.getReviews(barbershop.id);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ message: "Error fetching reviews" });
    }
  });

  app.get("/api/reviews/stats", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const reviews = await storage.getReviews(barbershop.id);
      const totalReviews = reviews.length;
      const averageRating = totalReviews > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

      const ratingDistribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      reviews.forEach((r) => {
        if (r.rating >= 1 && r.rating <= 5) {
          ratingDistribution[r.rating]++;
        }
      });

      res.json({ averageRating, totalReviews, ratingDistribution });
    } catch (error) {
      res.status(500).json({ message: "Error fetching review stats" });
    }
  });

  app.post("/api/reviews", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const review = await storage.createReview({
        ...req.body,
        barbershopId: barbershop.id,
      });
      res.status(201).json(review);
    } catch (error) {
      res.status(500).json({ message: "Error creating review" });
    }
  });

  app.patch("/api/reviews/:id/reply", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const review = await storage.updateReviewReply(req.params.id, req.body.reply);
      res.json(review);
    } catch (error) {
      res.status(500).json({ message: "Error updating review" });
    }
  });

  // ===== REPORTS =====
  function getReportDateRange(period?: string, startDate?: string, endDate?: string): { start: string; end: string } {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    if (startDate && endDate) return { start: startDate, end: endDate };
    switch (period) {
      case "week": {
        const s = new Date(today); s.setDate(today.getDate() - 6);
        return { start: s.toISOString().slice(0, 10), end: todayStr };
      }
      case "quarter": {
        const s = new Date(today); s.setDate(today.getDate() - 89);
        return { start: s.toISOString().slice(0, 10), end: todayStr };
      }
      case "year": {
        const s = new Date(today); s.setFullYear(today.getFullYear() - 1); s.setDate(s.getDate() + 1);
        return { start: s.toISOString().slice(0, 10), end: todayStr };
      }
      default: {
        const s = new Date(today); s.setDate(today.getDate() - 29);
        return { start: s.toISOString().slice(0, 10), end: todayStr };
      }
    }
  }

  app.get("/api/reports/overview", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const { period, startDate, endDate } = req.query as Record<string, string>;
      const { start, end } = getReportDateRange(period, startDate, endDate);

      const [apts, txns] = await Promise.all([
        storage.getAppointmentsByPeriod(barbershop.id, start, end),
        storage.getTransactionsByPeriod(barbershop.id, start, end),
      ]);

      const completed = apts.filter(a => a.status === "completed");
      const revenue = txns
        .filter(t => t.type !== "expense" && t.type !== "refund")
        .reduce((sum, t) => sum + parseFloat(t.amount?.toString() || "0"), 0);

      const uniqueClients = new Set(completed.filter(a => a.clientId).map(a => a.clientId)).size;
      const avgTicket = completed.length > 0 ? revenue / completed.length : 0;

      // Daily revenue grouped by date
      const dailyMap: Record<string, number> = {};
      txns.filter(t => t.type !== "expense" && t.type !== "refund").forEach(t => {
        dailyMap[t.date] = (dailyMap[t.date] || 0) + parseFloat(t.amount?.toString() || "0");
      });
      const dailyRevenue = Object.entries(dailyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, rev]) => ({ date, revenue: rev }));

      // Peak hours from completed appointments
      const hourMap: Record<string, number> = {};
      completed.forEach(a => {
        if (a.startTime) {
          const hour = a.startTime.slice(0, 5);
          hourMap[hour] = (hourMap[hour] || 0) + 1;
        }
      });
      const peakHours = Object.entries(hourMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([hour, count]) => ({ hour, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      res.json({ totalRevenue: revenue, totalAppointments: completed.length, uniqueClients, averageTicket: avgTicket, dailyRevenue, peakHours });
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar relatório" });
    }
  });

  app.get("/api/reports/barbers", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const { period, startDate, endDate, barberId } = req.query as Record<string, string>;
      const { start, end } = getReportDateRange(period, startDate, endDate);

      const [barbers, allApts, allServices] = await Promise.all([
        storage.getBarbers(barbershop.id),
        storage.getAppointmentsByPeriod(barbershop.id, start, end),
        storage.getServices(barbershop.id),
      ]);

      const activeBarbers = barbers.filter(b => b.isActive !== false);
      const serviceMap = new Map(allServices.map(s => [s.id, s]));
      const completed = allApts.filter(a => a.status === "completed");

      const result = activeBarbers.map(barber => {
        const barberApts = completed.filter(a => a.barberId === barber.id);
        const revenue = barberApts.reduce((sum, a) => {
          return sum + parseFloat((a.finalPrice || a.price)?.toString() || "0");
        }, 0);
        const commission = revenue * parseFloat(barber.commissionRate?.toString() || "0") / 100;
        const avgTicket = barberApts.length > 0 ? revenue / barberApts.length : 0;

        const svcCount: Record<string, number> = {};
        barberApts.forEach(a => { svcCount[a.serviceId] = (svcCount[a.serviceId] || 0) + 1; });
        const topSvcId = Object.entries(svcCount).sort(([,a],[,b]) => b - a)[0]?.[0];
        const topService = topSvcId ? serviceMap.get(topSvcId)?.name || "" : "";

        const details = barberId && barberId !== "all"
          ? barberApts.map(a => ({
              id: a.id,
              date: a.date,
              startTime: a.startTime,
              clientName: a.clientName || "—",
              service: serviceMap.get(a.serviceId)?.name || "—",
              price: parseFloat((a.finalPrice || a.price)?.toString() || "0"),
            }))
          : undefined;

        return {
          id: barber.id,
          name: barber.name,
          photoUrl: barber.photoUrl,
          appointments: barberApts.length,
          revenue,
          commission,
          averageTicket: avgTicket,
          topService,
          commissionRate: parseFloat(barber.commissionRate?.toString() || "0"),
          ...(details !== undefined && { appointmentDetails: details }),
        };
      });

      const filtered = barberId && barberId !== "all" ? result.filter(b => b.id === barberId) : result;
      res.json(filtered.sort((a, b) => b.revenue - a.revenue));
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar relatório de barbeiros" });
    }
  });

  app.get("/api/reports/products", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const { period, startDate, endDate } = req.query as Record<string, string>;
      const { start, end } = getReportDateRange(period, startDate, endDate);

      const [allProducts, apPeriod] = await Promise.all([
        storage.getProducts(barbershop.id),
        storage.getAppointmentProductsByPeriod(barbershop.id, start, end),
      ]);

      const soldMap: Record<string, { qty: number; revenue: number }> = {};
      apPeriod.forEach(ap => {
        if (!soldMap[ap.productId]) soldMap[ap.productId] = { qty: 0, revenue: 0 };
        soldMap[ap.productId].qty += ap.quantity;
        soldMap[ap.productId].revenue += ap.quantity * parseFloat(ap.unitPrice?.toString() || "0");
      });

      const productRows = allProducts.map(p => {
        const sold = soldMap[p.id] || { qty: 0, revenue: 0 };
        const cost = parseFloat(p.costPrice?.toString() || "0");
        const grossProfit = sold.revenue - cost * sold.qty;
        const stock = p.stockQuantity || 0;
        const threshold = p.lowStockThreshold || 5;

        let status = "parado";
        if (stock <= threshold && stock > 0) status = "estoque_baixo";
        else if (sold.qty >= 5) status = "em_alta";
        else if (sold.qty >= 1) status = "ativo";
        else status = "parado";

        return {
          id: p.id,
          name: p.name,
          unitsSold: sold.qty,
          revenue: sold.revenue,
          grossProfit,
          stockQuantity: stock,
          lowStockThreshold: threshold,
          status,
        };
      });

      const totalUnitsSold = productRows.reduce((s, p) => s + p.unitsSold, 0);
      const totalRevenue = productRows.reduce((s, p) => s + p.revenue, 0);
      const stagnantCount = productRows.filter(p => p.unitsSold === 0).length;

      res.json({
        summary: { totalUnitsSold, totalRevenue, stagnantCount },
        products: productRows.sort((a, b) => b.unitsSold - a.unitsSold),
      });
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar relatório de produtos" });
    }
  });

  app.get("/api/reports/services", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const { period, startDate, endDate } = req.query as Record<string, string>;
      const { start, end } = getReportDateRange(period, startDate, endDate);

      const [allServices, apts] = await Promise.all([
        storage.getServices(barbershop.id),
        storage.getAppointmentsByPeriod(barbershop.id, start, end),
      ]);

      const completed = apts.filter(a => a.status === "completed");
      const svcMap: Record<string, { count: number; revenue: number }> = {};
      completed.forEach(a => {
        if (!svcMap[a.serviceId]) svcMap[a.serviceId] = { count: 0, revenue: 0 };
        svcMap[a.serviceId].count += 1;
        svcMap[a.serviceId].revenue += parseFloat((a.finalPrice || a.price)?.toString() || "0");
      });

      const totalCount = completed.length;
      const rows = allServices.map(s => {
        const data = svcMap[s.id] || { count: 0, revenue: 0 };
        return {
          id: s.id,
          name: s.name,
          count: data.count,
          revenue: data.revenue,
          percentage: totalCount > 0 ? (data.count / totalCount) * 100 : 0,
        };
      }).sort((a, b) => b.count - a.count);

      res.json({ total: totalCount, services: rows });
    } catch (error) {
      res.status(500).json({ message: "Erro ao buscar relatório de serviços" });
    }
  });

  // ===== WHATSAPP ROUTES =====
  app.post("/api/whatsapp/send-ready", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const { appointmentId } = req.body;
      if (!appointmentId) return res.status(400).json({ message: "appointmentId obrigatório" });
      const user = req.user as any;
      const barbershop = await storage.getBarbershopByOwner(user.id);
      if (!barbershop) return res.status(403).json({ message: "Barbearia não encontrada" });
      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment || appointment.barbershopId !== barbershop.id) {
        return res.status(404).json({ message: "Agendamento não encontrado" });
      }
      if (!appointment.clientPhone) return res.status(400).json({ message: "Cliente sem telefone cadastrado" });
      const barber = appointment.barberId ? await storage.getBarber(appointment.barberId) : null;
      const msg = `Olá ${appointment.clientName || ""}! O ${barber?.name || "barbeiro"} já te espera! 💈✨ Teixeira Barbearia`;
      await whatsappService.sendMessage(appointment.clientPhone, msg);
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ message: "Erro ao enviar mensagem" });
    }
  });

  app.get("/api/whatsapp/status", isAuthenticated, (_req: Request, res: Response) => {
    res.json({ status: whatsappService.getStatus(), qr: whatsappService.getQR(), phone: whatsappService.getPhone() });
  });

  app.post("/api/whatsapp/reconnect", isAuthenticated, async (_req: Request, res: Response) => {
    try {
      whatsappService.reconnect();
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ message: "Erro ao reconectar WhatsApp" });
    }
  });

  app.post("/api/whatsapp/disconnect", isAuthenticated, async (_req: Request, res: Response) => {
    try {
      await whatsappService.disconnect();
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ message: "Erro ao desconectar WhatsApp" });
    }
  });

  return httpServer;
}
