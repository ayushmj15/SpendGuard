"use client";

import * as React from "react";
import { Menu, Plus, Moon, Sun } from "lucide-react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { NAV_ITEMS } from "@/lib/nav";
import { useTheme } from "@/components/theme-provider";
import { useUIStore } from "@/store/ui-store";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Logo } from "@/components/logo";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { setAddExpenseOpen } = useUIStore();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const current =
    NAV_ITEMS.find(
      (i) => pathname === i.href || pathname.startsWith(`${i.href}/`),
    )?.title ?? "Dashboard";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex-1">
        <h1 className="text-base font-semibold sm:text-lg">{current}</h1>
      </div>

      <Button
        onClick={() => setAddExpenseOpen(true)}
        size="sm"
        className="hidden items-center gap-1.5 md:inline-flex"
      >
        <Plus className="h-4 w-4" />
        Add Expense
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        aria-label="Toggle theme"
      >
        {resolvedTheme === "dark" ? (
          <Sun className="h-5 w-5" />
        ) : (
          <Moon className="h-5 w-5" />
        )}
      </Button>

      {/* Mobile navigation drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="h-16 justify-center border-b border-border px-6">
            <SheetTitle asChild>
              <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                <Logo />
              </Link>
            </SheetTitle>
          </SheetHeader>
          <nav className="space-y-1 p-4">
            {NAV_ITEMS.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent",
                  )}
                >
                  <item.icon className="h-4.5 w-4.5" />
                  {item.title}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-border p-4">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground"
              onClick={() => {
                setMobileOpen(false);
                signOut({ callbackUrl: "/login" });
              }}
            >
              Sign out
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
