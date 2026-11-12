import { useCallback, useEffect, useState } from "react";
import { errorText } from "../api/client";
import { listAccountTransactions, transactionLabel, type WalletAccount, type WalletTransaction } from "../api/finance";
import { formatIstDateTime, formatRupees } from "../utils/format";
import { AccountSummary } from "./AccountSummary";

/** Every credit and fee debit of one wallet, newest first. */
export function WalletStatement({ account }: { account: WalletAccount }) {
  const [rows, setRows] = useState<WalletTransaction[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (cursor?: string) => {
      setLoading(true);
      setError(null);
      try {
        const page = await listAccountTransactions(account.userId, cursor);
        setRows((current) => (cursor ? [...current, ...page.transactions] : page.transactions));
        setHasMore(page.hasMore);
      } catch (err) {
        setError(errorText(err));
      } finally {
        setLoading(false);
      }
    },
    [account.userId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="form">
      <AccountSummary account={account} />

      {error && (
        <div className="alert alert-error">
          {error}{" "}
          <button type="button" className="link" onClick={() => void load(rows.at(-1)?.id)}>Retry</button>
        </div>
      )}

      {rows.length === 0 && !loading && !error ? (
        <p className="empty">No wallet transactions yet.</p>
      ) : (
        <ul className="statement">
          {rows.map((tx) => (
            <li key={tx.id}>
              <div>
                <strong>{transactionLabel(tx)}</strong>
                {tx.note && <div className="note">“{tx.note}”</div>}
                <div className="muted">
                  {formatIstDateTime(tx.createdAt)}
                  {tx.addedBy && <> · by {tx.addedBy.name}</>}
                </div>
              </div>
              <div className="statement-amount">
                <strong className={tx.type === "CREDIT" ? "positive" : "negative"}>
                  {tx.type === "CREDIT" ? "+" : "−"}{formatRupees(tx.amount)}
                </strong>
                {tx.balanceAfter !== null && <div className="muted">Bal. {formatRupees(tx.balanceAfter)}</div>}
              </div>
            </li>
          ))}
        </ul>
      )}

      {loading && <p className="muted center">Loading…</p>}
      {hasMore && !loading && (
        <button type="button" className="btn btn-block" onClick={() => void load(rows.at(-1)?.id)}>
          Load older transactions
        </button>
      )}
    </div>
  );
}
