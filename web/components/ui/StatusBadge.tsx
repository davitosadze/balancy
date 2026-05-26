import clsx from "clsx";
import type { LoanStatus } from "@/lib/types";

const CONFIG: Record<LoanStatus, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-blue-50 text-blue-700" },
  partially_paid: { label: "Partial", className: "bg-amber-50 text-amber-700" },
  paid: { label: "Paid", className: "bg-emerald-50 text-emerald-700" },
};

export default function StatusBadge({ status }: { status: LoanStatus }) {
  const { label, className } = CONFIG[status];
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold",
        className,
      )}>
      {label}
    </span>
  );
}
