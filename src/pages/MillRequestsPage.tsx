import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { errorText } from "../api/client";
import {
  approveMill,
  listApplications,
  MILL_REQUESTS_CHANGED,
  rejectMill,
  STATUS_LABEL,
  type ApprovalCounts,
  type ApprovalStatus,
  type MillApplication,
} from "../api/millApprovals";
import { Modal } from "../components/Modal";
import { formatIstDateTime } from "../utils/format";

type Tab = ApprovalStatus | "all";
type Open = { kind: "approve" | "reject"; app: MillApplication } | null;

const TABS: { value: Tab; label: string }[] = [
  { value: "PENDING_APPROVAL", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "all", label: "All" },
];

const STATUS_BADGE: Record<ApprovalStatus, string> = {
  PENDING_APPROVAL: "badge-amber",
  APPROVED: "badge-green",
  REJECTED: "badge-red",
};

const QUICK_REASONS = [
  "GST number could not be verified.",
  "Mill details are incomplete or incorrect.",
  "This mill is already registered.",
];

const EMPTY_TEXT: Record<Tab, string> = {
  PENDING_APPROVAL: "No mill registrations are waiting for approval.",
  APPROVED: "No approved mills yet.",
  REJECTED: "No rejected registrations.",
  all: "No mills have registered yet.",
};

const searchText = (a: MillApplication): string =>
  [
    ...Object.values(a.mill),
    a.admin?.name ?? "",
    a.admin?.username ?? "",
    a.admin?.mobile ?? "",
    a.admin?.email ?? "",
  ]
    .join(" ")
    .toLowerCase();

function Detail({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="detail">
      <dt>{label}</dt>
      <dd>{href ? <a href={href}>{value}</a> : value}</dd>
    </div>
  );
}

function Decision({ app }: { app: MillApplication }) {
  if (app.status === "PENDING_APPROVAL") return null;
  if (!app.reviewedAt) {
    return <p className="muted decision">Registered before mill approval was introduced.</p>;
  }
  const who = app.reviewedBy ? `by ${app.reviewedBy.name}` : "from the email link";
  return (
    <div className={`decision ${app.status === "REJECTED" ? "decision-rejected" : ""}`}>
      <span className="muted">
        {STATUS_LABEL[app.status]} {who} on {formatIstDateTime(app.reviewedAt)}
      </span>
      {app.rejectionReason && (
        <p>
          <strong>Reason:</strong> {app.rejectionReason}
        </p>
      )}
    </div>
  );
}

function ApplicationCard({ app, onOpen }: { app: MillApplication; onOpen: (open: Open) => void }) {
  return (
    <article className="card application">
      <header className="application-header">
        <div>
          <h2>{app.mill.name}</h2>
          <div className="application-meta">
            <span className="badge badge-gray mono">{app.mill.code}</span>
            <span className={`badge ${STATUS_BADGE[app.status]}`}>{STATUS_LABEL[app.status]}</span>
            <span className="muted">{app.mill.location}</span>
          </div>
        </div>
        <span className="muted">Submitted {formatIstDateTime(app.submittedAt)}</span>
      </header>

      <div className="application-body">
        <section>
          <h3>Mill details</h3>
          <dl>
            <Detail label="GST number" value={app.mill.gstNumber} />
            <Detail label="Contact person" value={app.mill.contactPerson} />
            <Detail label="Phone" value={app.mill.phone} href={`tel:${app.mill.phone}`} />
            <Detail label="Mill email" value={app.mill.email} href={`mailto:${app.mill.email}`} />
          </dl>
        </section>
        <section>
          <h3>Mill admin account</h3>
          {app.admin ? (
            <dl>
              <Detail label="Name" value={app.admin.name} />
              <Detail label="Username" value={app.admin.username} />
              <Detail label="Mobile" value={app.admin.mobile} href={`tel:${app.admin.mobile}`} />
              <Detail label="Email" value={app.admin.email} href={`mailto:${app.admin.email}`} />
            </dl>
          ) : (
            <p className="muted">No admin account found.</p>
          )}
        </section>
      </div>

      <Decision app={app} />

      {app.status === "PENDING_APPROVAL" && (
        <footer className="application-actions">
          <button type="button" className="btn btn-danger" onClick={() => onOpen({ kind: "reject", app })}>
            Reject
          </button>
          <button type="button" className="btn btn-success" onClick={() => onOpen({ kind: "approve", app })}>
            Approve
          </button>
        </footer>
      )}
    </article>
  );
}

