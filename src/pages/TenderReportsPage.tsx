import { useCallback, useEffect, useMemo, useState } from "react";
import { errorText } from "../api/client";
import {
  createTenderReport,
  deleteTenderReport,
  listTenderReports,
  updateTenderReport,
  type TenderReport,
  type TenderReportInput,
} from "../api/tenderReports";
import { Modal } from "../components/Modal";
import { TenderReportForm } from "../components/TenderReportForm";
import { formatIstDateTime, formatRupees } from "../utils/format";

type Editing = { mode: "add" } | { mode: "edit"; report: TenderReport } | null;

const statusOf = (r: TenderReport) => {
  const now = Date.now();
  if (now < new Date(r.tenderOpenDate).getTime()) return { label: "Upcoming", className: "badge badge-blue" };
  if (now <= new Date(r.tenderCloseDate).getTime()) return { label: "Open", className: "badge badge-green" };
  return { label: "Closed", className: "badge badge-gray" };
};

export default function TenderReportsPage() {
  const [reports, setReports] = useState<TenderReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [seasonFilter, setSeasonFilter] = useState("");
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<TenderReport | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setReports(await listTenderReports());
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
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const states = useMemo(() => [...new Set(reports.map((r) => r.state))].sort(), [reports]);
  const seasons = useMemo(() => [...new Set(reports.map((r) => r.productionSeason))].sort().reverse(), [reports]);

  const shown = useMemo(() => {
    const term = search.trim().toLowerCase();
    return reports.filter((r) => {
      if (stateFilter && r.state !== stateFilter) return false;
      if (seasonFilter && r.productionSeason !== seasonFilter) return false;
      if (!term) return true;
      return [r.millName, r.millCode, r.district, r.state, r.grade].some((v) => v.toLowerCase().includes(term));
    });
  }, [reports, search, stateFilter, seasonFilter]);

  const save = async (input: TenderReportInput) => {
    if (editing?.mode === "edit") {
      await updateTenderReport(editing.report.id, input);
      setNotice(`Updated ${input.millName}.`);
    } else {
      await createTenderReport(input);
      setNotice(`Added tender report for ${input.millName}.`);
    }
    setEditing(null);
    await load();
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await deleteTenderReport(deleting.id);
      setNotice(`Deleted ${deleting.millName}.`);
      setDeleting(null);
      await load();
    } catch (err) {
      setError(errorText(err));
      setDeleting(null);
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Tender Reports</h1>
          <p className="muted">
            Published mill tenders. Traders, committee members and mill admins see these in their apps.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setEditing({ mode: "add" })}>
          + Add tender report
        </button>
      </div>

      {notice && <div className="alert alert-success">{notice}</div>}
      {error && (
        <div className="alert alert-error">
          {error}{" "}
          <button type="button" className="link" onClick={() => void load()}>Retry</button>
        </div>
      )}

      <div className="toolbar">
        <input
          className="search"
          placeholder="Search mill, code, district, grade…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
          <option value="">All states</option>
          {states.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={seasonFilter} onChange={(e) => setSeasonFilter(e.target.value)}>
          <option value="">All seasons</option>
          {seasons.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="muted count">{shown.length} of {reports.length}</span>
      </div>

      <div className="card table-wrap">
        {loading ? (
          <p className="empty">Loading tender reports…</p>
        ) : shown.length === 0 ? (
          <div className="empty">
            <p>{reports.length === 0 ? "No tender reports yet." : "No reports match your search or filters."}</p>
            {reports.length === 0 && (
              <button type="button" className="btn btn-primary" onClick={() => setEditing({ mode: "add" })}>
                Add the first tender report
              </button>
            )}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Mill</th>
                <th>Location</th>
                <th>Grade</th>
                <th>Season</th>
                <th className="num">Basic rate</th>
                <th>Opens (IST)</th>
                <th>Closes (IST)</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => {
                const status = statusOf(r);
                return (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.millName}</strong>
                      <div className="muted mono">{r.millCode}</div>
                    </td>
                    <td>{r.district}<div className="muted">{r.state}</div></td>
                    <td>{r.grade}</td>
                    <td>{r.productionSeason}</td>
                    <td className="num">{formatRupees(r.basicRate)}</td>
                    <td>{formatIstDateTime(r.tenderOpenDate)}</td>
                    <td>{formatIstDateTime(r.tenderCloseDate)}</td>
                    <td><span className={status.className}>{status.label}</span></td>
                    <td className="row-actions">
                      <button type="button" className="btn btn-small" onClick={() => setEditing({ mode: "edit", report: r })}>Edit</button>
                      <button type="button" className="btn btn-small btn-danger" onClick={() => setDeleting(r)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <Modal title={editing.mode === "edit" ? "Edit tender report" : "Add tender report"} onClose={() => setEditing(null)}>
          <TenderReportForm
            report={editing.mode === "edit" ? editing.report : null}
            onSave={save}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}

      {deleting && (
        <Modal title="Delete tender report?" onClose={() => !deleteBusy && setDeleting(null)} small>
          <p>
            <strong>{deleting.millName}</strong> ({deleting.millCode}), {deleting.grade}, {deleting.productionSeason}{" "}
            will be removed from everyone's tender reports. This cannot be undone.
          </p>
          <div className="actions">
            <button type="button" className="btn btn-ghost" onClick={() => setDeleting(null)} disabled={deleteBusy}>Cancel</button>
            <button type="button" className="btn btn-danger" onClick={() => void confirmDelete()} disabled={deleteBusy}>
              {deleteBusy ? "Deleting…" : "Delete"}
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
