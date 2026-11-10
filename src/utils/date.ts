/**
 * Visit dates are calendar dates (no time, no timezone) stored as `YYYY-MM-DD`.
 * Always format in UTC so a date never shifts by a day depending on where the server runs.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  return (
    date.getUTCFullYear() === Number(year) &&
    date.getUTCMonth() === Number(month) - 1 &&
    date.getUTCDate() === Number(day)
  );
}

function parse(value: string): Date | null {
  return isIsoDate(value) ? new Date(`${value}T00:00:00Z`) : null;
}

const longFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const shortFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const monthFormatter = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

export function formatVisitDate(
  value: string | null,
  style: "long" | "short" | "month" = "long",
): string {
  if (!value) return "Date lost to time";
  const date = parse(value);
  if (!date) return "Date lost to time";
  const formatter =
    style === "long" ? longFormatter : style === "short" ? shortFormatter : monthFormatter;
  return formatter.format(date);
}

export function yearOf(value: string | null): number | null {
  if (!value || !isIsoDate(value)) return null;
  return Number(value.slice(0, 4));
}

export function formatDateRange(start: string | null, end: string | null): string | null {
  if (!start && !end) return null;
  if (start && end && start !== end) {
    return `${formatVisitDate(start, "short")} – ${formatVisitDate(end, "short")}`;
  }
  return formatVisitDate(start ?? end, "short");
}
