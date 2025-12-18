import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  decimal,
  jsonb,
  index,
  date,
  time,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// Users table (Replit Auth compatible)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  phone: varchar("phone"),
  role: varchar("role", { length: 20 }).default("client"), // owner, barber, client
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Barbershops (Multi-tenant)
export const barbershops = pgTable("barbershops", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).unique().notNull(),
  description: text("description"),
  address: text("address"),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email"),
  logoUrl: varchar("logo_url"),
  coverUrl: varchar("cover_url"),
  primaryColor: varchar("primary_color", { length: 7 }).default("#0066FF"),
  openingTime: time("opening_time").default("09:00"),
  closingTime: time("closing_time").default("19:00"),
  workDays: jsonb("work_days").default(["mon", "tue", "wed", "thu", "fri", "sat"]),
  subscriptionPlan: varchar("subscription_plan", { length: 50 }).default("basic"),
  subscriptionStatus: varchar("subscription_status", { length: 20 }).default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Barbers (Staff members)
export const barbers = pgTable("barbers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  barbershopId: varchar("barbershop_id").references(() => barbershops.id).notNull(),
  userId: varchar("user_id").references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email"),
  phone: varchar("phone", { length: 20 }),
  photoUrl: varchar("photo_url"),
  bio: text("bio"),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).default("50.00"),
  isActive: boolean("is_active").default(true),
  workStartTime: time("work_start_time").default("09:00"),
  workEndTime: time("work_end_time").default("19:00"),
  workDays: jsonb("work_days").default(["mon", "tue", "wed", "thu", "fri", "sat"]),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Service Categories
