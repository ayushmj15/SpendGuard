# SpendGuard 💱

A personal finance tracker built with **Next.js (App Router)**, **React 19**, **Prisma 7** + **PostgreSQL (Supabase)**, and **Auth.js (next-auth v5)**. Track income and expenses, set budgets, get smart insights, generate reports, and import transactions from CSV.

## Features

### Core tracking
- Add income/expense transactions with categories, payment methods, and notes
- Category-wise and overall **monthly budgets** with rollover support
- **Dashboard** with budget, forecast, spending, category breakdown, and recent transactions

### Smart safeguards
- **Notifications** for budget warnings, category overspend, large expenses, and forecast warnings
- Configurable **warning thresholds** (50/70/80/90% of budget)
- **Cool-down / impulse checks** that make you confirm large or risky expenses
- **Spending Lock** — a hard cap that blocks new expenses once your remaining budget is exceeded

### Insights & reports
- **Insights** page: category trends, spending patterns, and budget health
- **Reports** page: filter by date range, export as **CSV** or **JSON**
- **CSV import** with duplicate detection

### General
- Profile, currency, theme (light/dark/system)
- Dashboard card visibility toggle
- `prisma/seed.ts` with a ready-to-use demo account

## Tech stack

- **Next.js 16** (App Router, Server Actions)
- **React 19**, **TypeScript**
- **Prisma 7** with `@prisma/adapter-pg` (PostgreSQL / Supabase)
- **Auth.js (next-auth v5)** — email/password (bcrypt) with credentials, OAuth-ready
- **recharts** for charts, **papaparse** for CSV parsing, **zustand**, **sonner**

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create a `.env` file at the project root:

```env
DATABASE_URL="postgresql://USER:PASSWORD@host:5432/postgres"

# Required by next-auth — generate with: npx auth secret
AUTH_SECRET="your-random-secret"
```

Set `DATABASE_URL` to a PostgreSQL database (e.g. a Supabase project's **Direct connection** string), then apply the schema:

```bash
npx prisma migrate deploy
```

### 3. (Optional) Seed demo data

Creates a demo user with default categories, a ₹10,000 monthly budget, sample transactions, and notifications:

```bash
npx prisma db seed
```

|                   | Value                    |
| ----------------- | ------------------------ |
| Email             | `demo@spendguard.app`    |
| Password          | `demo1234`               |

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up or log in with the demo account above.

## Scripts

| Command            | Description                      |
| ------------------ | -------------------------------- |
| `npm run dev`      | Start the dev server             |
| `npm run build`    | Production build                 |
| `npm start`        | Run the production build         |
| `npm run lint`     | ESLint                           |
| `npm run typecheck`| TypeScript (`tsc --noEmit`)      |
| `npm test`         | Run the Vitest test suite        |
| `npx prisma db seed`| Seed the database with demo data |

> Note: this project uses a **Prisma driver adapter** (`@prisma/adapter-pg`). New scripts that touch the database must construct `PrismaClient` with the adapter (see `src/lib/db.ts` and `prisma/seed.ts`).

## Testing

Tests run with **Vitest**. Pure logic (calculations, currency, date, validation schemas) is covered by unit tests, while service logic (reports, notifications) and API route serialization are tested with mocked `db`/`auth` modules.

```bash
npm test
```

The suite lives in `tests/`. DB-backed services are tested by mocking `@/lib/db`, so the unit tests don't require a running database.

## Project structure

```
src/
  actions/        # Server actions (transactions, auth, settings, budgets, lock, import)
  app/            # Next.js App Router pages (dashboard, insights, reports, settings)
  components/     # UI components (dialogs, cards, charts, settings, spend-lock)
  lib/            # db client, constants, utilities, input validation
  services/       # Business logic (insights, reports, notifications)
  store/          # zustand UI store
  types/          # Shared TypeScript types
prisma/
  schema.prisma   # Database schema
  seed.ts         # Demo data seeder
```
