# Eventro — College Event Management System

Eventro is a self-hostable web application for managing college events: discovery, registration, QR ticketing, and administrative management. It is implemented as a modern TypeScript + React single-page application (SPA) and uses Supabase for authentication and Postgres storage. The project is packaged for containerized deployment (Docker + Nginx).

---

## Table of contents
- [Overview](#overview)
- [Features](#features)
- [Technology stack](#technology-stack)
- [Repository structure](#repository-structure)
- [Getting started (developer)](#getting-started-developer)
- [Environment variables](#environment-variables)
- [Local development](#local-development)
- [Build & Production with Docker](#build--production-with-docker)
- [Supabase setup & Database schema](#supabase-setup--database-schema)
- [Key design decisions](#key-design-decisions)
- [Scripts & maintenance](#scripts--maintenance)
- [Testing & CI](#testing--ci)
- [Contributing](#contributing)
- [Troubleshooting](#troubleshooting)
- [Roadmap / Future enhancements](#roadmap--future-enhancements)
- [License](#license)

---

## Overview

Eventro centralizes campus event workflows into a single platform that supports:

- Event listing and discovery with status badges (today, tomorrow, upcoming, ongoing, completed).
- Secure user authentication and role-aware experiences (admins vs students vs guests).
- Registration flows with QR ticket generation and ticket viewing.
- Administrative CRUD for events and maintenance utilities for ticket backfill.

The application is designed for easy self-hosting by institutions: the frontend is a static SPA, backend services are handled via Supabase (Auth + Postgres), and deployment is containerized with Docker.

## Features

- Responsive SPA UI (React + TypeScript) with Tailwind CSS.
- Role-based routing and admin dashboard for event management.
- Registration and ticketing with QR code generation.
- Maintenance scripts for bulk ticket backfill.
- Dockerized build & Nginx static serving for production.

## Technology stack

- Frontend: React 18, TypeScript, Vite, `@vitejs/plugin-react-swc`.
- Styling: Tailwind CSS, shadcn UI components + Radix primitives.
- State & data: `@tanstack/react-query`, `react-router-dom`.
- Charts: Recharts.
- Backend-as-a-Service: Supabase (Auth + Postgres + Realtime).
- Deployment: Docker, Nginx (static serving), docker-compose for orchestration.

## Repository structure

Key files and folders:

- `src/` — application source (pages, components, integrations).
  - `src/pages/` — top-level pages (Home, Events, AdminDashboard, Dashboard, etc.).
  - `src/components/` — reusable UI components (EventCard, EventDialog, Header, StudentRegistration).
  - `src/integrations/supabase/` — Supabase client and generated types.
- `scripts/` — utility scripts (e.g., `backfillTickets.js`).
- `docker/` — `nginx.conf` used by the Docker image.
- `Dockerfile`, `docker-compose.yml` — container build and compose configuration.
- `events.csv`, `upcoming_events.csv` — seed/example data.
- `package.json` — scripts & dependencies.

## Getting started (developer)

Prerequisites:

- Node.js (18+ recommended). npm is included with Node.js.
- If you don't have `npm` installed, install Node.js from https://nodejs.org/ (recommended) or use a version manager like `nvm` (macOS/Linux) or `nvm-windows` (Windows).
- Optional: Docker & docker-compose for containerized development.

Clone the repository and install dependencies:

```cmd
git clone <YOUR_GIT_URL>
cd EventHub-main
npm install
```

### Environment variables

Create a `.env` file in the project root (do NOT commit) with the following variables:

- `VITE_SUPABASE_URL` — your Supabase project URL.
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase anon/public key.

Example `.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_public_anon_key
```

Note: Vite embeds `VITE_` variables at build time. If you need runtime-configurable endpoints, use a runtime config file approach.

## Local development

Start the dev server:

```cmd
npm run dev
```

Open `http://localhost:5173` (or the address Vite reports) to view the app.

Run linting:

```cmd
npm run lint
```

Run the backfill script (use cautiously — requires appropriate Supabase keys):

```cmd
npm run backfill:tickets
```

## Build & Production with Docker

The project includes a multi-stage `Dockerfile` that builds the SPA and serves it with Nginx.

Build and run with Docker Compose (example for Windows `cmd.exe`):

```cmd
cd /d d:\EventHub-main\EventHub-main
set VITE_SUPABASE_URL=https://your-project.supabase.co
set VITE_SUPABASE_PUBLISHABLE_KEY=your_public_anon_key
docker compose up --build -d web
```

View logs:

```cmd
docker compose logs -f web
```

Stop:

```cmd
docker compose down
```

### Notes on environment variables and Docker

- The Docker build accepts `--build-arg` for `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` which are set as build-time `ENV` values so Vite can embed them into the bundle. Changing these requires rebuilding the image.
- If you need runtime-configurable secrets, consider a small entrypoint script to substitute values into a `config.json` that the SPA reads at startup.

## Supabase setup & Database schema

Eventro uses Supabase (Postgres) for authentication and data storage. The repo includes generated types at `src/integrations/supabase/types.ts` which reflect the following key tables:

- `users` — `{ id, email, name, role, created_at }`
- `events` — `{ id, title, date, time, end_time, description, location, type, university_name, created_by, created_at }`
- `registrations` — `{ id, event_id, user_id, registered_at, ticket_id, ticket_qr, attended, attended_at }`

Primary relationships:

- `events.created_by` → `users.id`
- `registrations.event_id` → `events.id`
- `registrations.user_id` → `users.id`

Recommended server-side security:

- Implement Row-Level Security (RLS) policies in Supabase to ensure only authorized operations are allowed. The frontend performs role checks for UI, but authoritative enforcement must be in DB policies or server functions.
- Use Postgres RPCs (supabase functions) for privileged operations like atomic ticket check-in (to prevent double-use and races).

## Key design decisions

- **Frontend-first client-driven model**: The SPA communicates directly with Supabase via `@supabase/supabase-js`, which reduces the need for a custom backend but requires careful DB security policies.
- **Client-side QR generation**: Quick user feedback without server latency; ticket metadata is persisted in the `registrations` table. For security, consider signing QR payloads.
- **Dockerized static hosting**: Simple deployment workflow and small operational footprint.

## Scripts & maintenance

- `scripts/backfillTickets.js` — utility for populating or repairing ticket fields in bulk (requires service key privileges).

## Testing & CI

- Unit tests: recommend adding tests with Jest + React Testing Library for components and utility functions.
- E2E: use Playwright/Cypress to test registration → ticket → check-in flows.
- CI: GitHub Actions workflow exists in `.github/workflows/` (lint/build steps can be adapted to run tests).

## Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feat/my-feature`.
3. Add tests where appropriate and run linting.
4. Open a pull request against `main`.

Please follow the existing code style and add documentation for any new public API or configuration requirement.

## Troubleshooting

- **Images not loading**: verify that the event record contains a valid HTTPS image URL and that the host allows cross-origin requests. Inspect network errors in browser DevTools.
- **Auth issues**: ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are correctly set. Service keys must never be committed.
- **Docker build issues**: ensure Docker daemon is running and no other process is listening on port 80 (or change compose port mapping).

## Roadmap / Future enhancements

- Payment integration (Stripe) for paid events and invoices.
- Campus SSO (SAML/LDAP) for institutional login.
- Mobile check-in app with offline sync and attendance analytics.

## License

Add your license here (e.g., MIT). If you plan to open-source the project, include a `LICENSE` file at the repo root.

---

If you want, I can also add a `SUPABASE.md` with example RLS policies and a `migrations/` folder containing a `checkin_ticket.sql` RPC example. Would you like me to add those next?
