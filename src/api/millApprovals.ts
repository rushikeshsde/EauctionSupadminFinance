// Purpose: Super admin APIs for approving or rejecting new mill registrations.
import { apiRequest } from "./client";

export type ApprovalStatus = "PENDING_APPROVAL" | "APPROVED" | "REJECTED";

/** Everything entered on the mill registration form (except the password), plus the decision. */
export interface MillApplication {
  millId: string;
  status: ApprovalStatus;
  submittedAt: string;
  reviewedAt: string | null;
  /** Null when decided from the email link, or for mills registered before approvals existed. */
  reviewedBy: { name: string; username: string } | null;
  rejectionReason: string | null;
  mill: {
    name: string;
    code: string;
    location: string;
    gstNumber: string;
    contactPerson: string;
    phone: string;
    email: string;
  };
  admin: { userId: string; name: string; username: string; email: string; mobile: string } | null;
}

export type ApprovalCounts = Record<ApprovalStatus, number>;

export const STATUS_LABEL: Record<ApprovalStatus, string> = {
  PENDING_APPROVAL: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

/** Fired after a decision so the pending badge in the top bar updates right away. */
export const MILL_REQUESTS_CHANGED = "mill-requests-changed";

export const listApplications = (status: ApprovalStatus | "all") =>
  apiRequest<{ items: MillApplication[]; counts: ApprovalCounts }>(`/mill-approvals?status=${status}`);

export const getApprovalCounts = () => apiRequest<ApprovalCounts>("/mill-approvals/counts");

export const approveMill = (millId: string) =>
  apiRequest<MillApplication>(`/mill-approvals/${millId}/approve`, { method: "POST" });

export const rejectMill = (millId: string, reason: string) =>
  apiRequest<MillApplication>(`/mill-approvals/${millId}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
