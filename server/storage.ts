import { eq, and, gte, lte, desc, sql, count, sum, isNull, lt, isNotNull, or } from "drizzle-orm";
import { db } from "./db";
import {
  users, barbershops, barbers, services, serviceCategories,
  clients, appointments, products, transactions, loyaltyPlans,
  subscriptionPackages, coupons, reviews, barberTimeOff, notifications,
  fixedExpenses, commissionPayments,
  type User, type UpsertUser, type Barbershop, type InsertBarbershop,
  type Barber, type InsertBarber, type Service, type InsertService,
  type ServiceCategory, type InsertServiceCategory,
  type Client, type InsertClient, type Appointment, type InsertAppointment,
  type Product, type InsertProduct, type Transaction, type InsertTransaction,
  type LoyaltyPlan, type InsertLoyaltyPlan, type SubscriptionPackage, type InsertSubscriptionPackage,
  type Coupon, type InsertCoupon, type Review, type InsertReview,
  type FixedExpense, type InsertFixedExpense,
  type CommissionPayment, type InsertCommissionPayment,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Barbershops
  getBarbershop(id: string): Promise<Barbershop | undefined>;
  getBarbershopBySlug(slug: string): Promise<Barbershop | undefined>;
  getBarbershopByOwner(ownerId: string): Promise<Barbershop | undefined>;
  createBarbershop(data: InsertBarbershop): Promise<Barbershop>;
  updateBarbershop(id: string, data: Partial<InsertBarbershop>): Promise<Barbershop | undefined>;

  // Barbers
  getBarbers(barbershopId: string): Promise<Barber[]>;
  getBarber(id: string): Promise<Barber | undefined>;
  createBarber(data: InsertBarber): Promise<Barber>;
  updateBarber(id: string, data: Partial<InsertBarber>): Promise<Barber | undefined>;
  deleteBarber(id: string): Promise<void>;

  // Services
  getServices(barbershopId: string): Promise<Service[]>;
  getService(id: string): Promise<Service | undefined>;
  createService(data: InsertService): Promise<Service>;
  updateService(id: string, data: Partial<InsertService>): Promise<Service | undefined>;
  deleteService(id: string): Promise<void>;

  // Service Categories
  getServiceCategories(barbershopId: string): Promise<ServiceCategory[]>;
  createServiceCategory(data: InsertServiceCategory): Promise<ServiceCategory>;

  // Clients
  getClients(barbershopId: string): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(data: InsertClient): Promise<Client>;
  updateClient(id: string, data: Partial<InsertClient>): Promise<Client | undefined>;

  // Appointments
  getAppointments(barbershopId: string, date?: string): Promise<Appointment[]>;
  getAppointmentsWithDetails(barbershopId: string, date?: string): Promise<any[]>;
  getAppointmentsByBarber(barberId: string, date: string): Promise<Appointment[]>;
  getAppointment(id: string): Promise<Appointment | undefined>;
  createAppointment(data: InsertAppointment): Promise<Appointment>;
  updateAppointmentStatus(id: string, status: string): Promise<Appointment | undefined>;
  getUpcomingUnremindedAppointments(date: string): Promise<Appointment[]>;
  markReminderSent(id: string): Promise<void>;
  getAppointmentsForReview(): Promise<Appointment[]>;
  markReviewRequestSent(id: string): Promise<void>;
  markReviewCompleted(id: string): Promise<void>;

  // Products
  getProducts(barbershopId: string): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(data: InsertProduct): Promise<Product>;
  updateProduct(id: string, data: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<void>;

  // Transactions
  getTransactions(barbershopId: string): Promise<Transaction[]>;
  getTransactionsByPeriod(barbershopId: string, startDate: string, endDate: string): Promise<Transaction[]>;
  createTransaction(data: InsertTransaction): Promise<Transaction>;

  // Fixed Expenses
  getFixedExpenses(barbershopId: string): Promise<FixedExpense[]>;
  createFixedExpense(data: InsertFixedExpense): Promise<FixedExpense>;
  updateFixedExpense(id: string, data: Partial<InsertFixedExpense>): Promise<FixedExpense | undefined>;
  deleteFixedExpense(id: string): Promise<void>;

  // Commission Payments
  getCommissionPayments(barbershopId: string): Promise<CommissionPayment[]>;
  createCommissionPayment(data: InsertCommissionPayment): Promise<CommissionPayment>;

  // Finance aggregations
  getUpcomingAppointments(barbershopId: string, days: number): Promise<any[]>;
  getRevenueByService(barbershopId: string, startDate: string, endDate: string): Promise<any[]>;
  getRevenueByProduct(barbershopId: string, startDate: string, endDate: string): Promise<any[]>;

  // Loyalty Plans
  getLoyaltyPlans(barbershopId: string): Promise<LoyaltyPlan[]>;
  createLoyaltyPlan(data: InsertLoyaltyPlan): Promise<LoyaltyPlan>;

  // Subscription Packages
  getPackages(barbershopId: string): Promise<SubscriptionPackage[]>;
  createPackage(data: InsertSubscriptionPackage): Promise<SubscriptionPackage>;

  // Coupons
  getCoupons(barbershopId: string): Promise<Coupon[]>;
  createCoupon(data: InsertCoupon): Promise<Coupon>;

  // Reviews
  getReviews(barbershopId: string): Promise<Review[]>;
  createReview(data: InsertReview): Promise<Review>;
  createReviewFromWA(data: {
    barbershopId: string;
    barberId: string | null;
    appointmentId: string;
    rating: number | null;
    barbershopRating: number | null;
    comment: string | null;
    clientPhone: string;
    clientName: string | null;
    isPublic: boolean;
  }): Promise<Review>;
  updateReviewReply(id: string, reply: string): Promise<Review | undefined>;
  getLastReviewByPhone(phone: string, barbershopId: string): Promise<Review | undefined>;
  getBarberAverageRating(barberId: string): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Barbershops
  async getBarbershop(id: string): Promise<Barbershop | undefined> {
    const [barbershop] = await db.select().from(barbershops).where(eq(barbershops.id, id));
    return barbershop;
  }

  async getBarbershopBySlug(slug: string): Promise<Barbershop | undefined> {
    const [barbershop] = await db.select().from(barbershops).where(eq(barbershops.slug, slug));
    return barbershop;
  }

  async getBarbershopByOwner(ownerId: string): Promise<Barbershop | undefined> {
    const [barbershop] = await db.select().from(barbershops).where(eq(barbershops.ownerId, ownerId));
    return barbershop;
  }

  async createBarbershop(data: InsertBarbershop): Promise<Barbershop> {
    const [barbershop] = await db.insert(barbershops).values(data).returning();
    return barbershop;
  }

  async updateBarbershop(id: string, data: Partial<InsertBarbershop>): Promise<Barbershop | undefined> {
    const [barbershop] = await db
      .update(barbershops)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(barbershops.id, id))
      .returning();
    return barbershop;
  }

  // Barbers
  async getBarbers(barbershopId: string): Promise<Barber[]> {
    return db.select().from(barbers).where(eq(barbers.barbershopId, barbershopId));
  }

  async getBarber(id: string): Promise<Barber | undefined> {
    const [barber] = await db.select().from(barbers).where(eq(barbers.id, id));
    return barber;
  }

  async createBarber(data: InsertBarber): Promise<Barber> {
    const [barber] = await db.insert(barbers).values(data).returning();
    return barber;
  }

  async updateBarber(id: string, data: Partial<InsertBarber>): Promise<Barber | undefined> {
    const [barber] = await db
      .update(barbers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(barbers.id, id))
      .returning();
    return barber;
  }

  async deleteBarber(id: string): Promise<void> {
    await db.delete(barbers).where(eq(barbers.id, id));
  }

  // Services
  async getServices(barbershopId: string): Promise<Service[]> {
    return db.select().from(services).where(eq(services.barbershopId, barbershopId));
  }

  async getService(id: string): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service;
  }

  async createService(data: InsertService): Promise<Service> {
    const [service] = await db.insert(services).values(data).returning();
    return service;
  }

  async updateService(id: string, data: Partial<InsertService>): Promise<Service | undefined> {
    const [service] = await db
      .update(services)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(services.id, id))
      .returning();
    return service;
  }

  async deleteService(id: string): Promise<void> {
    await db.delete(services).where(eq(services.id, id));
  }

  // Service Categories
  async getServiceCategories(barbershopId: string): Promise<ServiceCategory[]> {
    return db.select().from(serviceCategories).where(eq(serviceCategories.barbershopId, barbershopId));
  }

  async createServiceCategory(data: InsertServiceCategory): Promise<ServiceCategory> {
    const [category] = await db.insert(serviceCategories).values(data).returning();
    return category;
  }

  // Clients
  async getClients(barbershopId: string): Promise<Client[]> {
    return db.select().from(clients).where(eq(clients.barbershopId, barbershopId)).orderBy(desc(clients.createdAt));
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async createClient(data: InsertClient): Promise<Client> {
    const [client] = await db.insert(clients).values(data).returning();
    return client;
  }

  async updateClient(id: string, data: Partial<InsertClient>): Promise<Client | undefined> {
    const [client] = await db
      .update(clients)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    return client;
  }

  // Appointments
  async getAppointmentsWithDetails(barbershopId: string, date?: string): Promise<any[]> {
    const baseAppointments = await this.getAppointments(barbershopId, date);
    const barbershopBarbers = await this.getBarbers(barbershopId);
    const barbershopServices = await this.getServices(barbershopId);
    const barberMap = new Map(barbershopBarbers.map(b => [b.id, b]));
    const serviceMap = new Map(barbershopServices.map(s => [s.id, s]));

    return baseAppointments.map(apt => ({
      ...apt,
      barber: barberMap.get(apt.barberId) || null,
      service: serviceMap.get(apt.serviceId) || null,
    }));
  }

  async getAppointmentsByBarber(barberId: string, date: string): Promise<Appointment[]> {
    return db.select().from(appointments)
      .where(and(
        eq(appointments.barberId, barberId),
        eq(appointments.date, date),
      ))
      .orderBy(appointments.startTime);
  }

  async getAppointments(barbershopId: string, date?: string): Promise<Appointment[]> {
    if (date) {
      return db.select().from(appointments)
        .where(and(eq(appointments.barbershopId, barbershopId), eq(appointments.date, date)))
        .orderBy(appointments.startTime);
    }
    return db.select().from(appointments)
      .where(eq(appointments.barbershopId, barbershopId))
      .orderBy(desc(appointments.date), appointments.startTime);
  }

  async getAppointment(id: string): Promise<Appointment | undefined> {
    const [appointment] = await db.select().from(appointments).where(eq(appointments.id, id));
    return appointment;
  }

  async createAppointment(data: InsertAppointment): Promise<Appointment> {
    const [appointment] = await db.insert(appointments).values(data).returning();
    return appointment;
  }

  async updateAppointmentStatus(id: string, status: string): Promise<Appointment | undefined> {
    const updates: any = { status, updatedAt: new Date() };
    if (status === "confirmed") updates.confirmedAt = new Date();
    if (status === "completed") updates.completedAt = new Date();
    if (status === "cancelled") updates.cancelledAt = new Date();

    const [appointment] = await db
      .update(appointments)
      .set(updates)
      .where(eq(appointments.id, id))
      .returning();
    return appointment;
  }

  async getUpcomingUnremindedAppointments(date: string): Promise<Appointment[]> {
    return db.select().from(appointments)
      .where(
        and(
          eq(appointments.date, date),
          eq(appointments.reminderSent, false),
          sql`${appointments.status} != 'cancelled'`,
          sql`${appointments.clientPhone} IS NOT NULL AND ${appointments.clientPhone} != ''`
        )
      )
      .orderBy(appointments.startTime);
  }

  async markReminderSent(id: string): Promise<void> {
    await db.update(appointments)
      .set({ reminderSent: true, updatedAt: new Date() })
      .where(eq(appointments.id, id));
  }

  async getAppointmentsForReview(): Promise<Appointment[]> {
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const fiveDaysAgoStr = fiveDaysAgo.toISOString().slice(0, 10);

    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const todayStr = new Date().toISOString().slice(0, 10);

    return db.select().from(appointments)
      .where(
        and(
          gte(appointments.date, fiveDaysAgoStr),
          lte(appointments.date, todayStr),
          eq(appointments.reviewRequestSent, false),
          eq(appointments.reviewCompleted, false),
          sql`${appointments.status} != 'cancelled'`,
          sql`${appointments.clientPhone} IS NOT NULL AND ${appointments.clientPhone} != ''`
        )
      );
  }

  async markReviewRequestSent(id: string): Promise<void> {
    await db.update(appointments)
      .set({ reviewRequestSent: true, reviewRequestSentAt: new Date(), updatedAt: new Date() })
      .where(eq(appointments.id, id));
  }

  async markReviewCompleted(id: string): Promise<void> {
    await db.update(appointments)
      .set({ reviewCompleted: true, updatedAt: new Date() })
      .where(eq(appointments.id, id));
  }

  // Products
  async getProducts(barbershopId: string): Promise<Product[]> {
    return db.select().from(products).where(eq(products.barbershopId, barbershopId));
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(data: InsertProduct): Promise<Product> {
    const [product] = await db.insert(products).values(data).returning();
    return product;
  }

  async updateProduct(id: string, data: Partial<InsertProduct>): Promise<Product | undefined> {
    const [product] = await db
      .update(products)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    return product;
  }

  async deleteProduct(id: string): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  // Transactions
  async getTransactions(barbershopId: string): Promise<Transaction[]> {
    return db.select().from(transactions)
      .where(eq(transactions.barbershopId, barbershopId))
      .orderBy(desc(transactions.date), desc(transactions.createdAt));
  }

  async createTransaction(data: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db.insert(transactions).values(data).returning();
    return transaction;
  }

  // Loyalty Plans
  async getLoyaltyPlans(barbershopId: string): Promise<LoyaltyPlan[]> {
    return db.select().from(loyaltyPlans).where(eq(loyaltyPlans.barbershopId, barbershopId));
  }

  async createLoyaltyPlan(data: InsertLoyaltyPlan): Promise<LoyaltyPlan> {
    const [plan] = await db.insert(loyaltyPlans).values(data).returning();
    return plan;
  }

  // Subscription Packages
  async getPackages(barbershopId: string): Promise<SubscriptionPackage[]> {
    return db.select().from(subscriptionPackages).where(eq(subscriptionPackages.barbershopId, barbershopId));
  }

  async createPackage(data: InsertSubscriptionPackage): Promise<SubscriptionPackage> {
    const [pkg] = await db.insert(subscriptionPackages).values(data).returning();
    return pkg;
  }

  // Coupons
  async getCoupons(barbershopId: string): Promise<Coupon[]> {
    return db.select().from(coupons).where(eq(coupons.barbershopId, barbershopId));
  }

  async createCoupon(data: InsertCoupon): Promise<Coupon> {
    const [coupon] = await db.insert(coupons).values(data).returning();
    return coupon;
  }

  // Reviews
  async getReviews(barbershopId: string): Promise<Review[]> {
    return db.select().from(reviews)
      .where(eq(reviews.barbershopId, barbershopId))
      .orderBy(desc(reviews.createdAt));
  }

  async createReview(data: InsertReview): Promise<Review> {
    const [review] = await db.insert(reviews).values(data).returning();
    return review;
  }

  async updateReviewReply(id: string, reply: string): Promise<Review | undefined> {
    const [review] = await db
      .update(reviews)
      .set({ reply })
      .where(eq(reviews.id, id))
      .returning();
    return review;
  }

  async createReviewFromWA(data: {
    barbershopId: string;
    barberId: string | null;
    appointmentId: string;
    rating: number | null;
    barbershopRating: number | null;
    comment: string | null;
    clientPhone: string;
    clientName: string | null;
    isPublic: boolean;
  }): Promise<Review> {
    const [review] = await db.insert(reviews).values({
      barbershopId: data.barbershopId,
      barberId: data.barberId ?? undefined,
      appointmentId: data.appointmentId,
      rating: data.rating ?? undefined,
      barbershopRating: data.barbershopRating ?? undefined,
      comment: data.comment ?? undefined,
      clientPhone: data.clientPhone,
      clientName: data.clientName ?? undefined,
      isPublic: data.isPublic,
    }).returning();
    return review;
  }

  async getLastReviewByPhone(phone: string, barbershopId: string): Promise<Review | undefined> {
    const [review] = await db.select().from(reviews)
      .where(
        and(
          eq(reviews.barbershopId, barbershopId),
          eq(reviews.clientPhone, phone)
        )
      )
      .orderBy(desc(reviews.createdAt))
      .limit(1);
    return review;
  }

  async getBarberAverageRating(barberId: string): Promise<number> {
    const result = await db.select({
      avg: sql<number>`AVG(${reviews.rating})`,
      count: sql<number>`COUNT(*)`,
    }).from(reviews)
      .where(
        and(
          eq(reviews.barberId, barberId),
          sql`${reviews.rating} IS NOT NULL`
        )
      );
    return Math.round((result[0]?.avg || 0) * 10) / 10;
  }

  // Transactions by period
  async getTransactionsByPeriod(barbershopId: string, startDate: string, endDate: string): Promise<Transaction[]> {
    return db.select().from(transactions)
      .where(
        and(
          eq(transactions.barbershopId, barbershopId),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate)
        )
      )
      .orderBy(desc(transactions.createdAt));
  }

  // Fixed Expenses
  async getFixedExpenses(barbershopId: string): Promise<FixedExpense[]> {
    return db.select().from(fixedExpenses)
      .where(eq(fixedExpenses.barbershopId, barbershopId))
      .orderBy(fixedExpenses.dueDay);
  }

  async createFixedExpense(data: InsertFixedExpense): Promise<FixedExpense> {
    const [expense] = await db.insert(fixedExpenses).values(data).returning();
    return expense;
  }

  async updateFixedExpense(id: string, data: Partial<InsertFixedExpense>): Promise<FixedExpense | undefined> {
    const [expense] = await db.update(fixedExpenses).set(data).where(eq(fixedExpenses.id, id)).returning();
    return expense;
  }

  async deleteFixedExpense(id: string): Promise<void> {
    await db.delete(fixedExpenses).where(eq(fixedExpenses.id, id));
  }

  // Commission Payments
  async getCommissionPayments(barbershopId: string): Promise<CommissionPayment[]> {
    return db.select().from(commissionPayments)
      .where(eq(commissionPayments.barbershopId, barbershopId))
      .orderBy(desc(commissionPayments.paidAt));
  }

  async createCommissionPayment(data: InsertCommissionPayment): Promise<CommissionPayment> {
    const [payment] = await db.insert(commissionPayments).values(data).returning();
    return payment;
  }

  // Upcoming appointments (for Contas a Receber)
  async getUpcomingAppointments(barbershopId: string, days: number): Promise<any[]> {
    const today = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);
    const todayStr = today.toISOString().slice(0, 10);
    const futureStr = future.toISOString().slice(0, 10);

    const rows = await db
      .select({
        id: appointments.id,
        date: appointments.date,
        startTime: appointments.startTime,
        status: appointments.status,
        price: appointments.price,
        clientName: appointments.clientName,
        barberName: barbers.name,
        serviceName: services.name,
      })
      .from(appointments)
      .leftJoin(barbers, eq(appointments.barberId, barbers.id))
      .leftJoin(services, eq(appointments.serviceId, services.id))
      .where(
        and(
          eq(appointments.barbershopId, barbershopId),
          gte(appointments.date, todayStr),
          lte(appointments.date, futureStr),
          or(
            eq(appointments.status, "confirmed"),
            eq(appointments.status, "pending")
          )
        )
      )
      .orderBy(appointments.date, appointments.startTime);
    return rows;
  }

  // Revenue breakdown by service
  async getRevenueByService(barbershopId: string, startDate: string, endDate: string): Promise<any[]> {
    const txns = await this.getTransactionsByPeriod(barbershopId, startDate, endDate);
    const serviceMap: Record<string, { name: string; count: number; revenue: number }> = {};

    for (const t of txns) {
      if (t.type !== "service") continue;
      const key = t.category || t.description || "Serviço";
      if (!serviceMap[key]) serviceMap[key] = { name: key, count: 0, revenue: 0 };
      serviceMap[key].count += 1;
      serviceMap[key].revenue += parseFloat(t.amount?.toString() || "0");
    }
    return Object.values(serviceMap).sort((a, b) => b.revenue - a.revenue);
  }

  // Revenue breakdown by product
  async getRevenueByProduct(barbershopId: string, startDate: string, endDate: string): Promise<any[]> {
    const txns = await this.getTransactionsByPeriod(barbershopId, startDate, endDate);
    const productMap: Record<string, { name: string; qty: number; revenue: number; cost: number }> = {};

    for (const t of txns) {
      if (t.type !== "product") continue;
      const key = t.description || "Produto";
      if (!productMap[key]) productMap[key] = { name: key, qty: 0, revenue: 0, cost: 0 };
      productMap[key].qty += 1;
      productMap[key].revenue += parseFloat(t.amount?.toString() || "0");
    }
    return Object.values(productMap).sort((a, b) => b.revenue - a.revenue);
  }
}

export const storage = new DatabaseStorage();
