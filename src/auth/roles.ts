// Purpose: The two back-office accounts that can sign in to this portal, and where each one lands.

export type PortalRole = "SUPER_ADMIN" | "FINANCE";

export const PORTAL_ROLES: Record<PortalRole, { label: string; home: string }> = {
  SUPER_ADMIN: { label: "Super Admin", home: "/mill-requests" },
  FINANCE: { label: "Finance", home: "/wallets" },
};

export const isPortalRole = (role: string | undefined): role is PortalRole =>
  role === "SUPER_ADMIN" || role === "FINANCE";

export const homeFor = (role: string | undefined): string =>
  isPortalRole(role) ? PORTAL_ROLES[role].home : "/login";
