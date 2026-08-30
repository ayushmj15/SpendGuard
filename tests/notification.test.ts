import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => {
  const created: { type: string; title: string; message: string }[] = [];
  const findFirst = vi.fn();
  const findMany = vi.fn();
  const create = vi.fn();
  const del = vi.fn();
  return { created, findFirst, findMany, create, del };
});

vi.mock("@/lib/db", () => ({
  db: {
    notification: {
      findFirst: mocks.findFirst,
      findMany: mocks.findMany,
      create: mocks.create,
      delete: mocks.del,
    },
  },
  __esModule: true,
}));

import {
  generateBudgetAlerts,
  generateCategoryAlert,
  reconcileBudgetNotifications,
  createLargeExpenseAlert,
  generateForecastWarning,
} from "@/services/notification";
const { created, findFirst, findMany, create, del } = mocks;

beforeEach(() => {
  created.length = 0;
  create.mockReset().mockImplementation((args: { data: { type: string; title: string; message: string } }) => {
    created.push(args.data);
    return Promise.resolve(args.data);
  });
  del.mockReset().mockResolvedValue(undefined);
  findMany.mockReset().mockResolvedValue([]);
  findFirst.mockReset().mockResolvedValue(null);
});

const thresholds = { budget50: 50, budget70: 70, budget80: 80, budget90: 90, budget100: 100 };

describe("generateBudgetAlerts", () => {
  it("does nothing when budget is 0", async () => {
    await generateBudgetAlerts("u1", { spent: 100, budget: 0, thresholds, overshoot: 0 });
    expect(create).not.toHaveBeenCalled();
  });

  it("emits the most severe passed milestone", async () => {
    await generateBudgetAlerts("u1", {
      spent: 950,
      budget: 1000,
      thresholds,
      overshoot: 0,
    });
    // 95% -> only budget90 passes; budget100 (100) is not reached
    expect(create).toHaveBeenCalledTimes(1);
    const call = create.mock.calls[0][0].data;
    expect(call.type).toBe("BUDGET_WARNING");
    expect(call.title).toBe("Almost at your limit");
  });

  it("emits BUDGET_EXCEEDED when at/over 100%", async () => {
    await generateBudgetAlerts("u1", {
      spent: 1100,
      budget: 1000,
      thresholds,
      overshoot: 100,
    });
    const call = create.mock.calls[0][0].data;
    expect(call.type).toBe("BUDGET_EXCEEDED");
    expect(call.message).toContain("exceeded");
  });

  it("skips creation when an unread notification already exists", async () => {
    findFirst.mockResolvedValue({ id: "n1", read: false });
    await generateBudgetAlerts("u1", {
      spent: 1100,
      budget: 1000,
      thresholds,
      overshoot: 100,
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("uses configured thresholds from settings", async () => {
    const customThresholds = { ...thresholds, budget80: 10000 };
    // 82% spent: passes default 80 but not custom 10000
    await generateBudgetAlerts("u1", {
      spent: 820,
      budget: 1000,
      thresholds: customThresholds,
      overshoot: 0,
    });
    // Only budget50/70 pass (82 >= 50, 70) — most severe is budget70
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0][0].data.title).toBe("Most of your budget used");
  });
});

describe("generateCategoryAlert", () => {
  it("emits exceeded alert at 100%+", async () => {
    await generateCategoryAlert("u1", { categoryName: "Food", spent: 500, budget: 400 });
    const call = create.mock.calls[0][0].data;
    expect(call.type).toBe("CATEGORY_WARNING");
    expect(call.title).toContain("Food budget exceeded");
  });

  it("emits almost-exhausted alert at 90-99%", async () => {
    await generateCategoryAlert("u1", { categoryName: "Food", spent: 380, budget: 400 });
    const call = create.mock.calls[0][0].data;
    expect(call.type).toBe("CATEGORY_WARNING");
    expect(call.title).toContain("almost exhausted");
  });

  it("does nothing when no budget set", async () => {
    await generateCategoryAlert("u1", { categoryName: "Food", spent: 500, budget: 0 });
    expect(create).not.toHaveBeenCalled();
  });

  it("does nothing below 90%", async () => {
    await generateCategoryAlert("u1", { categoryName: "Food", spent: 300, budget: 400 });
    expect(create).not.toHaveBeenCalled();
  });
});

describe("reconcileBudgetNotifications", () => {
  it("removes a stale BUDGET_EXCEEDED when no longer over budget", async () => {
    findMany.mockResolvedValue([{ id: "n1", type: "BUDGET_EXCEEDED", read: false }]);
    await reconcileBudgetNotifications("u1", {
      spent: 500,
      budget: 1000,
      thresholds,
      overshoot: 0,
    });
    expect(del).toHaveBeenCalledWith({ where: { id: "n1" } });
  });

  it("keeps warnings and calls generateBudgetAlerts", async () => {
    await reconcileBudgetNotifications("u1", {
      spent: 200,
      budget: 1000,
      thresholds,
      overshoot: 0,
    });
    // below 50% -> generateBudgetAlerts creates nothing
    expect(create).not.toHaveBeenCalled();
  });
});

describe("createLargeExpenseAlert", () => {
  it("creates a LARGE_EXPENSE notification", async () => {
    await createLargeExpenseAlert("u1", 500, 2000);
    const call = create.mock.calls[0][0].data;
    expect(call.type).toBe("LARGE_EXPENSE");
  });
});

describe("generateForecastWarning", () => {
  it("creates overrun warning when overrun > 0", async () => {
    await generateForecastWarning("u1", 12000, 10000, 2000);
    const call = create.mock.calls[0][0].data;
    expect(call.type).toBe("FORECAST_WARNING");
    expect(call.title).toBe("End-of-month forecast");
    expect(call.message).toContain("exceed");
  });

  it("does nothing when budget is 0", async () => {
    await generateForecastWarning("u1", 5000, 0, 100);
    expect(create).not.toHaveBeenCalled();
  });
});

