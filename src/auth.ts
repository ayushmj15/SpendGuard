import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validations/auth";
import { ensureUserInitialized } from "@/lib/onboarding";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Google,
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await db.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });
        if (!user) return null;

        const valid = user.hashedPassword
          ? await bcrypt.compare(parsed.data.password, user.hashedPassword)
          : false;
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      // For OAuth (Google) users, provision default categories/settings/budget
      // on first sign-in (idempotent). Credentials users are already set up.
      if (user?.id) {
        try {
          await ensureUserInitialized(user.id);
        } catch (err) {
          // Don't block sign-in, but log loudly so a failed first-time
          // provisioning is visible and can be retried by the session callback.
          console.error("[auth] Failed to initialize user on sign-in:", err);
        }
      }
      return true;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        (session.user as { id: string }).id = token.id as string;
        // Retry provisioning idempotently: if it failed during the original
        // sign-in (e.g. transient/network error), ensure defaults on next read.
        try {
          await ensureUserInitialized(token.id as string);
        } catch (err) {
          console.error("[auth] Failed to ensure user initialized on session:", err);
        }
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
      }
      return token;
    },
  },
});
