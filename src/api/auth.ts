// Purpose: Super admin / finance login and logout against the backend.
import { ApiError, apiRequest } from "./client";
import type { Session } from "../auth/session";
import { isPortalRole } from "../auth/roles";

export async function loginPortalUser(username: string, password: string): Promise<Session> {
  const session = await apiRequest<Session>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username: username.trim(), password }),
  });

  // This website is for the super admin and finance accounts only; mill admins use the mill portal.
  if (!isPortalRole(session.user.role)) {
    throw new ApiError(
      "This portal is only for the super admin and finance accounts. Mill admins should use the mill portal.",
      403,
    );
  }

  return session;
}

export async function logoutPortalUser(): Promise<void> {
  try {
    await apiRequest<null>("/auth/logout", { method: "POST" });
  } catch {
    // Logging out locally is enough if the server call fails.
  }
}
