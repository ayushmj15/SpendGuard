import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          {/* Shield */}
          <path d="M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5l8-3z" />
          {/* Rupee */}
          <path d="M9 8.5h6M9 8.5h6M9 11h4M9 11l4.5 4.5" />
          <path d="M12.75 6.5h.01" />
        </svg>
        <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-foreground text-[7px] text-background">
          ✓
        </span>
      </div>
      <span className="text-lg font-bold tracking-tight text-foreground">
        Spend<span className="text-primary">Guard</span>
      </span>
    </div>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path d="M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5l8-3z" />
        <path d="M9 8.5h6M9 8.5h6M9 11h4M9 11l4.5 4.5" />
      </svg>
    </div>
  );
}
