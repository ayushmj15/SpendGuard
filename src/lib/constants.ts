import type { LucideIcon } from "lucide-react";
import {
  Utensils,
  ShoppingCart,
  Car,
  ShoppingBag,
  Clapperboard,
  GraduationCap,
  ReceiptText,
  Repeat,
  HeartPulse,
  Plane,
  Smartphone,
  Banknote,
  Tags,
  Wallet,
  Landmark,
  CreditCard,
  HandCoins,
  ArrowLeftRight,
} from "lucide-react";

export type TransactionType = "EXPENSE" | "INCOME";

export const TRANSACTION_TYPES: { value: TransactionType; label: string }[] = [
  { value: "EXPENSE", label: "Expense" },
  { value: "INCOME", label: "Income" },
];

export type PaymentMethod =
  | "UPI"
  | "DEBIT_CARD"
  | "CREDIT_CARD"
  | "CASH"
  | "BANK_TRANSFER"
  | "OTHER";

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "UPI", label: "UPI" },
  { value: "DEBIT_CARD", label: "Debit Card" },
  { value: "CREDIT_CARD", label: "Credit Card" },
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "OTHER", label: "Other" },
];

export interface CategoryMeta {
  name: string;
  icon: LucideIcon;
  color: string;
}

export const DEFAULT_CATEGORIES: CategoryMeta[] = [
  { name: "Food", icon: Utensils, color: "#f97316" },
  { name: "Groceries", icon: ShoppingCart, color: "#65a30d" },
  { name: "Transport", icon: Car, color: "#2563eb" },
  { name: "Shopping", icon: ShoppingBag, color: "#ec4899" },
  { name: "Entertainment", icon: Clapperboard, color: "#8b5cf6" },
  { name: "Education", icon: GraduationCap, color: "#06b6d4" },
  { name: "Bills", icon: ReceiptText, color: "#dc2626" },
  { name: "Subscriptions", icon: Repeat, color: "#6366f1" },
  { name: "Health", icon: HeartPulse, color: "#e11d48" },
  { name: "Travel", icon: Plane, color: "#0284c7" },
  { name: "UPI", icon: Smartphone, color: "#0ea5e9" },
  { name: "Cash", icon: Banknote, color: "#16a34a" },
  { name: "Other", icon: Tags, color: "#64748b" },
];

export const INCOME_CATEGORY_ICONS = {
  Salary: Wallet,
  Freelance: HandCoins,
  Refund: ArrowLeftRight,
  Interest: Landmark,
  Gift: ShoppingBag,
} as const;

export const DEFAULT_PAYMENT_ICONS = {
  UPI: Smartphone,
  DEBIT_CARD: CreditCard,
  CREDIT_CARD: CreditCard,
  CASH: Banknote,
  BANK_TRANSFER: Landmark,
  OTHER: ArrowLeftRight,
} as const;

export type CategoryIconName =
  | "utensils"
  | "shopping-cart"
  | "car"
  | "shopping-bag"
  | "clapperboard"
  | "graduation-cap"
  | "receipt-text"
  | "repeat"
  | "heart-pulse"
  | "plane"
  | "smartphone"
  | "banknote"
  | "tags"
  | "wallet"
  | "landmark"
  | "credit-card"
  | "hand-coins"
  | "arrow-left-right"
  | "tag";

export const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  utensils: Utensils,
  "shopping-cart": ShoppingCart,
  car: Car,
  "shopping-bag": ShoppingBag,
  clapperboard: Clapperboard,
  "graduation-cap": GraduationCap,
  "receipt-text": ReceiptText,
  repeat: Repeat,
  "heart-pulse": HeartPulse,
  plane: Plane,
  smartphone: Smartphone,
  banknote: Banknote,
  tags: Tags,
  wallet: Wallet,
  landmark: Landmark,
  "credit-card": CreditCard,
  "hand-coins": HandCoins,
  "arrow-left-right": ArrowLeftRight,
  tag: Tags,
};

export function resolveCategoryIcon(name: string): LucideIcon {
  const key = categoryIconKey(name);
  return CATEGORY_ICON_MAP[key] ?? CATEGORY_ICON_MAP["tag"];
}

/** Returns a stable kebab-case icon key for a category name. */
export function categoryIconKey(name: string): string {
  const n = name.toLowerCase().trim();
  if (n === "food") return "utensils";
  if (n === "shopping") return "shopping-bag";
  if (n === "clapperboard") return "clapperboard";
  if (n === "graduation" || n === "education") return "graduation-cap";
  if (n === "bills") return "receipt-text";
  if (n === "subscriptions") return "repeat";
  if (n === "health") return "heart-pulse";
  if (n === "travel") return "plane";
  if (n === "salary") return "wallet";
  if (n === "freelance") return "hand-coins";
  if (n === "refund") return "arrow-left-right";
  if (n === "interest") return "landmark";
  if (n === "gift") return "shopping-bag";
  if (n === "groceries") return "shopping-cart";
  if (n === "transport") return "car";
  if (n === "entertainment") return "clapperboard";
  return n.replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export type NotificationType =
  | "BUDGET_WARNING"
  | "BUDGET_EXCEEDED"
  | "CATEGORY_WARNING"
  | "LARGE_EXPENSE"
  | "FORECAST_WARNING"
  | "MONTHLY_SUMMARY"
  | "SYSTEM";

export const DEFAULT_WARNING_THRESHOLDS = {
  budget50: 50,
  budget70: 70,
  budget80: 80,
  budget90: 90,
  budget100: 100,
  category80: 80,
  category90: 90,
  category100: 100,
};

export const DEFAULT_CATEGORY_BUDGETS: Record<string, number> = {
  Food: 4000,
  Groceries: 3000,
  Transport: 2000,
  Shopping: 2000,
  Entertainment: 1500,
  Bills: 3000,
  Subscriptions: 500,
  Health: 1000,
  Travel: 2000,
  Education: 500,
  UPI: 1000,
  Cash: 1000,
  Other: 2000,
};
