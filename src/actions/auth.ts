"use server";

import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { db } from "@/lib/db";
import { signupSchema, resetPasswordSchema } from "@/lib/validations/auth";
import { signIn } from "@/auth";
import { initializeUser } from "@/lib/onboarding";
import { sendPasswordResetEmail } from "@/lib/mail";

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

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function requestPasswordResetAction(
  prevState:
    | { error?: string; success?: boolean; data?: { email: string } }
    | undefined,
  formData: FormData,
) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  // Always report success regardless of whether the account exists, to avoid
  // leaking which emails are registered.
  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email" };
  }

  const successData = { email };

  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!existing) {
    return { success: true, data: successData };
  }

  try {
    const token = randomBytes(32).toString("base64url");

    await db.passwordResetToken.create({
      data: {
        userId: existing.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;

    await sendPasswordResetEmail({
      to: email,
      resetUrl,
    });
  } catch (err) {
    console.error("Request password reset failed:", err);
  }

  return { success: true, data: successData };
}

export async function resetPasswordAction(
  prevState: { error?: string; success?: boolean } | undefined,
  formData: FormData,
) {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { token, password } = parsed.data;
  const tokenHash = hashToken(token);

  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, usedAt: true, expiresAt: true },
  });

  if (
    !record ||
    record.usedAt !== null ||
    record.expiresAt.getTime() < Date.now()
  ) {
    return {
      error:
        "This reset link is invalid or has expired. Please request a new one.",
    };
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  try {
    await db.$transaction([
      db.user.update({
        where: { id: record.userId },
        data: { hashedPassword },
      }),
      db.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);
  } catch (err) {
    console.error("Password reset failed:", err);
    return { error: "Something went wrong. Please try again." };
  }

  return { success: true };
}
