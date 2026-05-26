import {
  format,
  formatDistanceToNow,
  isPast,
  isToday,
  isTomorrow,
} from "date-fns";

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return format(new Date(dateStr), "MMM d, yyyy");
}

export function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return format(new Date(dateStr), "dd/MM/yyyy");
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
  if (isPast(d)) return `${formatDistanceToNow(d)} ago`;
  return formatDistanceToNow(d, { addSuffix: true });
}
