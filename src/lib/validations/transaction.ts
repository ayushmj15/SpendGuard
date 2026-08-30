import { z } from "zod";
import {
  TRANSACTION_TYPES,
  PAYMENT_METHODS,
} from "@/lib/constants";

export const transactionSchema = z.object({
  type: z.enum(["EXPENSE", "INCOME"], {
    message: "Select a valid type",
  }),
  amount: z
    .number({ message: "Enter an amount" })
    .positive("Amount must be greater than 0"),
  categoryId: z.string().min(1, "Select a category"),
  date: z.coerce.date({ message: "Enter a valid date" }),
  paymentMethod: z.enum(
    PAYMENT_METHODS.map((p) => p.value) as [string, ...string[]],
    { message: "Select a payment method" },
  ),
  description: z.string().max(200).optional().default(""),
  note: z.string().max(2000).optional().default(""),
});

// For client forms where amount arrives as a string
export const transactionFormSchema = z.object({
  type: z.enum(["EXPENSE", "INCOME"]),
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount")
    .refine((v) => parseFloat(v) > 0, "Amount must be greater than 0"),
  categoryId: z.string().min(1, "Select a category"),
  date: z.string().min(1, "Select a date"),
  paymentMethod: z.enum(
    PAYMENT_METHODS.map((p) => p.value) as [string, ...string[]],
  ),
  description: z.string().max(200).default(""),
  note: z.string().max(2000).default(""),
});

export const budgetSchema = z.object({
  amount: z
    .number({ message: "Enter a budget amount" })
    .positive("Budget must be greater than 0")
    .max(100000000, "Budget too large"),
  periodType: z.enum(["MONTHLY", "WEEKLY", "CUSTOM"]).default("MONTHLY"),
  rolloverEnabled: z.boolean().default(false),
  name: z.string().max(100).optional().default("Monthly Budget"),
});

export const categoryBudgetSchema = z.object({
  categoryId: z.string().min(1),
  budget: z
    .number()
    .min(0, "Budget cannot be negative")
    .optional()
    .nullable(),
});

export type TransactionInput = z.infer<typeof transactionSchema>;
export type TransactionFormInput = z.infer<typeof transactionFormSchema>;
export type BudgetInput = z.infer<typeof budgetSchema>;
