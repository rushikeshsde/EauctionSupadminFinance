import { useState, type FormEvent } from "react";
import { ApiError, errorText } from "../api/client";
import type { TenderReport, TenderReportInput } from "../api/tenderReports";
import { INDIAN_STATES, SUGAR_GRADES, istInputToIso, isoToIstInput, productionSeasons } from "../utils/format";

type FormValues = {
  millName: string;
  millCode: string;
  state: string;
  district: string;
  grade: string;
  productionSeason: string;
  basicRate: string;
  tenderOpenDate: string; // datetime-local, IST
  tenderCloseDate: string;
};

type Errors = Partial<Record<keyof FormValues, string>>;

const emptyValues = (): FormValues => ({
  millName: "",
  millCode: "",
  state: "Maharashtra",
  district: "",
  grade: "M30",
  productionSeason: productionSeasons()[1] ?? "",
  basicRate: "",
  tenderOpenDate: "",
  tenderCloseDate: "",
});

const fromReport = (r: TenderReport): FormValues => ({
  millName: r.millName,
  millCode: r.millCode,
  state: r.state,
  district: r.district,
  grade: r.grade,
  productionSeason: r.productionSeason,
  basicRate: String(Number(r.basicRate)),
  tenderOpenDate: isoToIstInput(r.tenderOpenDate),
  tenderCloseDate: isoToIstInput(r.tenderCloseDate),
});

// Same limits as the backend (tender-update.validation.ts).
const validate = (v: FormValues): Errors => {
  const e: Errors = {};
  const need = (key: keyof FormValues, label: string, max: number) => {
    const value = v[key].trim();
    if (!value) e[key] = `${label} is required.`;
    else if (value.length > max) e[key] = `${label} must be at most ${max} characters.`;
  };
  need("millName", "Mill name", 150);
  need("millCode", "Mill code", 20);
  need("state", "State", 100);
  need("district", "District", 100);
  need("grade", "Grade", 20);
  need("productionSeason", "Production season", 50);

  const rate = Number(v.basicRate);
  if (!v.basicRate.trim()) e.basicRate = "Basic rate is required.";
  else if (!Number.isFinite(rate) || rate <= 0) e.basicRate = "Basic rate must be greater than 0.";
  else if (Math.abs(rate * 100 - Math.round(rate * 100)) > 1e-6) e.basicRate = "Use at most 2 decimals.";

  if (!v.tenderOpenDate) e.tenderOpenDate = "Open date is required.";
  if (!v.tenderCloseDate) e.tenderCloseDate = "Close date is required.";
  if (v.tenderOpenDate && v.tenderCloseDate && v.tenderCloseDate <= v.tenderOpenDate) {
    e.tenderCloseDate = "Close date must be after the open date.";
  }
  return e;
};

interface Props {
  report: TenderReport | null; // null = add new
  onSave: (input: TenderReportInput) => Promise<void>;
  onCancel: () => void;
}

export function TenderReportForm({ report, onSave, onCancel }: Props) {
  const [values, setValues] = useState<FormValues>(() => (report ? fromReport(report) : emptyValues()));
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof FormValues) => (value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setFormError("Please fix the highlighted fields.");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      await onSave({
        millName: values.millName.trim(),
        millCode: values.millCode.trim().toUpperCase(),
        state: values.state.trim(),
        district: values.district.trim(),
        grade: values.grade.trim(),
        productionSeason: values.productionSeason.trim(),
        basicRate: Number(values.basicRate),
        tenderOpenDate: istInputToIso(values.tenderOpenDate),
        tenderCloseDate: istInputToIso(values.tenderCloseDate),
      });
    } catch (err) {
      // Show backend field errors under the matching input when possible.
      if (err instanceof ApiError && err.errors.length > 0) {
        const mapped: Errors = {};
        for (const item of err.errors) {
          if (item.field && item.field in values) mapped[item.field as keyof FormValues] = item.message;
        }
        setErrors(mapped);
      }
      setFormError(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const field = (
    key: keyof FormValues,
    label: string,
    input: React.ReactNode,
    hint?: string,
  ) => (
    <label className={`field ${errors[key] ? "has-error" : ""}`}>
      <span>{label}</span>
      {input}
      {errors[key] ? <small className="error">{errors[key]}</small> : hint ? <small className="muted">{hint}</small> : null}
    </label>
  );

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="form" noValidate>
      <div className="grid">
        {field("millName", "Mill name",
          <input value={values.millName} onChange={(e) => set("millName")(e.target.value)} placeholder="Shree Chhatrapati SSK Ltd" />)}
        {field("millCode", "Mill code",
          <input value={values.millCode} onChange={(e) => set("millCode")(e.target.value.toUpperCase())} placeholder="SCSSK" />)}
        {field("state", "State",
          <>
            <input list="states" value={values.state} onChange={(e) => set("state")(e.target.value)} />
            <datalist id="states">{INDIAN_STATES.map((s) => <option key={s} value={s} />)}</datalist>
          </>)}
        {field("district", "District",
          <input value={values.district} onChange={(e) => set("district")(e.target.value)} placeholder="Pune" />)}
        {field("grade", "Grade",
          <>
            <input list="grades" value={values.grade} onChange={(e) => set("grade")(e.target.value)} />
            <datalist id="grades">{SUGAR_GRADES.map((g) => <option key={g} value={g} />)}</datalist>
          </>, "Pick from the list or type another grade")}
        {field("productionSeason", "Production season",
          <>
            <input list="seasons" value={values.productionSeason} onChange={(e) => set("productionSeason")(e.target.value)} placeholder="2025-26" />
            <datalist id="seasons">{productionSeasons().map((s) => <option key={s} value={s} />)}</datalist>
          </>)}
        {field("basicRate", "Basic rate (₹)",
          <input type="number" inputMode="decimal" step="0.01" min="0.01" value={values.basicRate}
            onChange={(e) => set("basicRate")(e.target.value)} placeholder="3650" />)}
        <div />
        {field("tenderOpenDate", "Tender open (IST)",
          <input type="datetime-local" value={values.tenderOpenDate} onChange={(e) => set("tenderOpenDate")(e.target.value)} />)}
        {field("tenderCloseDate", "Tender close (IST)",
          <input type="datetime-local" value={values.tenderCloseDate} min={values.tenderOpenDate || undefined}
            onChange={(e) => set("tenderCloseDate")(e.target.value)} />)}
      </div>

      {formError && <div className="alert alert-error" role="alert">{formError}</div>}

      <div className="actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Saving…" : report ? "Save changes" : "Add tender report"}
        </button>
      </div>
    </form>
  );
}
