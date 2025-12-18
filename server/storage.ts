import { eq, and, gte, lte, desc, sql, count, sum } from "drizzle-orm";
import { db } from "./db";
import {
  users, barbershops, barbers, services, serviceCategories,
  clients, appointments, products, transactions, loyaltyPlans,
  subscriptionPackages, coupons, reviews, barberTimeOff, notifications,
  type User, type UpsertUser, type Barbershop, type InsertBarbershop,
  type Barber, type InsertBarber, type Service, type InsertService,
  type ServiceCategory, type InsertServiceCategory,
  type Client, type InsertClient, type Appointment, type InsertAppointment,
  type Product, type InsertProduct, type Transaction, type InsertTransaction,
  type LoyaltyPlan, type InsertLoyaltyPlan, type SubscriptionPackage, type InsertSubscriptionPackage,
  type Coupon, type InsertCoupon, type Review, type InsertReview,
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
  getAppointment(id: string): Promise<Appointment | undefined>;
  createAppointment(data: InsertAppointment): Promise<Appointment>;
  updateAppointmentStatus(id: string, status: string): Promise<Appointment | undefined>;

  // Products
  getProducts(barbershopId: string): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(data: InsertProduct): Promise<Product>;
  updateProduct(id: string, data: Partial<InsertProduct>): Promise<Product | undefined>;

  // Transactions
  getTransactions(barbershopId: string): Promise<Transaction[]>;
  createTransaction(data: InsertTransaction): Promise<Transaction>;

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
  updateReviewReply(id: string, reply: string): Promise<Review | undefined>;
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
}

export const storage = new DatabaseStorage();
