import { Resend } from "resend";

/**
 * Email sending via Resend (https://resend.com).
 * Requires RESEND_API_KEY and a verified EMAIL_FROM sender in .env.
 * EMAIL_FROM can use an onboarding address (onboarding@resend.dev) while your
 * domain is being verified, then a custom domain address once verified.
 */

export interface ResetPasswordEmailParams {
  to: string;
  resetUrl: string;
}

export async function sendPasswordResetEmail({
  to,
  resetUrl,
}: ResetPasswordEmailParams): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.warn(
      "[mail] RESEND_API_KEY or EMAIL_FROM not configured; skipping email send.",
    );
    return false;
  }

  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from,
    to,
    subject: "Reset your SpendGuard password",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #0f766e;">Reset your SpendGuard password</h2>
        <p>Hi there,</p>
        <p>
          We received a request to reset the password for your SpendGuard account.
          Click the button below to choose a new password. This link is valid for
          1 hour.
        </p>
        <p style="margin: 28px 0;">
          <a href="${resetUrl}" style="background-color: #0f766e; color: #ffffff; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Reset my password
          </a>
        </p>
        <p>
          If you didn't request this, you can safely ignore this email — your
          password won't change.
        </p>
        <p style="color: #64748b; font-size: 12px; margin-top: 32px;">
          You're receiving this because an account on SpendGuard uses this email.
        </p>
      </div>
    `,
  });

  if (error) {
    console.error("[mail] Resend error:", error);
    return false;
  }
  return true;
}
