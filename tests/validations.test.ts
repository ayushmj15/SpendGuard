import { describe, it, expect } from "vitest";
import { loginSchema, signupSchema } from "@/lib/validations/auth";
import {
  transactionSchema,
  transactionFormSchema,
  budgetSchema,
  categoryBudgetSchema,
} from "@/lib/validations/transaction";

describe("loginSchema", () => {
  it("accepts a valid login", () => {
    const r = loginSchema.safeParse({ email: "a@b.com", password: "123456" });
    expect(r.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const r = loginSchema.safeParse({ email: "not-an-email", password: "123456" });
    expect(r.success).toBe(false);
  });

  it("rejects short password", () => {
    const r = loginSchema.safeParse({ email: "a@b.com", password: "123" });
    expect(r.success).toBe(false);
  });
});

describe("signupSchema", () => {
  it("accepts valid signup", () => {
    const r = signupSchema.safeParse({
      name: "Demo User",
      email: "a@b.com",
      password: "123456",
      confirmPassword: "123456",
    });
    expect(r.success).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    const r = signupSchema.safeParse({
      name: "Demo User",
      email: "a@b.com",
      password: "123456",
      confirmPassword: "654321",
    });
    expect(r.success).toBe(false);
  });

  it("rejects a too-short name", () => {
    const r = signupSchema.safeParse({
      name: "A",
      email: "a@b.com",
      password: "123456",
      confirmPassword: "123456",
    });
    expect(r.success).toBe(false);
  });
});

describe("transactionSchema", () => {
  const base = {
    type: "EXPENSE",
    amount: 100,
    categoryId: "cat-1",
    date: "2026-08-05",
    paymentMethod: "UPI",
  };

  it("accepts a valid transaction", () => {
    const r = transactionSchema.safeParse(base);
    expect(r.success).toBe(true);
  });

  it("accepts common payment methods", () => {
    for (const method of ["DEBIT_CARD", "CREDIT_CARD", "CASH", "BANK_TRANSFER", "OTHER"]) {
      expect(transactionSchema.safeParse({ ...base, paymentMethod: method }).success).toBe(true);
    }
  });

  it("rejects a non-positive amount", () => {
    const r = transactionSchema.safeParse({ ...base, amount: 0 });
    expect(r.success).toBe(false);
  });

  it("rejects an unknown type", () => {
    const r = transactionSchema.safeParse({ ...base, type: "TRANSFER" });
    expect(r.success).toBe(false);
  });

  it("rejects an invalid payment method", () => {
    const r = transactionSchema.safeParse({ ...base, paymentMethod: "CASHAPP" });
    expect(r.success).toBe(false);
  });
});

describe("transactionFormSchema", () => {
  it("accepts a string amount", () => {
    const r = transactionFormSchema.safeParse({
      type: "EXPENSE",
      amount: "100.50",
      categoryId: "cat-1",
      date: "2026-08-05",
      paymentMethod: "UPI",
    });
    expect(r.success).toBe(true);
  });

  it("rejects an invalid amount string", () => {
    const r = transactionFormSchema.safeParse({
      type: "EXPENSE",
      amount: "abc",
      categoryId: "cat-1",
      date: "2026-08-05",
      paymentMethod: "UPI",
    });
    expect(r.success).toBe(false);
  });
});

describe("budgetSchema", () => {
  it("accepts defaults", () => {
    const r = budgetSchema.safeParse({ amount: 10000 });
    expect(r.success).toBe(true);
    expect(r.data?.periodType).toBe("MONTHLY");
    expect(r.data?.rolloverEnabled).toBe(false);
    expect(r.data?.name).toBe("Monthly Budget");
  });

  it("rejects a non-positive budget", () => {
    const r = budgetSchema.safeParse({ amount: 0 });
    expect(r.success).toBe(false);
  });
});

describe("categoryBudgetSchema", () => {
  it("accepts a nullable/optional budget", () => {
    expect(categoryBudgetSchema.safeParse({ categoryId: "cat-1", budget: 100 }).success).toBe(true);
    expect(categoryBudgetSchema.safeParse({ categoryId: "cat-1", budget: null }).success).toBe(true);
    expect(categoryBudgetSchema.safeParse({ categoryId: "cat-1" }).success).toBe(true);
  });

  it("rejects a negative budget", () => {
    const r = categoryBudgetSchema.safeParse({ categoryId: "cat-1", budget: -5 });
    expect(r.success).toBe(false);
  });
});
