import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: vi.fn(),
    },
    category: { findMany: vi.fn() },
    transaction: { findMany: vi.fn() },
    budget: { findMany: vi.fn() },
    budgetPeriod: { findMany: vi.fn() },
    userSettings: { findUnique: vi.fn() },
  },
}));

import { GET } from "@/app/api/export/route";
import { auth } from "@/auth";
import { db } from "@/lib/db";

const dbMock = db as unknown as {
  user: { findUnique: ReturnType<typeof vi.fn> };
  category: { findMany: ReturnType<typeof vi.fn> };
  transaction: { findMany: ReturnType<typeof vi.fn> };
  budget: { findMany: ReturnType<typeof vi.fn> };
  budgetPeriod: { findMany: ReturnType<typeof vi.fn> };
  userSettings: { findUnique: ReturnType<typeof vi.fn> };
};

function mockData() {
  dbMock.user.findUnique.mockResolvedValue({ name: "Demo", email: "demo@spendguard.app", createdAt: new Date("2026-08-01") });
  dbMock.category.findMany.mockResolvedValue([{ id: "c1", name: "Food", icon: "utensils", color: "#f59e0b" }]);
  dbMock.transaction.findMany.mockResolvedValue([
    {
      id: "t1",
      date: new Date("2026-08-05"),
      type: "EXPENSE",
      amount: 250.5,
      paymentMethod: "UPI",
      description: "Lunch, \"Burger\"",
      note: null,
      category: { name: "Food" },
    },
  ]);
  dbMock.budget.findMany.mockResolvedValue([]);
  dbMock.budgetPeriod.findMany.mockResolvedValue([]);
  dbMock.userSettings.findUnique.mockResolvedValue(null);
}

describe("GET /api/export", () => {
  beforeEach(() => {
    (auth as unknown as ReturnType<typeof vi.fn>).mockReset();
    vi.clearAllMocks();
  });

  it("returns 401 when unauthenticated", async () => {
    (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/export"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns CSV by default", async () => {
    mockData();
    (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: "u1" } });

    const res = await GET(new Request("http://localhost/api/export?format=csv"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    const text = await res.text();
    expect(text).toContain("date,type,amount,category,description,paymentMethod,note");
    expect(text).toContain("2026-08-05,EXPENSE,250.5");
    expect(text).toContain('"Lunch, ""Burger"""');
  });

  it("returns JSON when format=json with only own data", async () => {
    mockData();
    (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ user: { id: "u1" } });

    const res = await GET(new Request("http://localhost/api/export?format=json"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    const payload = JSON.parse(await res.text());
    expect(payload.user.email).toBe("demo@spendguard.app");
    expect(payload.transactions).toHaveLength(1);
    expect(payload.transactions[0].category.name).toBe("Food");
  });
});
