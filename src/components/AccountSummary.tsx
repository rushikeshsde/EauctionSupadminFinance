import { ROLE_LABEL, type WalletAccount } from "../api/finance";
import { formatRupees } from "../utils/format";

type OrgAccount = Pick<WalletAccount, "role" | "mill" | "firmName"> & Partial<Pick<WalletAccount, "approvedMills">>;

/** Who the wallet belongs to: mill admin → their mill; trader → firm and approved mills. */
export function AccountOrg({ account }: { account: OrgAccount }) {
  if (account.role === "MILL_ADMIN") {
    return account.mill ? (
      <>
        {account.mill.name}
        <div className="muted mono">{account.mill.code}</div>
      </>
    ) : (
      <span className="muted">No mill</span>
    );
  }

  const mills = account.approvedMills ?? [];
  return (
    <>
      {account.firmName ?? <span className="muted">No firm name</span>}
      {mills.length > 0 && (
        <div className="muted wrap" title={mills.map((m) => m.name).join(", ")}>
          Approved by: {mills.map((m) => m.name).join(", ")}
        </div>
      )}
    </>
  );
}

export function AccountSummary({ account }: { account: WalletAccount }) {
  return (
    <div className="account-summary">
      <div>
        <strong>{account.name}</strong>{" "}
        <span className={`badge ${account.role === "TRADER" ? "badge-blue" : "badge-violet"}`}>
          {ROLE_LABEL[account.role]}
        </span>
        <div className="muted">
          {account.username} · {account.mobile}
        </div>
        <div className="account-org"><AccountOrg account={account} /></div>
      </div>
      <div className="account-balance">
        <span className="muted">Balance</span>
        <strong>{formatRupees(account.balance)}</strong>
      </div>
    </div>
  );
}
