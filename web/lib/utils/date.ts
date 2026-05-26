import {
  format,
  isToday,
  isTomorrow,
  isPast,
  formatDistanceToNow,
} from "date-fns";

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return format(new Date(dateStr), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

export function isOverdue(dueDateStr: string | null | undefined): boolean {
  if (!dueDateStr) return false;
  const d = new Date(dueDateStr);
  return isPast(d) && !isToday(d);
}

export function dueDateLabel(dueDateStr: string | null | undefined): string {
  if (!dueDateStr) return "";
  const d = new Date(dueDateStr);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  if (isPast(d)) return formatDistanceToNow(d, { addSuffix: true });
  return `in ${formatDistanceToNow(d)}`;
}
