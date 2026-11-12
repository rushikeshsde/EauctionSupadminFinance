import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { getSession } from "./auth/session";
import { homeFor, type PortalRole } from "./auth/roles";
import { Layout } from "./components/Layout";
import CreditHistoryPage from "./pages/CreditHistoryPage";
import LoginPage from "./pages/LoginPage";
import MillRequestsPage from "./pages/MillRequestsPage";
import TenderReportsPage from "./pages/TenderReportsPage";
import WalletsPage from "./pages/WalletsPage";

/** Pages of one back-office account; anyone else goes to their own home page or the login. */
function RequireRole({ role }: { role: PortalRole }) {
  const session = getSession();
  if (!session) return <Navigate to="/login" replace />;
  if (session.user.role !== role) return <Navigate to={homeFor(session.user.role)} replace />;
  return <Outlet />;
}

function HomeRedirect() {
  return <Navigate to={homeFor(getSession()?.user.role)} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<Layout />}>
        <Route element={<RequireRole role="SUPER_ADMIN" />}>
          <Route path="/mill-requests" element={<MillRequestsPage />} />
          <Route path="/tender-reports" element={<TenderReportsPage />} />
        </Route>
        <Route element={<RequireRole role="FINANCE" />}>
          <Route path="/wallets" element={<WalletsPage />} />
          <Route path="/credit-history" element={<CreditHistoryPage />} />
        </Route>
      </Route>
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}
