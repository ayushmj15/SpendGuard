"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui-store";
import { NAV_ITEMS } from "@/lib/nav";

const BOTTOM_ITEMS = ["Dashboard", "Transactions", "Budget", "Insights", "Settings"];

export function BottomNav() {
  const pathname = usePathname();
  const { setAddExpenseOpen } = useUIStore();

  const items = NAV_ITEMS.filter((i) => BOTTOM_ITEMS.includes(i.title));

  return (
    <>
      {/* Floating add button */}
      <button
        onClick={() => setAddExpenseOpen(true)}
        className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95 md:hidden"
        aria-label="Add expense"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Bottom navigation bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="grid grid-cols-5">
          {items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.title}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
