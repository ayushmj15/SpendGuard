const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const FULL_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAYS = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/** "Aug 5" */
export function formatShort(date: Date | string): string {
  const d = toDate(date);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "Aug 5, 2026" */
export function formatMedium(date: Date | string): string {
  const d = toDate(date);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/** "5 Aug 2026" */
export function formatDayFirst(date: Date | string): string {
  const d = toDate(date);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "August 2026" */
export function formatMonthYear(date: Date | string): string {
  const d = toDate(date);
  return `${FULL_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Today" / "Yesterday" / "Aug 3" */
export function formatRelative(date: Date | string): string {
  const d = toDate(date);
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startD = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startToday - startD) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return formatShort(d);
}

/** Time of day, e.g. "1:20 PM" */
export function formatTime(date: Date | string): string {
  const d = toDate(date);
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
}

/** yyyy-mm-dd */
export function toISODate(date: Date | string): string {
  const d = toDate(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function weekdayShort(date: Date | string): string {
  return DAYS_SHORT[toDate(date).getDay()];
}

export { MONTHS, FULL_MONTHS, DAYS, DAYS_SHORT };
