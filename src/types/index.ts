import type { TransactionType, PaymentMethod, NotificationType } from "@/lib/constants";

export interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  icon: string;
  color: string;
  budget: number | null;
  isDefault: boolean;
  createdAt: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  categoryId: string;
  type: TransactionType;
  amount: number;
  description: string | null;
  note: string | null;
  paymentMethod: PaymentMethod;
  date: Date;
  createdAt: Date;
  category?: Category;
}

export interface Budget {
  id: string;
  userId: string;
  name: string;
  amount: number;
  periodType: "MONTHLY" | "WEEKLY" | "CUSTOM";
  rolloverEnabled: boolean;
}

export interface BudgetPeriod {
  id: string;
  budgetId: string;
  userId: string;
  startDate: Date;
  endDate: Date;
  amount: number;
  rollover: number;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

export interface UserSettings {
  id: string;
  userId: string;
  currency: string;
  theme: "light" | "dark" | "system";
  coolDownThreshold: number;
  impulseThreshold: number;
  maxTransactionAmount: number;
  warningThresholds: Record<string, number>;
  dashboardCards: string[];
}

// Derived / summary types used across the dashboard ---------------------------------

export interface BudgetSummary {
  spent: number;
  income: number;
  budget: number;
  remaining: number;
  percentage: number;
  status: "HEALTHY" | "WATCH" | "WARNING" | "CRITICAL" | "EXCEEDED";
  daysRemaining: number;
  dailySafeSpend: number;
  velocityPct: number | null;
  velocityStatus: "HEALTHY" | "MODERATE" | "FAST" | "VERY_FAST";
  projected: number;
  projectedOverrun: number;
}

export interface CategoryTotals {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  budget: number | null;
  spent: number;
  remaining: number;
  percentage: number;
  status: "HEALTHY" | "WATCH" | "WARNING" | "CRITICAL" | "EXCEEDED";
}

export interface DailySpendingPoint {
  date: string; // yyyy-MM-dd
  label: string; // short label, e.g. "Aug 5"
  amount: number;
  target?: number;
}

export interface HeatmapDay {
  date: string;
  amount: number;
  intensity: 0 | 1 | 2 | 3;
}
