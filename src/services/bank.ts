// ---------------------------------------------------------------------------
// FUTURE BANK / ACCOUNT AGGREGATOR INTEGRATION ARCHITECTURE
//
// SpendGuard will NEVER directly control, freeze, or block a real bank
// account, and will never collect bank passwords, UPI/ATM PINs, CVVs, OTPs,
// or full card numbers.
//
// These services define the contracts that a real integration would implement
// later. For now they return mock/demo data so the rest of the app can build
// against a stable interface. To add a real integration, replace the internals
// of these methods with calls to an official bank / Account Aggregator API.
//
// Official integration points (documented, NOT yet implemented):
//   - Bank webhooks / Open Banking APIs   -> BankConnectionService.poll()
//   - Account Aggregator (AA) framework   -> AccountAggregatorService
//   - Mapped, sanitized transactions      -> TransactionImportService
// ---------------------------------------------------------------------------

import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export type BankConnection = Prisma.BankConnectionGetPayload<{}>;

export interface BankAccount {
  id: string;
  provider: string;
  accountLabel: string;
  last4: string;
  type: "SAVINGS" | "CREDIT" | "UPI";
}

export interface RawBankTransaction {
  externalId: string;
  date: Date;
  amount: number; // positive = debit (money out)
  description: string;
  categoryHint?: string;
}

export interface TransactionImportMapping {
  source: string;
  accountId?: string;
}

export interface ImportResult {
  importedCount: number;
  skippedDuplicates: number;
  errors: string[];
}

/**
 * Manages a user's linked bank connections.
 * In this version it stores connection metadata only (never credentials)
 * and simulates the lifecycle.
 */
export class BankConnectionService {
  static async list(userId: string): Promise<BankConnection[]> {
    return db.bankConnection.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  static async connect(
    userId: string,
    provider: string,
  ): Promise<BankConnection> {
    // Real integration: redirect to provider's OAuth / AA consent screen.
    // Never prompt for credentials in the app itself.
    return db.bankConnection.create({
      data: { userId, provider, status: "pending" },
    });
  }

  static async disconnect(userId: string, connectionId: string) {
    return db.bankConnection.delete({
      where: { id: connectionId, userId },
    });
  }

  /**
   * Poll the (mock) connected accounts for fresh transactions.
   * In a real integration this calls the bank/AA API and returns sanitized
   * transactions - only amounts, dates, descriptions and category hints.
   */
  static async poll(userId: string): Promise<BankAccount[]> {
    // Mock: simulate two linked accounts to showcase the UI.
    return [
      {
        id: "mock-savings-1",
        provider: "Demo Bank",
        accountLabel: "Salary Account",
        last4: "4821",
        type: "SAVINGS",
      },
    ];
  }
}

/**
 * Normalizes imported transactions and maps them to SpendGuard fields,
 * including duplicate detection (date + amount + description).
 */
export class TransactionImportService {
  static normalize(raw: RawBankTransaction) {
    return {
      date: raw.date,
      amount: Math.abs(raw.amount),
      type: (raw.amount >= 0 ? "EXPENSE" : "INCOME") as "EXPENSE" | "INCOME",
      description: raw.description,
      categoryHint: raw.categoryHint,
    };
  }

  /**
   * Duplicate signature used to detect potential duplicate transactions.
   * Uses date + amount + normalized description.
   */
  static duplicateSignature(tx: {
    date: Date;
    amount: number;
    description?: string | null;
  }): string {
    const day = new Date(tx.date).toISOString().slice(0, 10);
    const desc = (tx.description ?? "").trim().toLowerCase().replace(/\s+/g, " ");
    return `${day}|${tx.amount.toFixed(2)}|${desc}`;
  }
}

/**
 * Account Aggregator (AA) service - future SAHAMATI-class integration.
 * Reserved interface, returns demo data for now.
 */
export class AccountAggregatorService {
  static async getConsentStatus(userId: string): Promise<"none" | "active"> {
    return "none";
  }
  static async fetchTransactions(userId: string): Promise<RawBankTransaction[]> {
    return [];
  }
}
