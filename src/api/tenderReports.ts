// Purpose: Tender reports (backend: /tender-updates) — the bulletin of mill tenders that the super
// admin publishes and traders, committee members and mill admins read in their apps.
import { apiRequest } from "./client";

export interface TenderReport {
  id: string;
  district: string;
  millName: string;
  millCode: string;
  tenderOpenDate: string;
  tenderCloseDate: string;
  grade: string;
  productionSeason: string;
  state: string;
  basicRate: string;
  createdAt: string;
  updatedAt: string;
  creator?: { id: string; name: string; username: string };
}

export interface TenderReportInput {
  district: string;
  millName: string;
  millCode: string;
  tenderOpenDate: string; // ISO
  tenderCloseDate: string; // ISO
  grade: string;
  productionSeason: string;
  state: string;
  basicRate: number;
}

export interface TenderReportFilters {
  state?: string;
  district?: string;
  grade?: string;
  productionSeason?: string;
}

export function listTenderReports(filters: TenderReportFilters = {}) {
  const params = new URLSearchParams(
    Object.entries(filters).filter(([, v]) => v && v.trim() !== "") as [string, string][],
  );
  const query = params.toString();
  return apiRequest<TenderReport[]>(`/tender-updates${query ? `?${query}` : ""}`);
}

export function createTenderReport(input: TenderReportInput) {
  return apiRequest<TenderReport>("/tender-updates", { method: "POST", body: JSON.stringify(input) });
}

export function updateTenderReport(id: string, input: TenderReportInput) {
  return apiRequest<TenderReport>(`/tender-updates/${id}`, { method: "PUT", body: JSON.stringify(input) });
}

export function deleteTenderReport(id: string) {
  return apiRequest<null>(`/tender-updates/${id}`, { method: "DELETE" });
}
