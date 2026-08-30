"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { budgetSchema } from "@/lib/validations/transaction";

async function getUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function updateBudgetAction(
  prevState: ActionResult | undefined,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const userId = await getUserId();

    const parsed = budgetSchema.safeParse({
      amount: parseFloat(formData.get("amount") as string),
      periodType: formData.get("periodType"),
      rolloverEnabled: formData.get("rolloverEnabled") === "true" || formData.get("rolloverEnabled") === "on",
      name: formData.get("name") ?? "Monthly Budget",
    });

    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid budget" };
    }

    const today = new Date();
    const activePeriod = await db.budgetPeriod.findFirst({
      where: { userId, startDate: { lte: today }, endDate: { gte: today } },
      orderBy: { startDate: "desc" },
    });

    // Update or create the active monthly budget
    const budget = await db.budget.upsert({
      where: { id: (activePeriod?.budgetId ?? "") || undefined },
      create: {
        userId,
        name: parsed.data.name ?? "Monthly Budget",
        amount: parsed.data.amount,
        periodType: parsed.data.periodType,
        rolloverEnabled: parsed.data.rolloverEnabled,
      },
      update: {
        name: parsed.data.name,
        amount: parsed.data.amount,
        periodType: parsed.data.periodType,
        rolloverEnabled: parsed.data.rolloverEnabled,
      },
    });

    // Update the active budget period amount
    if (activePeriod) {
      await db.budgetPeriod.update({
        where: { id: activePeriod.id },
        data: { amount: parsed.data.amount },
      });
    } else {
      const totalDays = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      await db.budgetPeriod.create({
        data: {
          budgetId: budget.id,
          userId,
          startDate: new Date(today.getFullYear(), today.getMonth(), 1),
          endDate: new Date(today.getFullYear(), today.getMonth(), totalDays, 23, 59, 59),
          amount: parsed.data.amount,
        },
      });
    }

    for (const path of ["/dashboard", "/budget", "/reports"]) {
      revalidatePath(path);
    }
    return { ok: true };
  } catch (err) {
    console.error("updateBudgetAction error:", err);
    return { ok: false, error: "Failed to update budget" };
  }
}

export async function updateCategoryBudgetAction(
  categoryId: string,
  budget: number | null,
): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const cat = await db.category.findFirst({ where: { id: categoryId, userId } });
    if (!cat) return { ok: false, error: "Category not found" };

    if (budget != null && (!Number.isFinite(budget) || budget < 0)) {
      return { ok: false, error: "Invalid category budget" };
    }

    await db.category.update({
      where: { id: categoryId },
      data: { budget },
    });

    revalidatePath("/dashboard");
    revalidatePath("/budget");
    return { ok: true };
  } catch (err) {
    console.error("updateCategoryBudgetAction error:", err);
    return { ok: false, error: "Failed to update category budget" };
  }
}

export async function addCustomCategoryAction(
  name: string,
  budget?: number | null,
): Promise<ActionResult & { categoryId?: string }> {
  try {
    const userId = await getUserId();
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 40) {
      return { ok: false, error: "Category name must be 2-40 characters" };
    }

    const existing = await db.category.findFirst({ where: { userId, name: trimmed } });
    if (existing) return { ok: false, error: "A category with this name already exists" };

    const created = await db.category.create({
      data: {
        userId,
        name: trimmed,
        icon: "tag",
        color: "#64748b",
        budget: budget ?? null,
        isDefault: false,
      },
    });

    revalidatePath("/budget");
    revalidatePath("/dashboard");
    return { ok: true, categoryId: created.id };
  } catch (err) {
    console.error("addCustomCategoryAction error:", err);
    return { ok: false, error: "Failed to add category" };
  }
}

export async function deleteCategoryAction(categoryId: string): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const cat = await db.category.findFirst({ where: { id: categoryId, userId } });
    if (!cat) return { ok: false, error: "Category not found" };

    // Prevent deleting default categories; re-assign transactions to "Other"
    const other = await db.category.findFirst({ where: { userId, name: "Other" } });
    if (!other) return { ok: false, error: "Cannot delete default categories" };

    await db.transaction.updateMany({
      where: { userId, categoryId },
      data: { categoryId: other.id },
    });
    await db.category.delete({ where: { id: categoryId } });

    revalidatePath("/budget");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    console.error("deleteCategoryAction error:", err);
    return { ok: false, error: "Failed to delete category" };
  }
}

export async function updateBudgetRolloverAction(
  enabled: boolean,
): Promise<ActionResult> {
  try {
    const userId = await getUserId();
    const budget = await db.budget.findFirst({ where: { userId } });
    if (budget) {
      await db.budget.update({ where: { id: budget.id }, data: { rolloverEnabled: enabled } });
    }
    revalidatePath("/budget");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: "Failed to update rollover" };
  }
}
