import { useEffect, useState } from "react";
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { logoutPortalUser } from "../api/auth";
import { getApprovalCounts, MILL_REQUESTS_CHANGED } from "../api/millApprovals";
import { clearSession, getSession } from "../auth/session";
import { isPortalRole, PORTAL_ROLES, type PortalRole } from "../auth/roles";

const NAV: Record<PortalRole, { to: string; label: string }[]> = {
  SUPER_ADMIN: [
    { to: "/mill-requests", label: "Mill Requests" },
    { to: "/tender-reports", label: "Tender Reports" },
  ],
  FINANCE: [
    { to: "/wallets", label: "Wallets" },
    { to: "/credit-history", label: "Credit History" },
  ],
};

const PENDING_POLL_MS = 60_000;

/** Number of mill registrations waiting for the super admin (null for other accounts). */
function usePendingMillRequests(enabled: boolean): number | null {
  const [pending, setPending] = useState<number | null>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    if (!enabled) return;
    const refresh = () =>
      getApprovalCounts()
        .then((counts) => setPending(counts.PENDING_APPROVAL))
        .catch(() => {
          // Badge only; keep the last known count.
        });
    refresh();
    const timer = setInterval(refresh, PENDING_POLL_MS);
    window.addEventListener(MILL_REQUESTS_CHANGED, refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener(MILL_REQUESTS_CHANGED, refresh);
    };
  }, [enabled, pathname]);

  return pending;
}

export function Layout() {
  const navigate = useNavigate();
  const user = getSession()?.user;
  const pendingMills = usePendingMillRequests(user?.role === "SUPER_ADMIN");

  if (!user || !isPortalRole(user.role)) return <Navigate to="/login" replace />;
  const roleLabel = PORTAL_ROLES[user.role].label;

  const logout = async () => {
    await logoutPortalUser();
    clearSession();
    navigate("/login", { replace: true });
  };

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <img src="/favicon.svg" alt="" width={28} height={28} />
          <div>
            <strong>eAuctionMarket</strong>
            <span>{roleLabel}</span>
          </div>
        </div>
        <nav className="nav">
          {NAV[user.role].map((item) => (
            <NavLink key={item.to} to={item.to}>
              {item.label}
              {item.to === "/mill-requests" && !!pendingMills && (
                <span className="nav-count" aria-label={`${pendingMills} pending`}>{pendingMills}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="user">
          <span title={user.username}>{user.name || roleLabel}</span>
          <button type="button" className="btn btn-ghost" onClick={() => void logout()}>
            Log out
          </button>
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
