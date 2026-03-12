# Teixeira Barbearia - Sistema de Gestão

## Overview
Full-stack barbershop management system for Teixeira Barbearia (Kobrasol, São José - SC, est. 2018). Includes a premium public-facing landing page and an ERP system with 3 core modules.

## Architecture
- **Frontend**: React + Vite + TanStack Query + Wouter routing + Tailwind CSS + shadcn/ui
- **Backend**: Express.js REST API with PostgreSQL via Drizzle ORM
- **Auth**: Email/password login with express-session + crypto.scrypt hashing
- **Theme**: Dark (#0e0e0e) + Gold (#C9A24D) premium aesthetic throughout

## Authentication
- Login and registration via email/password at `/login` page (toggle between modes)
- Registration creates user + barbershop with auto-generated slug
- Session stored in PostgreSQL via connect-pg-simple (sessions table)
- Password hashing uses Node.js crypto.scrypt (no external dependencies)
- Default owner credentials: admin@teixeira.com / teixeira2024
- Owner and barbershop auto-seeded on first startup via `seedOwner()` in `server/auth.ts`
- Logout clears session and redirects to landing page

## Key Routes

### Public (no auth)
- `/` — Landing page (fetches services/barbers from API with fallback data)
- `/login` — Owner login page
- `/book/:slug` — Booking page
- `/agendar/:slug` — Client booking page

### ERP (authenticated)
- `/` — Owner Dashboard
- `/agenda` — Agenda (appointment management with date nav, barber filter, status actions)
- `/team` — Funcionários (staff management with photo upload, commission, edit/delete)
- `/services` — Serviços (price/duration management, active toggle, edit/delete)
- `/products` — Produtos (inventory, margin calculation, stock alerts, edit/delete)
- `/whatsapp` — WhatsApp Bot (Baileys QR connection, AI chat, auto notifications)
- `/settings` — Configurações

### API Endpoints
- `POST /api/auth/login` — Email/password login
- `POST /api/auth/register` — Create account (user + barbershop)
- `POST /api/auth/logout` — Logout (destroy session)
- `GET /api/auth/user` — Get current authenticated user
- `GET/POST/PATCH/DELETE /api/barbers` — Staff CRUD
- `GET/POST/PATCH/DELETE /api/services` — Services CRUD
- `GET/POST/PATCH/DELETE /api/products` — Products CRUD
- `GET /api/appointments?date=YYYY-MM-DD&detailed=true` — Appointments with barber/service details
- `PATCH /api/appointments/:id/status` — Update status (with ownership check)
- `GET /api/public/barbershops/:slug/services` — Public services
- `GET /api/public/barbershops/:slug/barbers` — Public barbers (active only)
- `GET /api/public/barbershops/:slug/availability?barberId=X&date=Y&serviceId=Z` — Available time slots
- `POST /api/public/appointments` — Create booking (with server-side overlap validation, sends WhatsApp notification)
- `GET /api/whatsapp/status` — WhatsApp connection status + QR code (authenticated)
- `POST /api/whatsapp/reconnect` — Trigger WhatsApp reconnect (authenticated)

## Business Info
- **Address**: Rua Koesa, 430, Sala 03, Kobrasol, São José – SC
- **Phone**: (48) 99950-5167
- **WhatsApp**: 5548999505167
- **Instagram**: @teixeirabarbeariaoficial
- **Booking slug**: teixeira

## Key Files
- `shared/schema.ts` — Drizzle schema (all tables, insert schemas, types)
- `server/auth.ts` — Email/password auth module (setupAuth, isAuthenticated, seedOwner)
- `server/storage.ts` — IStorage interface + DatabaseStorage implementation
- `server/routes.ts` — All API routes (public + authenticated)
- `client/src/App.tsx` — App router with auth-based routing + logout
- `client/src/hooks/useAuth.ts` — Auth hook using returnNull on 401
- `client/src/components/app-sidebar.tsx` — ERP sidebar navigation
- `client/src/pages/login.tsx` — Login page (dark/gold theme)
- `client/src/pages/landing.tsx` — Public landing page (API-connected)
- `client/src/pages/team.tsx` — Staff management (photo upload via base64)
- `client/src/pages/services.tsx` — Services management
- `client/src/pages/products.tsx` — Products/inventory management
- `client/src/pages/appointments.tsx` — ERP agenda page (dark/gold, date nav, status actions)
- `client/src/pages/client-booking.tsx` — Public booking page (5-step stepper, availability API)
- `server/whatsapp.ts` — Baileys WhatsApp singleton (QR, send, reconnect, session persistence)
- `server/whatsapp-ai.ts` — OpenAI gpt-4o-mini handler for auto-replies (OPENAI_API_KEY required)
- `client/src/pages/whatsapp-bot.tsx` — ERP WhatsApp management page

## Design Patterns
- ERP pages use inline dark theme (bg-[#0e0e0e]) matching landing page
- Photo upload stores base64 data URI in barber.photoUrl field (max 2MB)
- Landing page fetches from `/api/public/barbershops/teixeira/*` with graceful fallback to hardcoded data on network errors only
- All ERP forms use shadcn Dialog with dark-themed inputs
- Delete operations use AlertDialog confirmation
- Auth uses `(req.user as any).id` pattern in routes (set by isAuthenticated middleware)
