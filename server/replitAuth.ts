import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { storage } from "./storage";
import type { User } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends User {}
  }
}

const getOidcConfig = memoize(
  async () => {
    return client.discovery(
      new URL(process.env.REPLIT_DEPLOYMENT_URL || `https://${process.env.REPLIT_DEV_DOMAIN}`),
      process.env.REPLIT_IDENTITY_TOKEN_AUDIENCE!
    );
  },
  { maxAge: 3600 * 1000 }
);

export async function setupAuth(app: Express) {
  const PgSession = connectPgSimple(session);
  
  app.set("trust proxy", 1);

  app.use(
    session({
      store: new PgSession({
        pool,
        tableName: "sessions",
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "fallback-secret-for-development",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        sameSite: "lax",
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (tokens: client.TokenEndpointResponse, verified: passport.AuthenticateCallback) => {
    const claims = tokens.claims();
    if (!claims) {
      return verified(new Error("No claims in token"));
    }

    const userData = {
      id: claims.sub,
      email: claims.email as string | undefined,
      firstName: claims.first_name as string | undefined,
      lastName: claims.last_name as string | undefined,
      profileImageUrl: claims.profile_image_url as string | undefined,
    };

    const user = await storage.upsertUser(userData);
    verified(null, user);
  };

  const strategy = new Strategy(
    {
      config,
      scope: "openid email profile",
      callbackURL: "/api/callback",
    },
    verify
  );

  passport.use(strategy);

  passport.serializeUser((user, cb) => cb(null, user.id));
  passport.deserializeUser(async (id: string, cb) => {
    try {
      const user = await storage.getUser(id);
      cb(null, user || null);
    } catch (error) {
      cb(error);
    }
  });

  app.get("/api/login", passport.authenticate("openid-client"));
  
  app.get(
    "/api/callback",
    passport.authenticate("openid-client", {
      successRedirect: "/",
      failureRedirect: "/",
    })
  );

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect("/");
    });
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};
