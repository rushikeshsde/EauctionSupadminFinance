// Purpose: Date and number helpers. All dates are entered and shown in India time (IST).

const IST_OFFSET = "+05:30";

/** `YYYY-MM-DDTHH:mm` from a datetime-local input (IST) -> ISO string (UTC). */
export const istInputToIso = (value: string): string => new Date(`${value}:00${IST_OFFSET}`).toISOString();

/** ISO string -> `YYYY-MM-DDTHH:mm` for a datetime-local input, in IST. */
export const isoToIstInput = (iso: string): string => {
  const ist = new Date(new Date(iso).getTime() + 5.5 * 60 * 60 * 1000);
  return ist.toISOString().slice(0, 16);
};

const dateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export const formatIstDateTime = (iso: string): string => dateTimeFormatter.format(new Date(iso));

const rupeeFormatter = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatRupees = (value: string | number): string => `₹${rupeeFormatter.format(Number(value))}`;

export const SUGAR_GRADES = ["M30", "S30", "L30", "S1", "S2", "M", "L", "SS", "SSS", "L31", "M31"];

export const INDIAN_STATES = [
  "Andhra Pradesh", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Odisha", "Punjab", "Rajasthan", "Tamil Nadu", "Telangana",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

/** Current and recent sugar seasons, e.g. "2025-26". */
export const productionSeasons = (): string[] => {
  const now = new Date();
  // A season runs Oct–Sep; from October the new season has started.
  const startYear = now.getMonth() >= 9 ? now.getFullYear() : now.getFullYear() - 1;
  return [startYear + 1, startYear, startYear - 1, startYear - 2].map(
    (y) => `${y}-${String((y + 1) % 100).padStart(2, "0")}`,
  );
};

/** Like formatRupees but without ".00" on whole amounts (₹10,00,000). */
export const formatRupeesShort = (value: string | number): string => formatRupees(value).replace(/\.00$/, "");
