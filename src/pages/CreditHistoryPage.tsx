import { useCallback, useEffect, useState } from "react";
import { errorText } from "../api/client";
import { listCredits, ROLE_LABEL, type CreditEntry } from "../api/finance";
import { AccountOrg } from "../components/AccountSummary";
import { formatIstDateTime, formatRupees } from "../utils/format";

/** Every credit the finance account has added, newest first. */
export default function CreditHistoryPage() {
  const [rows, setRows] = useState<CreditEntry[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (cursor?: string) => {
    setLoading(true);
    setError(null);
    try {
      const page = await listCredits(cursor);
      setRows((current) => (cursor ? [...current, ...page.credits] : page.credits));
      setHasMore(page.hasMore);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Credit History</h1>
          <p className="muted">Every credit added to trader and mill admin wallets by Finance.</p>
        </div>
        <button type="button" className="btn" onClick={() => void load()} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}{" "}
          <button type="button" className="link" onClick={() => void load(rows.at(-1)?.id)}>Retry</button>
        </div>
      )}

      <div className="card table-wrap">
        {loading && rows.length === 0 ? (
          <p className="empty">Loading credit history…</p>
        ) : rows.length === 0 ? (
          <p className="empty">No credits have been added yet. Use the Wallets page to add credits.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date (IST)</th>
                <th>Account</th>
                <th>Mill / Firm</th>
                <th className="num">Credits added</th>
                <th className="num">Balance after</th>
                <th>Note</th>
                <th>Added by</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id}>
                  <td>{formatIstDateTime(c.createdAt)}</td>
                  <td>
                    <strong>{c.account.name}</strong>{" "}
                    <span className={`badge ${c.account.role === "TRADER" ? "badge-blue" : "badge-violet"}`}>
                      {ROLE_LABEL[c.account.role]}
                    </span>
                    <div className="muted">{c.account.username} · {c.account.mobile}</div>
                  </td>
                  <td className="org-cell"><AccountOrg account={c.account} /></td>
                  <td className="num"><strong className="positive">+{formatRupees(c.amount)}</strong></td>
                  <td className="num">{c.balanceAfter === null ? "—" : formatRupees(c.balanceAfter)}</td>
                  <td className="note-cell">{c.note ?? <span className="muted">—</span>}</td>
                  <td>{c.addedBy?.name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {hasMore && (
        <div className="load-more">
          <button type="button" className="btn" onClick={() => void load(rows.at(-1)?.id)} disabled={loading}>
            {loading ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </section>
  );
}
