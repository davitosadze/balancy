"use client";

import Link from "next/link";
import { AlertCircle, Clock } from "lucide-react";
import clsx from "clsx";
import type { Loan, Repayment } from "@/lib/types";
import { useLangStore } from "@/lib/i18n";
import { formatAmount } from "@/lib/utils/currency";
import { formatDate, isOverdue, dueDateLabel } from "@/lib/utils/date";
import { calculateLoanFinancials } from "@/lib/utils/interest";

interface Props {
  loan: Loan;
  repayments?: Repayment[];
  hideAmounts?: boolean;
  onRepay?: () => void;
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default function LoanCard({
  loan,
  repayments = [],
  hideAmounts,
  onRepay,
}: Props) {
  const { t } = useLangStore();
  const overdue = loan.status !== "paid" && isOverdue(loan.due_date);
  const isLent = loan.type === "lent";
  const isPaid = loan.status === "paid";
  const isPartial = loan.status === "partially_paid";
  const financials = calculateLoanFinancials(loan, repayments);
  const hasInterest = financials.interest > 0;

  return (
    <Link href={`/loans/${loan.id}`}>
      <div
        className={clsx(
          "group relative overflow-hidden rounded-2xl bg-white border border-neutral-200 shadow-sm transition-colors duration-150",
          "hover:border-neutral-300 hover:bg-neutral-50/50",
          overdue && "bg-amber-50/70",
        )}>
        {/* accent bar */}
        <div
          className={clsx(
            "absolute left-0 top-0 bottom-0 w-[3px]",
            isPaid
              ? "bg-neutral-200"
              : overdue
                ? "bg-amber-400"
                : isLent
                  ? "bg-blue-600"
                  : "bg-red-400",
          )}
        />

        <div className="pl-5 pr-4 py-4 flex items-center gap-3">
          {/* Avatar */}
          <div
            className={clsx(
              "w-10 h-10 rounded-xl flex items-center justify-center text-[12px] font-bold shrink-0",
              isPaid
                ? "bg-neutral-100 text-neutral-400"
                : isLent
                  ? "bg-blue-50 text-blue-700"
                  : "bg-red-50 text-red-600",
            )}>
            {initials(loan.contact_name)}
          </div>

          {/* Main info */}
          <div className="flex-1 min-w-0">
            {/* Row 1: name + type badge */}
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className={clsx(
                  "font-semibold text-[14px] truncate",
                  isPaid ? "text-neutral-400" : "text-neutral-900",
                )}>
                {loan.contact_name}
              </span>
              <span
                className={clsx(
                  "shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-wide",
                  isLent
                    ? "bg-blue-50 text-blue-700"
                    : "bg-red-50 text-red-600",
                )}>
                {isLent ? t("loan_lent_badge") : t("loan_borrowed_badge")}
              </span>
              {!!loan.archived && (
                <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-wide bg-neutral-100 text-neutral-400">
                  {t("loan_archived_badge")}
                </span>
              )}
            </div>

            {/* Row 2: date + due */}
            <div className="flex items-center gap-2 text-[12px] text-neutral-400">
              <span>{formatDate(loan.loan_date)}</span>
              {loan.due_date && (
                <>
                  <span className="text-neutral-200">·</span>
                  <span
                    className={clsx(
                      "flex items-center gap-0.5",
                      overdue
                        ? "text-amber-600 font-semibold"
                        : "text-neutral-400",
                    )}>
                    {overdue ? (
                      <AlertCircle size={11} className="shrink-0" />
                    ) : (
                      <Clock size={10} className="shrink-0" />
                    )}
                    {dueDateLabel(loan.due_date)}
                  </span>
                </>
              )}
              {loan.notes && (
                <>
                  <span className="text-neutral-200">·</span>
                  <span className="truncate max-w-[120px] text-neutral-400 italic">
                    {loan.notes}
                  </span>
                </>
              )}
            </div>

            {(hasInterest || financials.paid > 0 || isPartial) && (
              <div className="mt-2 max-w-[360px] space-y-1.5">
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-medium text-neutral-500">
                  {hasInterest && (
                    <span>
                      Interest {formatAmount(financials.interest, loan.currency)}
                    </span>
                  )}
                  {financials.paid > 0 && (
                    <span>
                      Paid {formatAmount(financials.paid, loan.currency)}
                    </span>
                  )}
                  {!isPaid && (
                    <span>
                      Left{" "}
                      {formatAmount(financials.remaining, loan.currency)}
                    </span>
                  )}
                </div>
                {financials.paid > 0 && (
                  <div className="h-1 bg-neutral-100 rounded-full overflow-hidden w-full max-w-[180px]">
                    <div
                      className={clsx(
                        "h-full rounded-full",
                        financials.progress >= 100
                          ? "bg-emerald-500"
                          : "bg-blue-500",
                      )}
                      style={{ width: `${financials.progress}%` }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Amount + status */}
          <div className="text-right shrink-0 ml-2 flex flex-col items-end gap-1">
            <div
              className={clsx(
                "font-bold text-[15px] tabular-nums",
                isPaid
                  ? "text-neutral-400 line-through decoration-neutral-300"
                  : isLent
                    ? "text-blue-700"
                    : "text-red-600",
              )}>
              {hideAmounts
                ? "••••"
                : formatAmount(financials.totalDue, loan.currency)}
            </div>
            {hasInterest && !hideAmounts && (
              <p className="text-[11px] font-medium text-neutral-400">
                incl. interest
              </p>
            )}
            <div className="flex items-center gap-1.5">
              <StatusPill status={loan.status} overdue={overdue} />
              {!isPaid && onRepay && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onRepay();
                  }}
                  title="Log repayment"
                  className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 flex items-center justify-center transition-colors text-[14px] font-bold leading-none">
                  +
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function StatusPill({
  status,
  overdue,
}: {
  status: Loan["status"];
  overdue: boolean;
}) {
  if (status === "paid") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg">
        ✓ Paid
      </span>
    );
  }
  if (overdue) {
    return (
      <span className="inline-flex items-center text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg">
        Overdue
      </span>
    );
  }
  if (status === "partially_paid") {
    return (
      <span className="inline-flex items-center text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg">
        Partial
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-[11px] font-semibold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-lg">
      Active
    </span>
  );
}
