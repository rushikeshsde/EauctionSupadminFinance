import { useState, type FormEvent } from "react";
import { errorText } from "../api/client";
import { addCredits, CREDIT_LIMITS, ROLE_LABEL, type WalletAccount, type WalletTransaction } from "../api/finance";
import { formatRupees, formatRupeesShort } from "../utils/format";
import { AccountSummary } from "./AccountSummary";

const QUICK_AMOUNTS = [1_000, 5_000, 10_000, 50_000];

const amountProblem = (raw: string): string | null => {
  if (!raw.trim()) return "Enter the amount of credits to add.";
  const value = Number(raw);
  if (!Number.isFinite(value)) return "Enter a valid amount.";
  if (value < CREDIT_LIMITS.MIN) return `Amount must be at least ${formatRupeesShort(CREDIT_LIMITS.MIN)}.`;
  if (value > CREDIT_LIMITS.MAX) return `Amount cannot be more than ${formatRupeesShort(CREDIT_LIMITS.MAX)} in one entry.`;
  if (Math.abs(value * 100 - Math.round(value * 100)) > 1e-6) return "Use at most 2 decimals.";
  return null;
};

interface Props {
  account: WalletAccount;
  onAdded: (account: WalletAccount, transaction: WalletTransaction) => void;
  onCancel: () => void;
}

export function AddCreditsForm({ account, onAdded, onCancel }: Props) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const problem = amountProblem(amount);
  const value = problem ? 0 : Number(amount);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (problem || saving) return;

    setSaving(true);
    setError(null);
    try {
      const result = await addCredits(account.userId, value, note.trim() || undefined);
      onAdded(result.account, result.transaction);
    } catch (err) {
      setError(errorText(err));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="form" noValidate>
      <AccountSummary account={account} />

      <label className={`field ${touched && problem ? "has-error" : ""}`}>
        <span>Credits to add (₹)</span>
        <input
          autoFocus
          type="number"
          inputMode="decimal"
          step="0.01"
          min={CREDIT_LIMITS.MIN}
          max={CREDIT_LIMITS.MAX}
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setError(null);
          }}
          onBlur={() => setTouched(true)}
          placeholder="5000"
        />
        {touched && problem ? (
          <small className="error">{problem}</small>
        ) : (
          <small className="muted">
            {formatRupeesShort(CREDIT_LIMITS.MIN)} to {formatRupeesShort(CREDIT_LIMITS.MAX)} per entry.
          </small>
        )}
      </label>

      <div className="chips" aria-label="Quick amounts">
        {QUICK_AMOUNTS.map((quick) => (
          <button
            key={quick}
            type="button"
            className={`chip ${Number(amount) === quick ? "chip-active" : ""}`}
            onClick={() => {
              setAmount(String(quick));
              setTouched(true);
              setError(null);
            }}
          >
            {formatRupeesShort(quick)}
          </button>
        ))}
      </div>

      <label className="field">
        <span>Note <span className="muted">(optional)</span></span>
        <input
          value={note}
          maxLength={250}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Payment received by NEFT, UTR 1234"
        />
        <small className="muted">The {ROLE_LABEL[account.role].toLowerCase()} sees this note in their wallet.</small>
      </label>

      <div className="balance-preview">
        <div>
          <span className="muted">Current balance</span>
          <strong>{formatRupees(account.balance)}</strong>
        </div>
        <span aria-hidden="true">→</span>
        <div>
          <span className="muted">New balance</span>
          <strong className="positive">{formatRupees(account.balance + value)}</strong>
        </div>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <div className="actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Adding…" : value ? `Add ${formatRupees(value)}` : "Add credits"}
        </button>
      </div>
    </form>
  );
}
