// Purpose: Store the super admin's / finance user's login session in the browser.
const STORAGE_KEY = "e-auction:superadmin-session";

export interface SessionUser {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
}

export interface Session {
  token: string;
  user: SessionUser;
}

export const getSession = (): Session | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
};

export const getToken = (): string | null => getSession()?.token ?? null;

export const saveSession = (session: Session): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
};

export const clearSession = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};
