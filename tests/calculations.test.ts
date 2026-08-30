import { describe, it, expect } from "vitest";
import {
  calculateBudgetPercentage,
  calculateRemainingBudget,
  calculateDailySafeSpend,
  calculateSpendingVelocity,
  toVelocityStatus,
  calculateProjectedSpending,
  calculateProjectedOverrun,
  calculateBudgetStatus,
  calculateCategoryPercentage,
  calculateCategoryStatus,
  calculateAverageDailySpending,
  elapsedDaysInMonth,
  totalDaysInMonth,
  daysRemainingInMonth,
  calculateMonthComparison,
  countNoSpendDays,
  shouldWarnCoolDown,
} from "@/utils/calculations";

describe("calculateBudgetPercentage", () => {
  it("returns 0 when budget is 0", () => {
    expect(calculateBudgetPercentage(100, 0)).toBe(0);
  });

  it("returns 50 for half the budget", () => {
    expect(calculateBudgetPercentage(2500, 5000)).toBe(50);
  });

  it("clamps negative inputs to 0", () => {
    expect(calculateBudgetPercentage(-100, 1000)).toBe(0);
    expect(calculateBudgetPercentage(100, -1000)).toBe(0);
  });

  it("treats non-finite values as 0", () => {
    expect(calculateBudgetPercentage(NaN, 1000)).toBe(0);
  });
});

describe("calculateRemainingBudget", () => {
  it("is negative when overspent", () => {
    expect(calculateRemainingBudget(600, 500)).toBe(-100);
  });

  it("returns budget when nothing spent", () => {
    expect(calculateRemainingBudget(0, 1000)).toBe(1000);
  });
});

describe("calculateDailySafeSpend", () => {
  it("returns 0 when remaining is 0 or negative", () => {
    expect(calculateDailySafeSpend(1000, 1000, 5)).toBe(0);
    expect(calculateDailySafeSpend(1200, 1000, 5)).toBe(0);
  });

  it("returns 0 when remaining days is 0", () => {
    expect(calculateDailySafeSpend(0, 1000, 0)).toBe(0);
  });

  it("splits remaining budget across remaining days", () => {
    expect(calculateDailySafeSpend(400, 1000, 3)).toBe(200);
  });
});

describe("calculateSpendingVelocity", () => {
  it("returns null when budget is 0", () => {
    expect(calculateSpendingVelocity(0, 0, 5, 30)).toBeNull();
  });

  it("returns null when no elapsed days", () => {
    expect(calculateSpendingVelocity(0, 1000, 0, 30)).toBeNull();
  });

  it("computes positive (faster) velocity", () => {
    // 1000 budget / 10 days * 5 elapsed = 500 expected; spent 600 -> +20%
    expect(calculateSpendingVelocity(600, 1000, 5, 10)).toBe(20);
  });

  it("computes negative (slower) velocity", () => {
    expect(calculateSpendingVelocity(400, 1000, 5, 10)).toBe(-20);
  });
});

describe("toVelocityStatus", () => {
  it("maps thresholds correctly", () => {
    expect(toVelocityStatus(null)).toBe("HEALTHY");
    expect(toVelocityStatus(-10)).toBe("HEALTHY");
    expect(toVelocityStatus(10)).toBe("HEALTHY");
    expect(toVelocityStatus(35)).toBe("MODERATE");
    expect(toVelocityStatus(70)).toBe("FAST");
    expect(toVelocityStatus(150)).toBe("VERY_FAST");
  });
});

describe("calculateProjectedSpending", () => {
  it("returns current spending when no elapsed days", () => {
    expect(calculateProjectedSpending(500, 0, 30)).toBe(500);
  });

  it("projects linearly", () => {
    expect(calculateProjectedSpending(500, 5, 30)).toBe(3000);
  });
});

describe("calculateProjectedOverrun", () => {
  it("is positive over budget", () => {
    expect(calculateProjectedOverrun(12000, 10000)).toBe(2000);
  });

  it("is negative under budget", () => {
    expect(calculateProjectedOverrun(8000, 10000)).toBe(-2000);
  });
});

describe("calculateBudgetStatus", () => {
  it("returns HEALTHY when budget is 0", () => {
    expect(calculateBudgetStatus(50, 0)).toBe("HEALTHY");
  });

  it("returns EXCEEDED when spent over budget", () => {
    expect(calculateBudgetStatus(1010, 1000)).toBe("EXCEEDED");
  });

  it("returns CRITICAL/WARNING/WATCH/HEALTHY by ratio", () => {
    expect(calculateBudgetStatus(950, 1000)).toBe("CRITICAL");
    expect(calculateBudgetStatus(850, 1000)).toBe("WARNING");
    expect(calculateBudgetStatus(750, 1000)).toBe("WATCH");
    expect(calculateBudgetStatus(100, 1000)).toBe("HEALTHY");
  });
});

describe("calculateCategoryPercentage / calculateCategoryStatus", () => {
  it("reuses budget logic", () => {
    expect(calculateCategoryPercentage(50, 200)).toBe(25);
    expect(calculateCategoryStatus(300, 200)).toBe("EXCEEDED");
  });
});

describe("calculateAverageDailySpending", () => {
  it("returns 0 when no days", () => {
    expect(calculateAverageDailySpending(100, 0)).toBe(0);
  });

  it("averages spending", () => {
    expect(calculateAverageDailySpending(300, 10)).toBe(30);
  });
});

describe("date helpers", () => {
  it("computes elapsed / total / remaining days", () => {
    const d = new Date(2026, 7, 15); // Aug 15
    expect(elapsedDaysInMonth(d)).toBe(15);
    expect(totalDaysInMonth(d)).toBe(31);
    expect(daysRemainingInMonth(d)).toBe(17);
  });
});

describe("calculateMonthComparison", () => {
  it("returns null when previous is 0", () => {
    expect(calculateMonthComparison(100, 0)).toBeNull();
  });

  it("computes positive change", () => {
    expect(calculateMonthComparison(1200, 1000)).toBe(20);
  });
});

describe("countNoSpendDays", () => {
  it("counts zero and negative spend days", () => {
    const daily = { "2026-08-01": 0, "2026-08-02": 100, "2026-08-03": 0 };
    expect(countNoSpendDays(daily)).toBe(2);
  });
});

describe("shouldWarnCoolDown", () => {
  it("warns when nothing remains", () => {
    expect(shouldWarnCoolDown(50, 0)).toBe(true);
    expect(shouldWarnCoolDown(50, -10)).toBe(true);
  });

  it("does not warn for non-positive expense", () => {
    expect(shouldWarnCoolDown(0, 1000)).toBe(false);
  });

  it("warns when expense exceeds threshold of remaining", () => {
    expect(shouldWarnCoolDown(200, 1000, 0.1)).toBe(true); // 20% > 10%
    expect(shouldWarnCoolDown(50, 1000, 0.1)).toBe(false); // 5% <= 10%
  });
});
