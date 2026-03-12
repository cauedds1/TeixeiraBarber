# Teixeira Barbearia - Sistema de Gestão

## Overview
Full-stack barbershop management system for Teixeira Barbearia (Kobrasol, São José - SC, est. 2018). Includes a premium public-facing landing page and an ERP system with 3 core modules.

## Architecture
- **Frontend**: React + Vite + TanStack Query + Wouter routing + Tailwind CSS + shadcn/ui
- **Backend**: Express.js REST API with PostgreSQL via Drizzle ORM
- **Auth**: Replit Auth (session-based)
- **Theme**: Dark (#0e0e0e) + Gold (#C9A24D) premium aesthetic throughout

## Key Routes

### Public (no auth)
- `/` — Landing page (fetches services/barbers from API with fallback data)
- `/book/:slug` — Booking page
- `/agendar/:slug` — Client booking page

### ERP (authenticated)
- `/` — Owner Dashboard
- `/team` — Funcionários (staff management with photo upload, commission, edit/delete)
- `/services` — Serviços (price/duration management, active toggle, edit/delete)
- `/products` — Produtos (inventory, margin calculation, stock alerts, edit/delete)
- `/settings` — Configurações

### API Endpoints
- `GET/POST/PATCH/DELETE /api/barbers` — Staff CRUD
- `GET/POST/PATCH/DELETE /api/services` — Services CRUD
- `GET/POST/PATCH/DELETE /api/products` — Products CRUD
- `GET /api/public/barbershops/:slug/services` — Public services
- `GET /api/public/barbershops/:slug/barbers` — Public barbers (active only)

## Business Info
- **Address**: Rua Koesa, 430, Sala 03, Kobrasol, São José – SC
- **Phone**: (48) 99950-5167
- **WhatsApp**: 5548999505167
- **Instagram**: @teixeirabarbeariaoficial
- **Booking slug**: teixeira

## Key Files
- `shared/schema.ts` — Drizzle schema (all tables, insert schemas, types)
- `server/storage.ts` — IStorage interface + DatabaseStorage implementation
- `server/routes.ts` — All API routes (public + authenticated)
- `client/src/App.tsx` — App router with auth-based routing
- `client/src/components/app-sidebar.tsx` — ERP sidebar navigation
- `client/src/pages/landing.tsx` — Public landing page (API-connected)
- `client/src/pages/team.tsx` — Staff management (photo upload via base64)
- `client/src/pages/services.tsx` — Services management
- `client/src/pages/products.tsx` — Products/inventory management

## Design Patterns
- ERP pages use inline dark theme (bg-[#0e0e0e]) matching landing page
- Photo upload stores base64 data URI in barber.photoUrl field (max 2MB)
- Landing page fetches from `/api/public/barbershops/teixeira/*` with graceful fallback to hardcoded data when barbershop not found
- All ERP forms use shadcn Dialog with dark-themed inputs
- Delete operations use AlertDialog confirmation
