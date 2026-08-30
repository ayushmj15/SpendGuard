import {
  LayoutDashboard,
  ArrowLeftRight,
  PiggyBank,
  Lightbulb,
  FileText,
  Bell,
  Settings,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Transactions", href: "/transactions", icon: ArrowLeftRight },
  { title: "Budget", href: "/budget", icon: PiggyBank },
  { title: "Insights", href: "/insights", icon: Lightbulb },
  { title: "Reports", href: "/reports", icon: FileText },
  { title: "Notifications", href: "/notifications", icon: Bell },
  { title: "Settings", href: "/settings", icon: Settings },
];

export const BRAND = {
  name: "SpendGuard",
  tagline: "Know your spending. Control your money.",
};
