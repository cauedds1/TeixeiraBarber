import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, registerAuthRoutes, seedOwner } from "./auth";
import { format } from "date-fns";
import { whatsappService } from "./whatsapp";

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
  const getBarbershopForUser = async (userId: string) => {
    let barbershop = await storage.getBarbershopByOwner(userId);
    if (!barbershop) {
      const user = await storage.getUser(userId);
      const slug = `barbershop-${userId.slice(0, 8)}`;
      barbershop = await storage.createBarbershop({
        ownerId: userId,
        name: user?.firstName ? `${user.firstName}'s Barbearia` : "Minha Barbearia",
        slug,
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
      res.json(barbers.filter(b => b.isActive));
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
      const reviews = await storage.getReviews(barbershop.id);
      const publicReviews = reviews.filter(r => r.isPublic);
      const totalReviews = publicReviews.length;
      const averageRating = totalReviews > 0
        ? publicReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
        : 0;

      res.json({
        reviews: publicReviews,
        averageRating,
        totalReviews,
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
          if (nextSlots.length >= 4) break;
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
        const barber = await storage.getBarber(barberId);
        const msg =
          `✂️ *Agendamento Confirmado – Teixeira Barbearia!*\n\n` +
          `Olá, ${clientName}! Seu horário foi agendado com sucesso.\n\n` +
          `📋 *Serviço:* ${service.name}\n` +
          `👤 *Profissional:* ${barber?.name || "A definir"}\n` +
          `📅 *Data:* ${format(new Date(date + "T12:00:00"), "dd/MM/yyyy")}\n` +
          `🕐 *Horário:* ${startTime}\n\n` +
          `📍 Rua Koesa, 430, Sala 03, Kobrasol – São José/SC\n\n` +
          `Até breve! 💈`;
        await whatsappService.sendMessage(clientPhone, msg);
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

      const todayRevenue = allTransactions
        .filter((t) => t.date === today && t.type !== "expense" && t.type !== "refund")
        .reduce((sum, t) => sum + parseFloat(t.amount?.toString() || "0"), 0);

      const currentMonth = format(new Date(), "yyyy-MM");
      const monthlyRevenue = allTransactions
        .filter((t) => t.date?.startsWith(currentMonth) && t.type !== "expense" && t.type !== "refund")
        .reduce((sum, t) => sum + parseFloat(t.amount?.toString() || "0"), 0);

      res.json({
        todayAppointments: todayAppointments.length,
        todayRevenue,
        monthlyRevenue,
        newClients: clients.filter((c) => {
          const created = c.createdAt ? new Date(c.createdAt) : null;
          if (!created) return false;
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return created >= thirtyDaysAgo;
        }).length,
        occupancyRate: 75,
        pendingAppointments: todayAppointments.filter((a) => a.status === "pending").length,
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
      const appointments = await storage.getAppointments(barbershop.id, today);
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
          const service = existing.serviceId ? await storage.getService(existing.serviceId).catch(() => null) : null;
          const msg =
            `❌ *Agendamento Cancelado – Teixeira Barbearia*\n\n` +
            `Olá, ${existing.clientName}! Infelizmente seu agendamento precisou ser cancelado.\n\n` +
            `📋 *Serviço:* ${service?.name || "N/A"}\n` +
            `📅 *Data:* ${format(new Date(existing.date + "T12:00:00"), "dd/MM/yyyy")}\n` +
            `🕐 *Horário:* ${existing.startTime}\n\n` +
            `Para reagendar, acesse:\nhttps://57963618-5dfb-413a-88eb-ab8ee22cb96d-00-347r04xq55rqy.spock.replit.dev/agendar/teixeira\n\n` +
            `Pedimos desculpas pelo transtorno. 🙏`;
          await whatsappService.sendMessage(existing.clientPhone, msg);
        } catch (_) {}
      }

      res.json(appointment);
    } catch (error) {
      res.status(500).json({ message: "Error updating appointment" });
    }
  });

  // Barbers
  app.get("/api/barbers", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const barbers = await storage.getBarbers(barbershop.id);
      res.json(barbers);
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
    } catch (error) {
      res.status(500).json({ message: "Error creating product" });
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

  // Reports
  app.get("/api/reports", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser((req.user as any).id);
      const transactions = await storage.getTransactions(barbershop.id);
      const appointments = await storage.getAppointments(barbershop.id);
      const clients = await storage.getClients(barbershop.id);
      const services = await storage.getServices(barbershop.id);
      const barbers = await storage.getBarbers(barbershop.id);

      const totalRevenue = transactions
        .filter((t) => t.type !== "expense" && t.type !== "refund")
        .reduce((sum, t) => sum + parseFloat(t.amount?.toString() || "0"), 0);

      res.json({
        totalRevenue,
        totalAppointments: appointments.length,
        newClients: clients.length,
        averageTicket: appointments.length > 0 ? totalRevenue / appointments.length : 0,
        topServices: services.slice(0, 5).map((s) => ({
          name: s.name,
          count: Math.floor(Math.random() * 50),
          revenue: Math.floor(Math.random() * 5000),
        })),
        topBarbers: barbers.slice(0, 5).map((b) => ({
          name: b.name,
          appointments: Math.floor(Math.random() * 100),
          revenue: Math.floor(Math.random() * 10000),
        })),
        peakHours: [
          { hour: "09:00", count: 12 },
          { hour: "10:00", count: 18 },
          { hour: "11:00", count: 22 },
          { hour: "14:00", count: 25 },
          { hour: "15:00", count: 20 },
          { hour: "16:00", count: 15 },
          { hour: "17:00", count: 18 },
        ],
        dailyRevenue: Array.from({ length: 30 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (29 - i));
          return {
            date: format(date, "yyyy-MM-dd"),
            revenue: Math.floor(Math.random() * 2000) + 500,
          };
        }),
      });
    } catch (error) {
      res.status(500).json({ message: "Error fetching reports" });
    }
  });

  // ===== WHATSAPP ROUTES =====
  app.get("/api/whatsapp/status", isAuthenticated, (_req: Request, res: Response) => {
    res.json({ status: whatsappService.getStatus(), qr: whatsappService.getQR() });
  });

  app.post("/api/whatsapp/reconnect", isAuthenticated, async (_req: Request, res: Response) => {
    try {
      whatsappService.reconnect();
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ message: "Erro ao reconectar WhatsApp" });
    }
  });

  return httpServer;
}
