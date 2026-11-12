import { useCallback, useEffect, useMemo, useState } from "react";
import { errorText } from "../api/client";
import { listAccounts, ROLE_LABEL, type AccountRole, type MillRef, type WalletAccount } from "../api/finance";
import { AccountOrg } from "../components/AccountSummary";
import { AddCreditsForm } from "../components/AddCreditsForm";
import { Modal } from "../components/Modal";
import { WalletStatement } from "../components/WalletStatement";
import { formatRupees } from "../utils/format";

type RoleFilter = "" | AccountRole;
type Open = { kind: "credit" | "statement"; account: WalletAccount } | null;

const ROLE_TABS: { value: RoleFilter; label: string }[] = [
  { value: "", label: "All" },
  { value: "TRADER", label: "Traders" },
  { value: "MILL_ADMIN", label: "Mill admins" },
];

const millsOf = (a: WalletAccount): MillRef[] => (a.role === "MILL_ADMIN" ? (a.mill ? [a.mill] : []) : a.approvedMills);

export default function WalletsPage() {
  const [accounts, setAccounts] = useState<WalletAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [role, setRole] = useState<RoleFilter>("");
  const [millId, setMillId] = useState("");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<Open>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAccounts(await listAccounts());
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  const mills = useMemo(() => {
    const byId = new Map<string, MillRef>();
    accounts.flatMap(millsOf).forEach((m) => byId.set(m.id, m));
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [accounts]);

  const shown = useMemo(() => {
    const term = search.trim().toLowerCase();
    return accounts.filter((a) => {
      if (role && a.role !== role) return false;
      if (millId && !millsOf(a).some((m) => m.id === millId)) return false;
      if (!term) return true;
      return [a.name, a.username, a.mobile, a.email, a.firmName ?? "", ...millsOf(a).flatMap((m) => [m.name, m.code])]
        .some((v) => v.toLowerCase().includes(term));
    });
  }, [accounts, role, millId, search]);

  const totals = useMemo(() => {
    const sum = (r: AccountRole) => accounts.filter((a) => a.role === r).reduce((t, a) => t + a.balance, 0);
    return {
      traders: accounts.filter((a) => a.role === "TRADER").length,
      millAdmins: accounts.filter((a) => a.role === "MILL_ADMIN").length,
      traderCredits: sum("TRADER"),
      millCredits: sum("MILL_ADMIN"),
    };
  }, [accounts]);

  const onAdded = (updated: WalletAccount, amount: number) => {
    setAccounts((current) => current.map((a) => (a.userId === updated.userId ? { ...a, balance: updated.balance } : a)));
    setOpen(null);
    setNotice(
      `Added ${formatRupees(amount)} to ${updated.name}. New balance: ${formatRupees(updated.balance)}. They have been notified.`,
    );
  };

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Wallets</h1>
          <p className="muted">
            Add credits to trader and mill admin wallets. Credits are not real money, but they spend them like money on
            tender fees.
          </p>
        </div>
        <button type="button" className="btn" onClick={() => void load()} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div className="stats">
        <div className="stat">
          <span className="muted">Traders</span>
          <strong>{totals.traders}</strong>
          <span className="muted">{formatRupees(totals.traderCredits)} in wallets</span>
        </div>
        <div className="stat">
          <span className="muted">Mill admins</span>
          <strong>{totals.millAdmins}</strong>
          <span className="muted">{formatRupees(totals.millCredits)} in wallets</span>
        </div>
        <div className="stat">
          <span className="muted">Total credits held</span>
          <strong>{formatRupees(totals.traderCredits + totals.millCredits)}</strong>
          <span className="muted">across {accounts.length} accounts</span>
        </div>
      </div>

      {notice && <div className="alert alert-success" role="status">{notice}</div>}
      {error && (
        <div className="alert alert-error">
          {error}{" "}
          <button type="button" className="link" onClick={() => void load()}>Retry</button>
        </div>
      )}

      <div className="toolbar">
        <div className="segmented" role="tablist" aria-label="Account type">
          {ROLE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={role === tab.value}
              className={role === tab.value ? "active" : ""}
              onClick={() => setRole(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <select value={millId} onChange={(e) => setMillId(e.target.value)} aria-label="Mill">
          <option value="">All mills</option>
          {mills.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
        <input
          className="search"
          placeholder="Search name, mobile, mill, firm…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="muted count">{shown.length} of {accounts.length}</span>
      </div>

      <div className="card table-wrap">
        {loading && accounts.length === 0 ? (
          <p className="empty">Loading wallets…</p>
        ) : shown.length === 0 ? (
          <p className="empty">
            {accounts.length === 0 ? "No traders or mill admins have registered yet." : "No accounts match your filters."}
          </p>
        ) : (
          <table className="stacked">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Mill / Firm</th>
                <th className="num">Balance</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {shown.map((a) => (
                <tr key={a.userId}>
                  <td className="cell-name">
                    <strong>{a.name}</strong>
                    {a.status === "INACTIVE" && <>{" "}<span className="badge badge-gray">Inactive</span></>}
                    <div className="muted">{a.username} · {a.mobile}</div>
                  </td>
                  <td className="cell-type">
                    <span className={`badge ${a.role === "TRADER" ? "badge-blue" : "badge-violet"}`}>{ROLE_LABEL[a.role]}</span>
                  </td>
                  <td className="org-cell"><AccountOrg account={a} /></td>
                  <td className="num cell-balance"><strong>{formatRupees(a.balance)}</strong></td>
                  <td className="row-actions">
                    <button type="button" className="btn btn-small" onClick={() => setOpen({ kind: "statement", account: a })}>
                      Statement
                    </button>
                    <button type="button" className="btn btn-small btn-primary" onClick={() => setOpen({ kind: "credit", account: a })}>
                      Add credits
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {open?.kind === "credit" && (
        <Modal title="Add credits" onClose={() => setOpen(null)} small>
          <AddCreditsForm
            account={open.account}
            onAdded={(updated, tx) => onAdded(updated, tx.amount)}
            onCancel={() => setOpen(null)}
          />
        </Modal>
      )}

      {open?.kind === "statement" && (
        <Modal title="Wallet statement" onClose={() => setOpen(null)}>
          <WalletStatement account={open.account} />
        </Modal>
      )}
    </section>
  );
}
