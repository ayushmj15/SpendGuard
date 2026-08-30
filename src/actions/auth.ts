"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { db } from "@/lib/db";
import { signupSchema } from "@/lib/validations/auth";
import { signIn } from "@/auth";
import {
  DEFAULT_CATEGORIES,
  DEFAULT_CATEGORY_BUDGETS,
  DEFAULT_WARNING_THRESHOLDS,
  categoryIconKey,
} from "@/lib/constants";

/**
 * Seeds everything a fresh user needs: default categories (with default budgets),
 * default settings, and the initial monthly budget.
 */
async function initializeUser(userId: string) {
  // Default categories with optional category budgets
  for (const cat of DEFAULT_CATEGORIES) {
    await db.category.create({
      data: {
        userId,
        name: cat.name,
        icon: categoryIconKey(cat.name),
        color: cat.color,
        budget: DEFAULT_CATEGORY_BUDGETS[cat.name] ?? null,
        isDefault: true,
      },
    });
  }

  const now = new Date();
  const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  await db.userSettings.create({
    data: {
      userId,
      warningThresholds: DEFAULT_WARNING_THRESHOLDS,
      dashboardCards: [
        "budget",
        "forecast",
        "spending",
        "categories",
        "recent",
      ],
    },
  });

  // Default monthly budget of ₹10,000
  await db.budget.create({
    data: {
      userId,
      name: "Monthly Budget",
      amount: 10000,
      periodType: "MONTHLY",
      rolloverEnabled: false,
      budgetPeriods: {
        create: {
          userId,
          startDate: new Date(now.getFullYear(), now.getMonth(), 1),
          endDate: new Date(now.getFullYear(), now.getMonth(), totalDays, 23, 59, 59),
          amount: 10000,
        },
      },
    },
  });
}

export async function signupAction(
  prevState: { error?: string; success?: boolean } | undefined,
  formData: FormData,
) {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { name, email, password } = parsed.data;

  const existing = await db.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (existing) {
    return { error: "An account with this email already exists" };
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  try {
    const user = await db.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        hashedPassword,
      },
    });

    await initializeUser(user.id);
  } catch (err) {
    console.error("Signup failed:", err);
    return { error: "Something went wrong creating your account. Please try again." };
  }

  // Auto sign-in after account creation
  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Account created. Please sign in." };
    }
    throw error;
  }
  redirect("/dashboard");
}

export async function loginAction(
  prevState: { error?: string } | undefined,
  formData: FormData,
) {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password" };
    }
    throw error;
  }
  redirect("/dashboard");
}
