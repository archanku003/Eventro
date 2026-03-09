Slide 1 — Agenda

- Project overview: Eventro — College Event Management System
- Problem statement
- Conceptual framework
- Framework details / additional explanation
- Methodology (implementation + tech stack)
- Result overview / demo highlights
- References

---

Slide 2 — Problem Statement

- College events are decentralized: discovery, registration, and ticketing are fragmented.
- Administrators lack a simple, self-hostable tool for event CRUD, registration tracking, and QR-based ticketing.
- Students need an easy, mobile-friendly way to discover events, register, and receive verifiable tickets.
- Goal: Provide a single, self-hostable SPA that supports discovery, role-based flows, QR ticketing, and admin management.

Speaker notes: emphasize need for easy self-hosting (Supabase + Docker) and campus privacy/security concerns (RLS).

---

Slide 3 — Conceptual Framework

- Users & Roles:
  - Students (discover, register, receive QR ticket)
  - Admins (create/update/delete events, view registrations)
  - Guests (view only)

- Data Model (key entities):
  - `events` (id, title, date, time, end_time, description, location, image, created_by)
  - `registrations` (id, event_id, user_id, ticket_id, ticket_qr, ticket_issued_at, attended)
  - `users` / `students` (profile data, saved contact metadata)

- Flows:
  - Discovery → Event details → StudentRegistration → Create registration + generate QR
  - Admin CRUD → event lifecycle management → registrations monitoring

Visual: boxes for Users, Events, Registrations, Supabase (Auth + Postgres) and arrows for flows.

---

Slide 4 — Additional Explanation of Framework

- Security & Design decisions:
  - Frontend-first SPA communicates directly with Supabase using `@supabase/supabase-js`.
  - RLS (Row-Level Security) recommended for authoritative access control.
  - QR generation: client-side immediate feedback, with background backfill when generation fails.

- UX considerations:
  - Status-aware event listing (ongoing, today, tomorrow, upcoming, completed).
  - Student saved-contact flow (metadata or localStorage) to simplify repeated registrations.
  - Admin restrictions: prevent edits/deletes while event is ongoing.

---

Slide 5 — Methodology (Implementation)

- Frontend:
  - React + TypeScript, Vite, Tailwind CSS, shadcn UI components + Radix primitives
  - Key components: `EventCard`, `StudentRegistration`, `EventDialog`, `Header`, `Footer`.

- Backend-as-a-Service:
  - Supabase for Auth and Postgres storage; generated types used in `src/integrations/supabase/types.ts`.

- Deployment:
  - Multi-stage Dockerfile builds SPA, serves with Nginx; `docker-compose.yml` for orchestration.

- Scripts & tooling:
  - `scripts/backfillTickets.js` for maintenance/backfill tasks
  - `@tanstack/react-query` for data fetching patterns

---

Slide 6 — Result Overview

- Functional highlights:
  - Responsive event discovery and status filters (All, Ongoing, Today, Tomorrow, Upcoming, Completed).
  - Student registration flow with upsert to `students` table and ticket generation (QR stored in `registrations`).
  - Admin dashboard for CRUD and event lifecycle management.
  - Dockerized production build with Nginx static hosting.

- Measurable outcomes / demo pointers:
  - Show: event listing → register flow → QR ticket produced → admin view of registration
  - Notes: QR backfill retry mechanism and registration notification via custom events in the app.

---

Slide 7 — References

- Project repository: README and source code (Eventro)
- Key libraries & services:
  - Supabase (Auth + Postgres)
  - React, TypeScript, Vite
  - Tailwind CSS, shadcn UI, Radix
  - `qrcode` library for QR generation
- Developer notes: see `scripts/backfillTickets.js`, `docker/Dockerfile`, and `docker/nginx.conf` for deployment details.

---

Notes on next steps

- I can generate a `.pptx` file from these slides and save it into the repo if you want — proceed to create `Eventro_presentation.pptx`? 
- Or I can expand slides with speaker notes and visuals (recommended diagrams: data model ER box and user flow).