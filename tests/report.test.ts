import { describe, it, expect, vi, beforeEach } from "vitest";

const currentTxns = [
  {
    id: "t1",
    type: "EXPENSE",
    amount: 600,
    categoryId: "c-food",
    date: new Date("2026-08-05T12:00:00Z"),
    category: { name: "Food", icon: "utensils", color: "#f59e0b" },
  },
  {
    id: "t2",
    type: "INCOME",
    amount: 25000,
    categoryId: "c-other",
    date: new Date("2026-08-01T12:00:00Z"),
    category: { name: "Other", icon: "tags", color: "#64748b" },
  },
];

const prevTxns = [
  {
    id: "t3",
    type: "EXPENSE",
    amount: 400,
    categoryId: "c-food",
    date: new Date("2026-07-05T12:00:00Z"),
    category: { name: "Food", icon: "utensils", color: "#f59e0b" },
  },
];

vi.mock("@/lib/db", () => ({
  db: {
    transaction: {
      findMany: vi.fn(),
    },
  },
}));

import { getReport, normalizeDateInput } from "@/services/report";
import { db } from "@/lib/db";

const findMany = db.transaction.findMany as unknown as ReturnType<typeof vi.fn>;

describe("normalizeDateInput", () => {
  it("defaults from to the 1st of the current month and to today", () => {
    const now = new Date();
    const { fromDate, toDate } = normalizeDateInput();
    expect(fromDate.getFullYear()).toBe(now.getFullYear());
    expect(fromDate.getMonth()).toBe(now.getMonth());
    expect(fromDate.getDate()).toBe(1);
    expect(toDate.getDate()).toBe(now.getDate());
  });

  it("parses explicit from/to dates", () => {
    const { fromDate, toDate } = normalizeDateInput("2026-08-01", "2026-08-31");
    expect(fromDate.getFullYear()).toBe(2026);
    expect(fromDate.getMonth()).toBe(7); // August
    expect(fromDate.getDate()).toBe(1);
    expect(toDate.getDate()).toBe(31);
  });
});

describe("getReport", () => {
  beforeEach(() => {
    findMany.mockReset();
    findMany.mockImplementation(({ where }: { where: { date: { gte: Date; lte: Date } } }) => {
      // current range ends in August (month 7), previous range ends in July (month 6)
      return where.date.lte.getMonth() === 7 ? currentTxns : prevTxns;
    });
  });

  it("aggregates expense/income, category rows and day rows", async () => {
    const report = await getReport("user-1", "2026-08-01", "2026-08-31");

    expect(report.totalCount).toBe(2);
    expect(report.totalExpense).toBe(600);
    expect(report.totalIncome).toBe(25000);
    expect(report.net).toBe(24400);

    // Category rows sorted by amount (income category first since 25000 > 600)
    expect(report.categories).toHaveLength(2);
    expect(report.categories[0].name).toBe("Other");
    expect(report.categories[1].name).toBe("Food");
    expect(report.categories[1].count).toBe(1);

    // Day rows present with labels
    expect(report.days).toHaveLength(2);
    expect(report.days[0].label).toMatch(/^[A-Z][a-z]{2} \d+$/);

    // previous period comparison
    expect(report.previousTotalExpense).toBe(400);
    expect(report.changePct).toBe(50); // (600 - 400) / 400 * 100
  });

  it("computes share percentage based on total expense", async () => {
    const report = await getReport("user-1", "2026-08-01", "2026-08-31");
    const food = report.categories.find((c) => c.name === "Food");
    expect(food?.sharePct).toBe(100); // 600 of 600 expense
  });
});
