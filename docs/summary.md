# EventHub — Short Project Summary

## Problem statement
Colleges use fragmented channels (emails, posters, spreadsheets) for events. EventHub centralizes event discovery, registration, and QR ticketing into a single self-hostable web app.

## Key modules
- Home: Landing (hero section with headline and primary CTAs), upcoming events.
- Events: Listing, filters, event details, registration entry.
- StudentRegistration: Student details form and local saved info.
- EventCard: Event tile with Register/Cancel actions.
- AdminDashboard: Event CRUD and management.
- Auth: Signup / Login (Supabase). 
- Integrations: Supabase (Auth + Postgres), Docker for deployment.

## How to run (dev)
1. Install Node.js (includes `npm`).
2. Clone repo and install deps:

```cmd
git clone <YOUR_GIT_URL>
cd EventHub-main
npm install
npm run dev
```

Open `http://localhost:5173`.

## Convert to PDF (quick)
If you want a PDF of this summary, run locally (recommended):

- Using pandoc (install pandoc first):

```cmd
# from repo root (Windows cmd.exe)
cd d:\EventHub-main\EventHub-main
pandoc docs/summary.md -o docs/summary.pdf
```

- Or open `docs/summary.md` in your editor or browser and "Print to PDF".

---

This is intentionally short — let me know if you want speaker notes or a 1-slide PPTX export instead.
