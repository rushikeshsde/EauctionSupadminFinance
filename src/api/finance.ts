// Purpose: Finance user APIs (backend: /finance) — trader and mill admin wallets and the credits
// finance adds to them. Credits are not real money but users spend them like money (tender fees).
import { apiRequest } from "./client";

export type AccountRole = "TRADER" | "MILL_ADMIN";

export interface MillRef {
  id: string;
  name: string;
  code: string;
}

export interface WalletAccount {
  userId: string;
  name: string;
  username: string;
  email: string;
  mobile: string;
  role: AccountRole;
  status: "ACTIVE" | "INACTIVE";
  registeredAt: string;
  /** Mill admin's own mill. */
  mill: MillRef | null;
  /** Trader's firm and the mills that approved the trader. */
  firmName: string | null;
  city: string | null;
  approvedMills: MillRef[];
  balance: number;
  walletUpdatedAt: string | null;
}

export interface WalletTransaction {
  id: string;
  amount: number;
  type: "CREDIT" | "DEBIT";
  reason: "ADMIN_TOPUP" | "TENDER_CREATION" | "TENDER_REGISTRATION" | "REFUND" | "PENALTY" | "BONUS";
  referenceType: string;
  referenceId: string | null;
  note: string | null;
  balanceAfter: number | null;
  addedBy: { id: string; name: string; username: string } | null;
  createdAt: string;
}

export interface CreditEntry extends WalletTransaction {
  account: Pick<WalletAccount, "userId" | "name" | "username" | "mobile" | "role" | "mill" | "firmName">;
}

/** Same limits as the backend (wallet.constants.ts). */
export const CREDIT_LIMITS = { MIN: 1, MAX: 1_000_000 } as const;

export function listAccounts() {
  return apiRequest<WalletAccount[]>("/finance/accounts");
}

export function addCredits(userId: string, amount: number, note?: string) {
  return apiRequest<{ account: WalletAccount; transaction: WalletTransaction }>(
    `/finance/accounts/${userId}/credits`,
    { method: "POST", body: JSON.stringify({ amount, ...(note ? { note } : {}) }) },
  );
}

const pageQuery = (cursor?: string, limit = 20) =>
  `?limit=${limit}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;

export function listAccountTransactions(userId: string, cursor?: string) {
  return apiRequest<{ transactions: WalletTransaction[]; hasMore: boolean }>(
    `/finance/accounts/${userId}/transactions${pageQuery(cursor)}`,
  );
}

export function listCredits(cursor?: string) {
  return apiRequest<{ credits: CreditEntry[]; hasMore: boolean }>(`/finance/credits${pageQuery(cursor, 30)}`);
}

export const ROLE_LABEL: Record<AccountRole, string> = { TRADER: "Trader", MILL_ADMIN: "Mill admin" };

export const transactionLabel = (tx: WalletTransaction): string => {
  switch (tx.reason) {
    case "ADMIN_TOPUP":
      return tx.addedBy ? "Credits added by Finance" : "Wallet top-up";
    case "TENDER_CREATION":
      return "Tender creation fee";
    case "TENDER_REGISTRATION":
      return "Tender registration fee";
    case "REFUND":
      return "Refund";
    case "PENALTY":
      return "Penalty";
    case "BONUS":
      return "Bonus";
    default:
      return tx.reason;
  }
};