export const serviceCategories = pgTable("service_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  barbershopId: varchar("barbershop_id").references(() => barbershops.id).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Services
export const services = pgTable("services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  barbershopId: varchar("barbershop_id").references(() => barbershops.id).notNull(),
  categoryId: varchar("category_id").references(() => serviceCategories.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  duration: integer("duration").notNull(), // in minutes
  isCombo: boolean("is_combo").default(false),
  isActive: boolean("is_active").default(true),
  imageUrl: varchar("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Barber-Service assignments (which barber can do which service)
export const barberServices = pgTable("barber_services", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  barberId: varchar("barber_id").references(() => barbers.id).notNull(),
  serviceId: varchar("service_id").references(() => services.id).notNull(),
});

// Clients (CRM)
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  barbershopId: varchar("barbershop_id").references(() => barbershops.id).notNull(),
  userId: varchar("user_id").references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email"),
  phone: varchar("phone", { length: 20 }),
  photoUrl: varchar("photo_url"),
  birthDate: date("birth_date"),
  notes: text("notes"),
  preferences: text("preferences"),
  loyaltyPoints: integer("loyalty_points").default(0),
  totalVisits: integer("total_visits").default(0),
  totalSpent: decimal("total_spent", { precision: 10, scale: 2 }).default("0.00"),
  lastVisit: timestamp("last_visit"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Appointments
export const appointments = pgTable("appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  barbershopId: varchar("barbershop_id").references(() => barbershops.id).notNull(),
  clientId: varchar("client_id").references(() => clients.id),
  barberId: varchar("barber_id").references(() => barbers.id).notNull(),
  serviceId: varchar("service_id").references(() => services.id).notNull(),
  date: date("date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  status: varchar("status", { length: 20 }).default("pending"), // pending, confirmed, completed, cancelled, no_show
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  clientName: varchar("client_name", { length: 255 }),
  clientPhone: varchar("client_phone", { length: 20 }),
  reminderSent: boolean("reminder_sent").default(false),
  confirmedAt: timestamp("confirmed_at"),
  completedAt: timestamp("completed_at"),
  cancelledAt: timestamp("cancelled_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Appointment extras (additional services added to appointment)
export const appointmentExtras = pgTable("appointment_extras", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  appointmentId: varchar("appointment_id").references(() => appointments.id).notNull(),
  serviceId: varchar("service_id").references(() => services.id).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
});

// Wait list
export const waitlist = pgTable("waitlist", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  barbershopId: varchar("barbershop_id").references(() => barbershops.id).notNull(),
  clientId: varchar("client_id").references(() => clients.id),
  barberId: varchar("barber_id").references(() => barbers.id),
  serviceId: varchar("service_id").references(() => services.id).notNull(),
  preferredDate: date("preferred_date").notNull(),
  clientName: varchar("client_name", { length: 255 }),
  clientPhone: varchar("client_phone", { length: 20 }),
  notes: text("notes"),
  status: varchar("status", { length: 20 }).default("waiting"), // waiting, notified, booked, expired
  createdAt: timestamp("created_at").defaultNow(),
});

// Products (Inventory)
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  barbershopId: varchar("barbershop_id").references(() => barbershops.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  sku: varchar("sku", { length: 100 }),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }),
  stockQuantity: integer("stock_quantity").default(0),
  lowStockThreshold: integer("low_stock_threshold").default(5),
  imageUrl: varchar("image_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Financial Transactions
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  barbershopId: varchar("barbershop_id").references(() => barbershops.id).notNull(),
  appointmentId: varchar("appointment_id").references(() => appointments.id),
  barberId: varchar("barber_id").references(() => barbers.id),
  clientId: varchar("client_id").references(() => clients.id),
  type: varchar("type", { length: 20 }).notNull(), // service, product, expense, refund
  category: varchar("category", { length: 50 }),
  description: text("description"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 20 }), // cash, pix, credit, debit
  commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }),
  date: date("date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Expense Categories
export const expenseCategories = pgTable("expense_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  barbershopId: varchar("barbershop_id").references(() => barbershops.id).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  isRecurring: boolean("is_recurring").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Loyalty Plans
export const loyaltyPlans = pgTable("loyalty_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  barbershopId: varchar("barbershop_id").references(() => barbershops.id).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  pointsPerCurrency: integer("points_per_currency").default(1), // 1 point per R$1
  rewardThreshold: integer("reward_threshold").default(100), // points needed for reward
  rewardValue: decimal("reward_value", { precision: 10, scale: 2 }), // discount value
  rewardType: varchar("reward_type", { length: 20 }).default("discount"), // discount, free_service
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Subscription Packages (Monthly plans for clients)
export const subscriptionPackages = pgTable("subscription_packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  barbershopId: varchar("barbershop_id").references(() => barbershops.id).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  credits: integer("credits").notNull(), // number of services included
  validityDays: integer("validity_days").default(30),
  includedServices: jsonb("included_services"), // array of service IDs
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Client Subscriptions
export const clientSubscriptions = pgTable("client_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id).notNull(),
  packageId: varchar("package_id").references(() => subscriptionPackages.id).notNull(),
  remainingCredits: integer("remaining_credits").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: varchar("status", { length: 20 }).default("active"), // active, expired, cancelled
  autoRenew: boolean("auto_renew").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Coupons
export const coupons = pgTable("coupons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  barbershopId: varchar("barbershop_id").references(() => barbershops.id).notNull(),
  code: varchar("code", { length: 50 }).notNull(),
  description: text("description"),
  discountType: varchar("discount_type", { length: 20 }).default("percentage"), // percentage, fixed
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }).notNull(),
  minPurchase: decimal("min_purchase", { precision: 10, scale: 2 }),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").default(0),
  validFrom: date("valid_from"),
  validUntil: date("valid_until"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Reviews/Ratings
export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  barbershopId: varchar("barbershop_id").references(() => barbershops.id).notNull(),
  clientId: varchar("client_id").references(() => clients.id).notNull(),
  barberId: varchar("barber_id").references(() => barbers.id),
  appointmentId: varchar("appointment_id").references(() => appointments.id),
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  reply: text("reply"),
  isPublic: boolean("is_public").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Before/After Photos
export const clientPhotos = pgTable("client_photos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id).notNull(),
  appointmentId: varchar("appointment_id").references(() => appointments.id),
  beforeUrl: varchar("before_url"),
  afterUrl: varchar("after_url"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Barber Time Off / Blocked Times
export const barberTimeOff = pgTable("barber_time_off", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  barberId: varchar("barber_id").references(() => barbers.id).notNull(),
  date: date("date").notNull(),
  startTime: time("start_time"),
  endTime: time("end_time"),
  allDay: boolean("all_day").default(false),
  reason: varchar("reason", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notifications / Automation logs
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  barbershopId: varchar("barbershop_id").references(() => barbershops.id).notNull(),
  recipientId: varchar("recipient_id"),
  recipientType: varchar("recipient_type", { length: 20 }), // client, barber
  type: varchar("type", { length: 50 }).notNull(), // reminder, confirmation, birthday, follow_up
  channel: varchar("channel", { length: 20 }), // email, whatsapp, sms
  subject: varchar("subject", { length: 255 }),
  message: text("message"),
  status: varchar("status", { length: 20 }).default("pending"), // pending, sent, failed
  scheduledFor: timestamp("scheduled_for"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Revenue Goals
export const revenueGoals = pgTable("revenue_goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  barbershopId: varchar("barbershop_id").references(() => barbershops.id).notNull(),
  month: integer("month").notNull(),
  year: integer("year").notNull(),
  targetAmount: decimal("target_amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  ownedBarbershops: many(barbershops),
  barberProfiles: many(barbers),
  clientProfiles: many(clients),
}));

export const barbershopsRelations = relations(barbershops, ({ one, many }) => ({
  owner: one(users, { fields: [barbershops.ownerId], references: [users.id] }),
  barbers: many(barbers),
  services: many(services),
  clients: many(clients),
  appointments: many(appointments),
  products: many(products),
  transactions: many(transactions),
}));

export const barbersRelations = relations(barbers, ({ one, many }) => ({
  barbershop: one(barbershops, { fields: [barbers.barbershopId], references: [barbershops.id] }),
  user: one(users, { fields: [barbers.userId], references: [users.id] }),
  appointments: many(appointments),
  barberServices: many(barberServices),
  timeOff: many(barberTimeOff),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  barbershop: one(barbershops, { fields: [services.barbershopId], references: [barbershops.id] }),
  category: one(serviceCategories, { fields: [services.categoryId], references: [serviceCategories.id] }),
  barberServices: many(barberServices),
  appointments: many(appointments),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  barbershop: one(barbershops, { fields: [clients.barbershopId], references: [barbershops.id] }),
  user: one(users, { fields: [clients.userId], references: [users.id] }),
  appointments: many(appointments),
  reviews: many(reviews),
  photos: many(clientPhotos),
  subscriptions: many(clientSubscriptions),
}));

export const appointmentsRelations = relations(appointments, ({ one, many }) => ({
  barbershop: one(barbershops, { fields: [appointments.barbershopId], references: [barbershops.id] }),
  client: one(clients, { fields: [appointments.clientId], references: [clients.id] }),
  barber: one(barbers, { fields: [appointments.barberId], references: [barbers.id] }),
  service: one(services, { fields: [appointments.serviceId], references: [services.id] }),
  extras: many(appointmentExtras),
}));

// Insert Schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBarbershopSchema = createInsertSchema(barbershops).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBarberSchema = createInsertSchema(barbers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertServiceCategorySchema = createInsertSchema(serviceCategories).omit({ id: true, createdAt: true });
export const insertServiceSchema = createInsertSchema(services).omit({ id: true, createdAt: true, updatedAt: true });
export const insertClientSchema = createInsertSchema(clients).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAppointmentSchema = createInsertSchema(appointments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true, createdAt: true });
export const insertCouponSchema = createInsertSchema(coupons).omit({ id: true, createdAt: true });
export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true, createdAt: true });
export const insertSubscriptionPackageSchema = createInsertSchema(subscriptionPackages).omit({ id: true, createdAt: true });
export const insertLoyaltyPlanSchema = createInsertSchema(loyaltyPlans).omit({ id: true, createdAt: true });
export const insertBarberTimeOffSchema = createInsertSchema(barberTimeOff).omit({ id: true, createdAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export const insertRevenueGoalSchema = createInsertSchema(revenueGoals).omit({ id: true, createdAt: true });

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertBarbershop = z.infer<typeof insertBarbershopSchema>;
export type Barbershop = typeof barbershops.$inferSelect;
export type InsertBarber = z.infer<typeof insertBarberSchema>;
export type Barber = typeof barbers.$inferSelect;
export type InsertServiceCategory = z.infer<typeof insertServiceCategorySchema>;
export type ServiceCategory = typeof serviceCategories.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type Service = typeof services.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type Appointment = typeof appointments.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertCoupon = z.infer<typeof insertCouponSchema>;
export type Coupon = typeof coupons.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertSubscriptionPackage = z.infer<typeof insertSubscriptionPackageSchema>;
export type SubscriptionPackage = typeof subscriptionPackages.$inferSelect;
export type InsertLoyaltyPlan = z.infer<typeof insertLoyaltyPlanSchema>;
export type LoyaltyPlan = typeof loyaltyPlans.$inferSelect;
export type InsertBarberTimeOff = z.infer<typeof insertBarberTimeOffSchema>;
export type BarberTimeOff = typeof barberTimeOff.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertRevenueGoal = z.infer<typeof insertRevenueGoalSchema>;
export type RevenueGoal = typeof revenueGoals.$inferSelect;
