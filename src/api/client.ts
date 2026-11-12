// Purpose: Small fetch wrapper for the E-Auction backend API ({ success, message, data } envelope).
import { clearSession, getToken } from "../auth/session";

const API_PREFIX = "/api/v1";

export interface ApiFieldError {
  field?: string;
  message: string;
}

export class ApiError extends Error {
  status: number;
  errors: ApiFieldError[];

  constructor(message: string, status: number, errors: ApiFieldError[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

/** The hosted backend sleeps when idle; its edge answers 429/503 while waking (request not processed). */
const WAKE_RETRY_STATUSES = new Set([429, 503]);
const WAKE_RETRY_DELAYS_MS = [3_000, 7_000, 10_000, 15_000];

const parseJson = (text: string): unknown => {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const friendlyStatusMessage = (status: number) => {
  if (status === 429 || status === 503) return "The server is starting up. Please try again in a few seconds.";
  if (status === 502 || status === 504) return "The server did not respond in time. Please try again.";
  return `Request failed (${status}).`;
};

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const url = `${API_PREFIX}${path}`;
  let response: Response;
  try {
    response = await fetch(url, { ...init, headers });
    for (let i = 0; i < WAKE_RETRY_DELAYS_MS.length && WAKE_RETRY_STATUSES.has(response.status); i += 1) {
      await new Promise((resolve) => setTimeout(resolve, WAKE_RETRY_DELAYS_MS[i]));
      response = await fetch(url, { ...init, headers });
    }
  } catch {
    throw new ApiError("Cannot reach the server. Check your internet connection.", 0);
  }

  const payload = parseJson(await response.text()) as
    | { success?: boolean; message?: string; errors?: ApiFieldError[]; data?: T }
    | null;

  if (response.status === 401 && token) {
    // Expired or revoked session: sign out and send the user back to the login page.
    clearSession();
    window.location.assign("/login?expired=1");
  }

  if (!response.ok || payload?.success === false) {
    const errors = Array.isArray(payload?.errors) ? payload.errors : [];
    throw new ApiError(payload?.message || friendlyStatusMessage(response.status), response.status, errors);
  }

  return (payload?.data ?? null) as T;
}

/** Human-readable error text, including field-level validation messages. */
export const errorText = (error: unknown): string => {
  if (error instanceof ApiError) {
    const details = error.errors.map((e) => e.message).filter(Boolean);
    return details.length > 0 ? details.join(" ") : error.message;
  }
  return error instanceof Error ? error.message : "Something went wrong.";
};
