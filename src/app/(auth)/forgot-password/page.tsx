"use client";

import * as React from "react";
import Link from "next/link";
import { Mail, ArrowLeft, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Reset your password</CardTitle>
        <CardDescription>
          We&apos;ll send you a link to reset your password
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-start gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Email sending is reserved for a future update. For now, please
            contact your administrator to reset your password.
          </p>
        </div>

        {submitted ? (
          <div className="text-center text-sm text-muted-foreground">
            <p className="mb-2">
              If an account exists for <strong>{email}</strong>, a reset link
              will be sent there.
            </p>
            <p className="text-xs">
              (Email delivery is not yet configured in this version.)
            </p>
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(true);
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className="pl-9"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled>
              Send reset link
            </Button>
          </form>
        )}

        <div className="mt-6 text-center text-sm">
          <Link
            href="/login"
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
