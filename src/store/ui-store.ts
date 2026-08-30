"use client";

import { create } from "zustand";

interface UIState {
  addExpenseOpen: boolean;
  setAddExpenseOpen: (open: boolean) => void;

  lockOpen: boolean;
  setLockOpen: (open: boolean) => void;

  // dashboard card visibility (customizable per requirements)
  dashboardCards: string[];
  setDashboardCards: (cards: string[]) => void;

  // amount entered in "Can I spend this?" widget
  checkAmount: string;
  setCheckAmount: (amount: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  addExpenseOpen: false,
  setAddExpenseOpen: (open) => set({ addExpenseOpen: open }),

  lockOpen: false,
  setLockOpen: (open) => set({ lockOpen: open }),

  dashboardCards: ["budget", "forecast", "spending", "categories", "recent"],
  setDashboardCards: (cards) => set({ dashboardCards: cards }),

  checkAmount: "",
  setCheckAmount: (amount) => set({ checkAmount: amount }),
}));
