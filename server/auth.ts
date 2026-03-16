import type { Express, RequestHandler } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { db } from "./db";
import { users, barbershops, barbers, services } from "@shared/schema";
import { eq, ne } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashedPassword, salt] = stored.split(".");
  const buf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(Buffer.from(hashedPassword, "hex"), buf);
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);

  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  app.use(
    session({
      secret: process.env.SESSION_SECRET || (process.env.NODE_ENV === "production" ? (() => { throw new Error("SESSION_SECRET must be set in production"); })() : "teixeira-dev-secret-key"),
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: sessionTtl,
        sameSite: "lax",
      },
    })
  );
}

export function registerAuthRoutes(app: Express) {
  const loginHandler: RequestHandler = async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email e senha são obrigatórios" });
      }

      const [user] = await db.select().from(users).where(eq(users.email, email));
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Email ou senha inválidos" });
      }

      const isValid = await comparePasswords(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ message: "Email ou senha inválidos" });
      }

      (req.session as any).userId = user.id;

      const { passwordHash, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Erro interno ao fazer login" });
    }
  };

  const logoutHandler: RequestHandler = (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Erro ao fazer logout" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logout realizado com sucesso" });
    });
  };

  const registerHandler: RequestHandler = async (req, res) => {
    try {
      const { email, password, firstName, lastName, barbershopName } = req.body;

      if (!email || !password || !firstName || !barbershopName) {
        return res.status(400).json({ message: "Nome, email, senha e nome da barbearia são obrigatórios" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "A senha deve ter pelo menos 6 caracteres" });
      }

      const [existing] = await db.select().from(users).where(eq(users.email, email));
      if (existing) {
        return res.status(409).json({ message: "Este email já está cadastrado" });
      }

      const hash = await hashPassword(password);
      const [newUser] = await db
        .insert(users)
        .values({
          email,
          passwordHash: hash,
          firstName,
          lastName: lastName || null,
          role: "owner",
        })
        .returning();

      let baseSlug = barbershopName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      if (!baseSlug) baseSlug = "barbearia";

      let slug = baseSlug;
      let suffix = 1;
      while (true) {
        const [existingShop] = await db.select().from(barbershops).where(eq(barbershops.slug, slug));
        if (!existingShop) break;
        slug = `${baseSlug}-${suffix}`;
        suffix++;
      }

      await db.insert(barbershops).values({
        ownerId: newUser.id,
        name: barbershopName,
        slug,
      });

      (req.session as any).userId = newUser.id;

      const { passwordHash: _, ...safeUser } = newUser;
      res.status(201).json(safeUser);
    } catch (error) {
      console.error("Register error:", error);
      res.status(500).json({ message: "Erro interno ao criar conta" });
    }
  };

  app.post("/api/auth/login", loginHandler);
  app.post("/api/login", loginHandler);
  app.post("/api/auth/register", registerHandler);
  app.post("/api/register", registerHandler);
  app.post("/api/auth/logout", logoutHandler);
  app.post("/api/logout", logoutHandler);

  app.get("/api/auth/user", async (req, res) => {
    const userId = (req.session as any)?.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { passwordHash, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  const userId = (req.session as any)?.userId;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  (req as any).user = { id: userId };
  next();
};

export async function seedOwner() {
  try {
    const [existingOwner] = await db
      .select()
      .from(users)
      .where(eq(users.email, "admin@teixeira.com"));

    if (existingOwner) {
      if (!existingOwner.passwordHash) {
        const hash = await hashPassword("teixeira2024");
        await db.update(users).set({ passwordHash: hash, role: "owner" }).where(eq(users.id, existingOwner.id));
        console.log("Owner password updated: admin@teixeira.com");
      }
      return;
    }

    const hash = await hashPassword("teixeira2024");
    const [owner] = await db
      .insert(users)
      .values({
        email: "admin@teixeira.com",
        passwordHash: hash,
        firstName: "Admin",
        lastName: "Teixeira",
        role: "owner",
      })
      .returning();

    const [existingShop] = await db
      .select()
      .from(barbershops)
      .where(eq(barbershops.ownerId, owner.id));

    if (!existingShop) {
      await db.insert(barbershops).values({
        ownerId: owner.id,
        name: "Teixeira Barbearia",
        slug: "teixeira",
        phone: "5548999505167",
        email: "admin@teixeira.com",
        address: "Rua Koesa, 430, Sala 03",
        city: "São José",
        state: "SC",
        neighborhood: "Kobrasol",
      });
    }

    console.log("Owner seeded: admin@teixeira.com / teixeira2024");
  } catch (error) {
    console.error("Error seeding owner:", error);
  }

  try {
    const [mainShop] = await db.select().from(barbershops).where(eq(barbershops.slug, "teixeira"));
    if (mainShop) {
      const orphanShops = await db.select().from(barbershops).where(ne(barbershops.slug, "teixeira"));
      for (const orphan of orphanShops) {
        await db.update(barbers).set({ barbershopId: mainShop.id }).where(eq(barbers.barbershopId, orphan.id));
        await db.update(services).set({ barbershopId: mainShop.id }).where(eq(services.barbershopId, orphan.id));
        await db.delete(barbershops).where(eq(barbershops.id, orphan.id));
        console.log(`Migrated orphan barbershop "${orphan.name}" (${orphan.slug}) → teixeira`);
      }
    }
  } catch (error) {
    console.error("Error migrating orphan barbershops:", error);
  }
}
