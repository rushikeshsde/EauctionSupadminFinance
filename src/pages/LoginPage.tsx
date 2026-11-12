import { useState, type FormEvent } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { loginPortalUser } from "../api/auth";
import { errorText } from "../api/client";
import { getSession, saveSession } from "../auth/session";
import { homeFor, isPortalRole } from "../auth/roles";

export default function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(
    params.get("expired") ? "Your session expired. Please sign in again." : null,
  );

  const current = getSession()?.user.role;
  if (isPortalRole(current)) {
    return <Navigate to={homeFor(current)} replace />;
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!username.trim() || !password) {
      setError("Enter your username and password.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const session = await loginPortalUser(username, password);
      saveSession(session);
      navigate(homeFor(session.user.role), { replace: true });
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand brand-center">
          <img src="/favicon.svg" alt="" width={40} height={40} />
          <div>
            <strong>eAuctionMarket</strong>
            <span>Admin Portal</span>
          </div>
        </div>
        <h1>Sign in</h1>
        <p className="muted">For the super admin and finance accounts only.</p>

        <form onSubmit={(e) => void onSubmit(e)} className="form" noValidate>
          <label className="field">
            <span>Username</span>
            <input
              autoFocus
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="superadmin or finance"
            />
          </label>
          <label className="field">
            <span>Password</span>
            <div className="input-with-action">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button type="button" className="link" onClick={() => setShowPassword((v) => !v)}>
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          {error && <div className="alert alert-error" role="alert">{error}</div>}

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
