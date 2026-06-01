# Booksales

Sales and inventory tracker for independent authors. Manage books, print runs, merchandising, consignment agreements, and multi-channel revenue from a single dashboard.

## Features

- **Dashboard** — monthly revenue, year-to-date totals, pending collections, 12-month sales chart, and auto-generated task list
- **Books** — per-book detail with sales history, inventory tracking, print run cost recovery, and channel breakdown
- **Print runs** — track each print batch independently (cost per unit, breakeven progress, unit-level desglose by channel)
- **Inventory** — movement log for physical copies (print runs, bookstore consignment, direct sales, influencer exchanges, write-offs, bundle assembly)
- **Exchanges / canjes** — influencer and collaborator tracking with deadline reminders and fulfillment status
- **Merchandising** — simple products and bundles, production batches, inventory, and per-product sales
- **Finanzas** — income, expenses (10 categories, 3 assignment levels), outstanding collections, and per-book P&L
- **Reportes** — sales by channel/book, inventory state, consignment status, expense breakdown, print run profitability, income projections (3 scenarios), and goal tracking
- **Multi-channel** — digital platforms (KDP, Buscalibre, etc.), physical bookstores (consignment %), and direct sales (fairs, Instagram, pre-sales)
- **Multi-user** — owner, editor, and viewer roles with email invites
- **Quick-sale FAB** — floating "+" button on every screen; records a sale in under 30 seconds

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, React 19) |
| Auth | Supabase Auth + `@supabase/ssr` |
| Database | PostgreSQL via Supabase |
| ORM | Prisma 7 with `@prisma/adapter-pg` (pgBouncer-compatible) |
| UI | Tailwind CSS v4, Radix UI, Recharts, Lucide, Sonner |
| Testing | Vitest + `@vitest/coverage-v8` |

## Project Structure

```
src/
├── actions/          # Next.js Server Actions (one file per domain)
├── app/
│   ├── (app)/        # Authenticated routes: dashboard, libros, finanzas, reportes, configuracion
│   ├── (auth)/       # Login
│   └── (onboarding)/ # First-run wizard
├── components/       # UI components organized by feature
├── lib/
│   ├── finance.ts    # Pure business-logic functions (no I/O)
│   ├── format.ts     # Currency, date, and number formatters
│   ├── prisma.ts     # Prisma client singleton
│   └── supabase/     # Supabase browser and server clients
└── __tests__/        # Unit tests (Vitest)
```

## Local Development

### Prerequisites

- Node.js 20+
- A Supabase project (free tier is sufficient)

### 1. Clone and install

```bash
git clone <repo-url>
cd booksales
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local` with values from your Supabase project:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project Settings → API → `anon/public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → `service_role` key |
| `DATABASE_URL` | Project Settings → Database → Connection string (Transaction mode, port 6543) |
| `DIRECT_URL` | Project Settings → Database → Connection string (Session mode, port 5432) |

`DATABASE_URL` uses pgBouncer (port 6543) for runtime queries. `DIRECT_URL` is only needed for running migrations.

### 3. Run database migrations

```bash
npx prisma migrate deploy
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The first login will trigger the onboarding wizard.

## Testing

```bash
npm test                  # run all tests once
npm run test:watch        # watch mode
npm run test:coverage     # with coverage report
```

Tests live in `src/__tests__/`. Coverage is scoped to `src/lib/` and `src/actions/`. All pure business logic in `lib/finance.ts` is unit-tested; server actions are tested via extracted validation rules (no DB mocking needed).

## Deployment (Vercel)

### One-time setup

```bash
npm i -g vercel     # if not already installed
vercel link         # connect this directory to a Vercel project
```

### Set environment variables

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add DATABASE_URL
vercel env add DIRECT_URL
```

When prompted, select **Preview** for a staging/dev environment or **Production** for the live environment. Use different Supabase projects for each.

Add your Vercel URL to **Supabase → Authentication → URL Configuration → Allowed redirect URLs**:
```
https://<your-project>.vercel.app/**
https://<your-project>-*.vercel.app/**
```

### Deploy

```bash
vercel          # deploys to preview
vercel --prod   # deploys to production
```

Every push to `main` auto-deploys to production. Every push to any other branch creates a preview URL.

### Migrations on deploy

To run migrations automatically as part of each build, update `package.json`:

```json
"build": "prisma migrate deploy && next build"
```

This requires `DIRECT_URL` to be set in the Vercel environment.

## Environment Variables Reference

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database (Supabase connection strings)
DATABASE_URL=postgresql://postgres.your-project:password@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.your-project:password@aws-0-region.pooler.supabase.com:5432/postgres
```
