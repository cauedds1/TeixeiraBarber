import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { format } from "date-fns";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication
  await setupAuth(app);

  // Auth routes
  app.get("/api/auth/user", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    res.json(req.user);
  });

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

  // Barbershop routes
  app.get("/api/barbershop", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser(req.user!.id);
      res.json(barbershop);
    } catch (error) {
      res.status(500).json({ message: "Error fetching barbershop" });
    }
  });

  app.patch("/api/barbershop", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser(req.user!.id);
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
      const barbershop = await getBarbershopForUser(req.user!.id);
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
      const barbershop = await getBarbershopForUser(req.user!.id);
      const date = req.query.date as string | undefined;
      const appointments = await storage.getAppointments(barbershop.id, date);
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ message: "Error fetching appointments" });
    }
  });

  app.get("/api/appointments/today", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser(req.user!.id);
      const today = format(new Date(), "yyyy-MM-dd");
      const appointments = await storage.getAppointments(barbershop.id, today);
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ message: "Error fetching appointments" });
    }
  });

  app.post("/api/appointments", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser(req.user!.id);
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
      const appointment = await storage.updateAppointmentStatus(req.params.id, req.body.status);
      res.json(appointment);
    } catch (error) {
      res.status(500).json({ message: "Error updating appointment" });
    }
  });

  // Barbers
  app.get("/api/barbers", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser(req.user!.id);
      const barbers = await storage.getBarbers(barbershop.id);
      res.json(barbers);
    } catch (error) {
      res.status(500).json({ message: "Error fetching barbers" });
    }
  });

  app.post("/api/barbers", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser(req.user!.id);
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
      const barber = await storage.updateBarber(req.params.id, req.body);
      res.json(barber);
    } catch (error) {
      res.status(500).json({ message: "Error updating barber" });
    }
  });

  app.delete("/api/barbers/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      await storage.deleteBarber(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting barber" });
    }
  });

  // Services
  app.get("/api/services", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser(req.user!.id);
      const services = await storage.getServices(barbershop.id);
      res.json(services);
    } catch (error) {
      res.status(500).json({ message: "Error fetching services" });
    }
  });

  app.post("/api/services", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser(req.user!.id);
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
      const service = await storage.updateService(req.params.id, req.body);
      res.json(service);
    } catch (error) {
      res.status(500).json({ message: "Error updating service" });
    }
  });

  app.delete("/api/services/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      await storage.deleteService(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting service" });
    }
  });

  // Service Categories
  app.get("/api/service-categories", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser(req.user!.id);
      const categories = await storage.getServiceCategories(barbershop.id);
      res.json(categories);
    } catch (error) {
      res.status(500).json({ message: "Error fetching categories" });
    }
  });

  app.post("/api/service-categories", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser(req.user!.id);
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
      const barbershop = await getBarbershopForUser(req.user!.id);
      const clients = await storage.getClients(barbershop.id);
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: "Error fetching clients" });
    }
  });

  app.post("/api/clients", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser(req.user!.id);
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
      const barbershop = await getBarbershopForUser(req.user!.id);
      const products = await storage.getProducts(barbershop.id);
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Error fetching products" });
    }
  });

  app.post("/api/products", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser(req.user!.id);
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
      const product = await storage.updateProduct(req.params.id, req.body);
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Error updating product" });
    }
  });

  // Transactions
  app.get("/api/transactions", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser(req.user!.id);
      const transactions = await storage.getTransactions(barbershop.id);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Error fetching transactions" });
    }
  });

  app.get("/api/transactions/recent", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser(req.user!.id);
      const transactions = await storage.getTransactions(barbershop.id);
      res.json(transactions.slice(0, 10));
    } catch (error) {
      res.status(500).json({ message: "Error fetching transactions" });
    }
  });

  app.post("/api/transactions", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser(req.user!.id);
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
      const barbershop = await getBarbershopForUser(req.user!.id);
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
      const barbershop = await getBarbershopForUser(req.user!.id);
      const plans = await storage.getLoyaltyPlans(barbershop.id);
      res.json(plans);
    } catch (error) {
      res.status(500).json({ message: "Error fetching loyalty plans" });
    }
  });

  app.post("/api/loyalty-plans", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser(req.user!.id);
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
      const barbershop = await getBarbershopForUser(req.user!.id);
      const packages = await storage.getPackages(barbershop.id);
      res.json(packages);
    } catch (error) {
      res.status(500).json({ message: "Error fetching packages" });
    }
  });

  app.post("/api/packages", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser(req.user!.id);
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
      const barbershop = await getBarbershopForUser(req.user!.id);
      const coupons = await storage.getCoupons(barbershop.id);
      res.json(coupons);
    } catch (error) {
      res.status(500).json({ message: "Error fetching coupons" });
    }
  });

  app.post("/api/coupons", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser(req.user!.id);
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
      const barbershop = await getBarbershopForUser(req.user!.id);
      const reviews = await storage.getReviews(barbershop.id);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ message: "Error fetching reviews" });
    }
  });

  app.get("/api/reviews/stats", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const barbershop = await getBarbershopForUser(req.user!.id);
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
      const barbershop = await getBarbershopForUser(req.user!.id);
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
      const barbershop = await getBarbershopForUser(req.user!.id);
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

  return httpServer;
}