function ApproveForm({ app, onDone, onCancel }: { app: MillApplication; onDone: (app: MillApplication) => void; onCancel: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const approve = async () => {
    setSaving(true);
    setError(null);
    try {
      onDone(await approveMill(app.millId));
    } catch (err) {
      setError(errorText(err));
      setSaving(false);
    }
  };

  return (
    <div className="form">
      <p>
        Approve <strong>{app.mill.name}</strong> ({app.mill.code})?
      </p>
      <p className="muted">
        {app.admin ? (
          <>
            <strong>{app.admin.username}</strong> can sign in to the mill portal right away
          </>
        ) : (
          "The mill admin can sign in right away"
        )}{" "}
        and gets an email. Traders can then request to join this mill.
      </p>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <div className="actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="button" className="btn btn-success" onClick={() => void approve()} disabled={saving}>
          {saving ? "Approving…" : "Approve mill"}
        </button>
      </div>
    </div>
  );
}

function RejectForm({ app, onDone, onCancel }: { app: MillApplication; onDone: (app: MillApplication) => void; onCancel: () => void }) {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const problem = reason.trim().length < 3 ? "Please give a reason (at least 3 characters)." : null;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (problem || saving) return;

    setSaving(true);
    setError(null);
    try {
      onDone(await rejectMill(app.millId, reason.trim()));
    } catch (err) {
      setError(errorText(err));
      setSaving(false);
    }
  };

  return (
    <form className="form" onSubmit={(e) => void onSubmit(e)} noValidate>
      <p>
        Reject <strong>{app.mill.name}</strong> ({app.mill.code})?
      </p>
      <label className={`field ${touched && problem ? "has-error" : ""}`}>
        <span>Reason</span>
        <textarea
          autoFocus
          rows={3}
          maxLength={500}
          value={reason}
          onChange={(e) => {
            setReason(e.target.value);
            setError(null);
          }}
          onBlur={() => setTouched(true)}
          placeholder="e.g. GST number does not match the mill name"
        />
        {touched && problem ? (
          <small className="error">{problem}</small>
        ) : (
          <small className="muted">The applicant sees this reason in their email and can register again.</small>
        )}
      </label>
      <div className="chips" aria-label="Common reasons">
        {QUICK_REASONS.map((quick) => (
          <button
            key={quick}
            type="button"
            className={`chip ${reason === quick ? "chip-active" : ""}`}
            onClick={() => {
              setReason(quick);
              setTouched(true);
            }}
          >
            {quick}
          </button>
        ))}
      </div>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <div className="actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="btn btn-danger-solid" disabled={saving}>
          {saving ? "Rejecting…" : "Reject registration"}
        </button>
      </div>
    </form>
  );
}

export default function MillRequestsPage() {
  const [tab, setTab] = useState<Tab>("PENDING_APPROVAL");
  const [items, setItems] = useState<MillApplication[]>([]);
  const [counts, setCounts] = useState<ApprovalCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<Open>(null);

  const load = useCallback(async (status: Tab) => {
    setLoading(true);
    setError(null);
    try {
      const result = await listApplications(status);
      setItems(result.items);
      setCounts(result.counts);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(tab);
  }, [load, tab]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  const shown = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? items.filter((a) => searchText(a).includes(term)) : items;
  }, [items, search]);

  const onDecided = (app: MillApplication) => {
    setOpen(null);
    setNotice(
      app.status === "APPROVED"
        ? `${app.mill.name} is approved. The mill admin has been emailed and can sign in now.`
        : `${app.mill.name} is rejected. The applicant has been emailed the reason.`,
    );
    window.dispatchEvent(new Event(MILL_REQUESTS_CHANGED));
    void load(tab);
  };

  const tabLabel = (t: (typeof TABS)[number]) =>
    t.value !== "all" && counts ? `${t.label} (${counts[t.value]})` : t.label;

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Mill Requests</h1>
          <p className="muted">
            New mills register on the mill portal and wait here. The mill admin can sign in only after you approve.
          </p>
        </div>
        <button type="button" className="btn" onClick={() => void load(tab)} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {notice && <div className="alert alert-success" role="status">{notice}</div>}
      {error && (
        <div className="alert alert-error">
          {error}{" "}
          <button type="button" className="link" onClick={() => void load(tab)}>Retry</button>
        </div>
      )}

      <div className="toolbar">
        <div className="segmented" role="tablist" aria-label="Status">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              role="tab"
              aria-selected={tab === t.value}
              className={tab === t.value ? "active" : ""}
              onClick={() => setTab(t.value)}
            >
              {tabLabel(t)}
            </button>
          ))}
        </div>
        <input
          className="search"
          placeholder="Search mill, code, GST, admin, mobile…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading && items.length === 0 ? (
        <div className="card"><p className="empty">Loading mill registrations…</p></div>
      ) : shown.length === 0 ? (
        <div className="card">
          <p className="empty">{items.length === 0 ? EMPTY_TEXT[tab] : "No registrations match your search."}</p>
        </div>
      ) : (
        <div className="applications">
          {shown.map((app) => <ApplicationCard key={app.millId} app={app} onOpen={setOpen} />)}
        </div>
      )}

      {open?.kind === "approve" && (
        <Modal title="Approve mill" onClose={() => setOpen(null)} small>
          <ApproveForm app={open.app} onDone={onDecided} onCancel={() => setOpen(null)} />
        </Modal>
      )}
      {open?.kind === "reject" && (
        <Modal title="Reject mill registration" onClose={() => setOpen(null)} small>
          <RejectForm app={open.app} onDone={onDecided} onCancel={() => setOpen(null)} />
        </Modal>
      )}
    </section>
  );
}
