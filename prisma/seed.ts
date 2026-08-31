// Seed script for SpendGuard.
// Creates a demo user with default categories, a monthly budget, user settings,
// a handful of sample transactions and notifications.
//
// Run with: `npx prisma db seed` (wired via prisma.config.ts -> "tsx prisma/seed.ts")

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set. Check your .env file.");
}
const cleanUrl = url.replace(/[?&]sslmode=[^&]*/g, "").replace(/[?&]$/, "");
const isLocal = /localhost|127\.0\.0\.1|::1/.test(new URL(url).hostname);
const adapter = new PrismaPg({
  connectionString: cleanUrl,
  ssl: isLocal ? undefined : { rejectUnauthorized: false },
});
const db = new PrismaClient({ adapter });

const DEMO_EMAIL = "demo@spendguard.app";
const DEMO_PASSWORD = "demo1234";

const DEFAULT_CATEGORIES: { name: string; icon: string; color: string; budget: number }[] = [
  { name: "Food", icon: "utensils", color: "#f59e0b", budget: 4000 },
  { name: "Groceries", icon: "shopping-cart", color: "#65a30d", budget: 3000 },
  { name: "Transport", icon: "car", color: "#2563eb", budget: 2000 },
  { name: "Shopping", icon: "shopping-bag", color: "#ec4899", budget: 2000 },
  { name: "Entertainment", icon: "clapperboard", color: "#8b5cf6", budget: 1500 },
  { name: "Education", icon: "graduation-cap", color: "#06b6d4", budget: 500 },
  { name: "Bills", icon: "receipt-text", color: "#dc2626", budget: 3000 },
  { name: "Subscriptions", icon: "repeat", color: "#6366f1", budget: 500 },
  { name: "Health", icon: "heart-pulse", color: "#e11d48", budget: 1000 },
  { name: "Travel", icon: "plane", color: "#0284c7", budget: 2000 },
  { name: "UPI", icon: "smartphone", color: "#0ea5e9", budget: 1000 },
  { name: "Cash", icon: "banknote", color: "#16a34a", budget: 1000 },
  { name: "Other", icon: "tags", color: "#64748b", budget: 2000 },
];

const DEFAULT_WARNING_THRESHOLDS = {
  budget50: 50,
  budget70: 70,
  budget80: 80,
  budget90: 90,
  budget100: 100,
  category80: 80,
  category90: 90,
  category100: 100,
};

const DEFAULT_DASHBOARD_CARDS = ["budget", "forecast", "spending", "categories", "recent"];

async function date(day: number, today: Date): Promise<Date> {
  const d = new Date(today);
  d.setHours(12, 0, 0, 0);
  d.setDate(day);
  return d;
}

async function main() {
  const today = new Date();

  console.log(`Seeding demo user: ${DEMO_EMAIL}`);

  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 12);

  const user = await db.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      email: DEMO_EMAIL,
      name: "Demo User",
      hashedPassword,
      role: "user",
    },
  });

  // Categories (idempotent per user via unique [userId, name])
  const catIds: Record<string, string> = {};
  for (const c of DEFAULT_CATEGORIES) {
    const category = await db.category.upsert({
      where: { userId_name: { userId: user.id, name: c.name } },
      update: { icon: c.icon, color: c.color, budget: c.budget, isDefault: true },
      create: {
        userId: user.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        budget: c.budget,
        isDefault: true,
      },
    });
    catIds[c.name] = category.id;
  }

  // User settings
  await db.userSettings.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id,
      currency: "INR",
      theme: "system",
      warningThresholds: DEFAULT_WARNING_THRESHOLDS,
      dashboardCards: DEFAULT_DASHBOARD_CARDS,
      spendingLockEnabled: false,
    },
  });

  // Monthly budget of ₹10,000 with the current period
  const year = today.getFullYear();
  const month = today.getMonth();
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);

  let budget = await db.budget.findFirst({ where: { userId: user.id } });
  if (!budget) {
    budget = await db.budget.create({
      data: {
        userId: user.id,
        name: "Monthly Budget",
        amount: 10000,
        periodType: "MONTHLY",
        rolloverEnabled: false,
      },
    });
  }

  await db.budgetPeriod.upsert({
    where: { budgetId_startDate: { budgetId: budget.id, startDate } },
    update: { amount: 10000, endDate, rollover: 0 },
    create: {
      budgetId: budget.id,
      userId: user.id,
      startDate,
      endDate,
      amount: 10000,
      rollover: 0,
    },
  });

  // Sample expenses for the current month
  const now = today.getDate();
  const sampleExpenses: { name: string; amount: number; day: number }[] = [
    { name: "Food", amount: 480, day: Math.min(2, now) },
    { name: "Transport", amount: 220, day: Math.min(3, now) },
    { name: "Bills", amount: 1200, day: Math.min(4, now) },
    { name: "Groceries", amount: 850, day: Math.min(6, now) },
    { name: "Food", amount: 320, day: Math.min(8, now) },
    { name: "Subscriptions", amount: 199, day: Math.min(10, now) },
    { name: "Entertainment", amount: 600, day: Math.min(12, now) },
    { name: "Shopping", amount: 1400, day: Math.min(15, now) },
    { name: "Health", amount: 350, day: Math.min(18, now) },
  ];

  for (const e of sampleExpenses) {
    const existing = await db.transaction.findFirst({
      where: {
        userId: user.id,
        categoryId: catIds[e.name],
        description: `Seed: ${e.name}`,
      },
    });
    if (existing) continue;
    await db.transaction.create({
      data: {
        userId: user.id,
        categoryId: catIds[e.name],
        type: "EXPENSE",
        amount: e.amount,
        description: `Seed: ${e.name}`,
        paymentMethod: "UPI",
        date: await date(e.day, today),
      },
    });
  }

  // A single income entry (Salary)
  const salaryCat = catIds["Other"];
  const incomeExists = await db.transaction.findFirst({
    where: { userId: user.id, description: "Seed: Monthly Salary" },
  });
  if (!incomeExists) {
    await db.transaction.create({
      data: {
        userId: user.id,
        categoryId: salaryCat,
        type: "INCOME",
        amount: 25000,
        description: "Seed: Monthly Salary",
        paymentMethod: "BANK_TRANSFER",
        date: new Date(year, month, 1, 9, 0, 0),
      },
    });
  }

  // A sample notification
  const notifExists = await db.notification.findFirst({
    where: { userId: user.id, type: "SYSTEM", title: "Welcome to SpendGuard" },
  });
  if (!notifExists) {
    await db.notification.create({
      data: {
        userId: user.id,
        type: "SYSTEM",
        title: "Welcome to SpendGuard",
        message:
          "Your demo account is ready. Add transactions, set a budget, and try the Insights and Reports pages.",
      },
    });
  }

  console.log(
    `Seed complete.\n  Email:    ${DEMO_EMAIL}\n  Password: ${DEMO_PASSWORD}\n  Monthly budget: ₹10,000`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
