"use client";

import { useEffect, useMemo, useState } from "react";
import type { ElementType } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  Eye,
  EyeOff,
  Search,
  AlertTriangle,
  Clock,
  Download,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import clsx from "clsx";
import { useAuthStore } from "@/lib/store/auth";
import { useLoansStore } from "@/lib/store/loans";
import { useLangStore } from "@/lib/i18n";
import LoanCard from "@/components/loans/LoanCard";
import AddRepaymentModal from "@/components/loans/AddRepaymentModal";
import { formatAmount } from "@/lib/utils/currency";
import { calculateLoanFinancials } from "@/lib/utils/interest";
import type { Loan, Repayment } from "@/lib/types";

type FilterType = "all" | "lent" | "borrowed";

export default function LoansPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, user } = useAuthStore();
  const {
    loans,
    repayments,
    isLoading,
    loadLoans,
    loadAllRepayments,
    getStats,
  } = useLoansStore();
  const { t } = useLangStore();

  const [hideAmounts, setHideAmounts] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState(searchParams.get("contact") ?? "");
  const [hidePaid, setHidePaid] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
  const [quickRepayLoan, setQuickRepayLoan] = useState<Loan | null>(null);

  useEffect(() => {
    if (token) {
      loadLoans(token);
      loadAllRepayments(token);
    }
  }, [token, loadLoans, loadAllRepayments]);

  const stats = getStats();

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const in14Days = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split("T")[0];
  }, []);

  const overdueLoans = useMemo(
    () =>
      loans.filter(
        (l) =>
          !l.archived &&
          l.status !== "paid" &&
          l.due_date &&
          l.due_date < today,
      ),
    [loans, today],
  );

  const dueSoonLoans = useMemo(
    () =>
      loans.filter(
        (l) =>
          !l.archived &&
          l.status !== "paid" &&
          l.due_date &&
          l.due_date >= today &&
          l.due_date <= in14Days,
      ),
    [loans, today, in14Days],
  );

  // Loan IDs whose repayment notes match the search query
  const repaymentMatchIds = useMemo(() => {
    if (!search.trim()) return new Set<string>();
    const q = search.toLowerCase();
    const ids = new Set<string>();
    for (const [loanId, reps] of Object.entries(repayments)) {
      if (reps.some((r) => r.notes?.toLowerCase().includes(q))) {
        ids.add(loanId);
      }
    }
    return ids;
  }, [repayments, search]);

  const filtered = useMemo(() => {
    let list = loans;
    if (showArchived) {
      list = list.filter((l) => l.archived);
    } else {
      list = list.filter((l) => !l.archived);
    }
    if (filter !== "all") list = list.filter((l) => l.type === filter);
    if (hidePaid) list = list.filter((l) => l.status !== "paid");
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.contact_name.toLowerCase().includes(q) ||
          l.amount.toString().includes(q) ||
          (l.notes ?? "").toLowerCase().includes(q) ||
          repaymentMatchIds.has(String(l.id)),
      );
    }
    return list;
  }, [loans, filter, search, hidePaid, showArchived, repaymentMatchIds]);

  const activeLoans = filtered.filter((l) => l.status !== "paid");
  const paidLoans = filtered.filter((l) => l.status === "paid");

  const firstName = user?.first_name ?? user?.email?.split("@")[0] ?? "there";
  const availableCurrencies = stats.byCurrency;
  const activeCurrency =
    availableCurrencies.find((c) => c.currency === selectedCurrency) ??
    availableCurrencies[0] ??
    null;
  const totalOutstanding = activeCurrency
    ? activeCurrency.outstandingLent + activeCurrency.outstandingBorrowed
    : 0;
  const netOutstanding = activeCurrency
    ? activeCurrency.outstandingLent - activeCurrency.outstandingBorrowed
    : 0;

  const exportCSV = () => {
    const headers = [
      "Contact",
      "Type",
      "Amount",
      "Currency",
      "Loan Date",
      "Due Date",
      "Status",
      "Interest Rate",
      "Notes",
    ];
    const rows = loans.map((l) => [
      l.contact_name,
      l.type,
      String(l.amount),
      l.currency,
      l.loan_date,
      l.due_date ?? "",
      l.status,
      l.interest_rate != null ? String(l.interest_rate) : "",
      (l.notes ?? "").replace(/,/g, ";"),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `loans-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
      <section className="soft-hero dashboard-hero rounded-[32px]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="dashboard-kicker">
              {t("loans_dashboard_header")}
            </p>
            <h1 className="dashboard-title">
              {t("loans_title_hi", { name: firstName })}
            </h1>
            <p className="dashboard-subtitle">
              {t("loans_dashboard_subtitle")}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <HeroPill icon={ArrowUpRight} label={t("balance_lent_out")} />
              <HeroPill icon={ArrowDownLeft} label={t("balance_borrowed")} />
              <HeroPill icon={Clock} label={t("loans_due_label")} />
            </div>
          </div>
          <div className="soft-card w-full rounded-2xl p-4 lg:max-w-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-400">
                  {t("loans_today_focus")}
                </p>
                <p className="mt-2 text-2xl font-semibold text-neutral-950">
                  {overdueLoans.length + dueSoonLoans.length}
                </p>
                <p className="mt-1 text-sm text-neutral-500">
                  {overdueLoans.length > 0
                    ? t("loans_overdue_plural", { n: overdueLoans.length })
                    : t("loans_due_soon_plural", { n: dueSoonLoans.length })}
                </p>
              </div>
              <div
                className={clsx(
                  "flex h-11 w-11 items-center justify-center rounded-xl",
                  overdueLoans.length > 0
                    ? "bg-red-50 text-red-600"
                    : "bg-amber-50 text-amber-600",
                )}>
                {overdueLoans.length > 0 ? (
                  <AlertTriangle size={19} />
                ) : (
                  <Clock size={19} />
                )}
              </div>
            </div>
            <div className="mt-4 grid gap-2">
              <button
                onClick={() => router.push("/loans/new")}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-600/15 transition hover:bg-blue-700">
                <Plus size={15} />
                {t("btn_new_loan")}
              </button>
              <div className="grid grid-cols-2 gap-2">
                {loans.length > 0 && (
                  <button
                    onClick={exportCSV}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white/80 px-3 text-xs font-semibold text-neutral-700 shadow-sm transition hover:bg-white">
                    <Download size={14} />
                    {t("btn_export_csv")}
                  </button>
                )}
                <button
                  onClick={() => setHideAmounts((v) => !v)}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white/80 px-3 text-xs font-semibold text-neutral-700 shadow-sm transition hover:bg-white">
                  {hideAmounts ? <EyeOff size={14} /> : <Eye size={14} />}
                  {hideAmounts ? t("btn_show_paid") : t("btn_hide_paid")}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <OverviewStatCard
            label={t("loans_count_plural", { n: stats.totalLoans })}
            value={`${stats.totalLoans}`}
          />
          <OverviewStatCard
            label={t("loans_active_section", { n: activeLoans.length })}
            value={`${activeLoans.length}`}
          />
          <OverviewStatCard
            label={
              overdueLoans.length > 0
                ? t("loans_overdue_plural", { n: overdueLoans.length })
                : t("loans_due_soon_plural", { n: dueSoonLoans.length })
            }
            value={`${overdueLoans.length + dueSoonLoans.length}`}
            accent={overdueLoans.length > 0 ? "text-red-600" : "text-amber-600"}
          />
          <OverviewStatCard
            label={
              stats.byCurrency.length > 1
                ? `${stats.byCurrency.length} currencies`
                : `${stats.byCurrency[0]?.currency ?? "—"}`
            }
            value={
              stats.byCurrency.length > 1
                ? t("balance_net")
                : (stats.byCurrency[0]?.currency ?? "—")
            }
            accent="text-neutral-950"
          />
        </div>
      </section>

      {!showArchived &&
        (overdueLoans.length > 0 || dueSoonLoans.length > 0) && (
          <div className="grid gap-3 md:grid-cols-2">
            {overdueLoans.length > 0 && (
              <LoanAlertCard
                icon={AlertTriangle}
                tone="danger"
                title={t(
                  overdueLoans.length !== 1
                    ? "loans_overdue_plural"
                    : "loans_overdue",
                  { n: overdueLoans.length },
                )}
                loans={overdueLoans}
              />
            )}
            {dueSoonLoans.length > 0 && (
              <LoanAlertCard
                icon={Clock}
                tone="warning"
                title={t(
                  dueSoonLoans.length !== 1
                    ? "loans_due_soon_plural"
                    : "loans_due_soon",
                  { n: dueSoonLoans.length },
                )}
                loans={dueSoonLoans}
              />
            )}
          </div>
        )}

      {!showArchived && activeCurrency && (
        <div className="soft-card rounded-[32px] p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-neutral-500">
                {t("loans_outstanding")}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-neutral-950">
                {hideAmounts
                  ? "••••"
                  : formatAmount(netOutstanding, activeCurrency.currency)}
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                {activeCurrency.currency} · {t("loans_total_exposure")}{" "}
                {hideAmounts
                  ? "••••"
                  : formatAmount(totalOutstanding, activeCurrency.currency)}
              </p>
            </div>
            {availableCurrencies.length > 1 && (
              <div className="flex flex-wrap items-center gap-2">
                {availableCurrencies.map((c) => {
                  const active = selectedCurrency === c.currency;
                  return (
                    <button
                      key={c.currency}
                      onClick={() => setSelectedCurrency(c.currency)}
                      className={clsx(
                        "h-9 rounded-full px-3 text-xs font-semibold transition-colors",
                        active
                          ? "bg-blue-600 text-white"
                          : "bg-white text-neutral-600 shadow-sm hover:bg-neutral-50",
                      )}>
                      {c.currency}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              {
                label: t("balance_lent_out"),
                value: activeCurrency.outstandingLent,
                color: "bg-blue-600",
              },
              {
                label: t("balance_borrowed"),
                value: activeCurrency.outstandingBorrowed,
                color: "bg-rose-500",
              },
              {
                label: t("balance_net"),
                value:
                  activeCurrency.outstandingLent -
                  activeCurrency.outstandingBorrowed,
                color:
                  activeCurrency.outstandingLent -
                    activeCurrency.outstandingBorrowed >=
                  0
                    ? "bg-emerald-500"
                    : "bg-rose-500",
              },
            ].map((item) => (
              <BalanceTile
                key={item.label}
                label={item.label}
                value={item.value}
                currency={activeCurrency.currency}
                color={item.color}
                hidden={hideAmounts}
              />
            ))}
          </div>
        </div>
      )}

      <div className="soft-card rounded-[32px] p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("loans_search_placeholder")}
              className="w-full h-11 rounded-xl border border-neutral-200 bg-white pl-11 pr-4 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-blue-500 focus:bg-white"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(["all", "lent", "borrowed"] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={clsx(
                  "rounded-xl px-4 py-2 text-[13px] font-medium transition-colors",
                  filter === f
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-neutral-600 hover:bg-white",
                )}>
                {t(
                  `loans_filter_${f}` as
                    | "loans_filter_all"
                    | "loans_filter_lent"
                    | "loans_filter_borrowed",
                )}
              </button>
            ))}
            <button
              onClick={() => setShowArchived((v) => !v)}
              className={clsx(
                "h-11 rounded-xl px-4 text-[13px] font-semibold transition-colors",
                showArchived
                  ? "bg-blue-600 text-white"
                  : "bg-white text-neutral-600 shadow-sm hover:text-neutral-900",
              )}>
              {showArchived ? t("btn_view_active") : t("btn_show_archived")}
            </button>
            <button
              onClick={() => setHidePaid((v) => !v)}
              className={clsx(
                "h-11 rounded-xl px-4 text-[13px] font-semibold transition-colors",
                hidePaid
                  ? "bg-blue-600 text-white"
                  : "bg-white text-neutral-600 shadow-sm hover:text-neutral-900",
              )}>
              {t(hidePaid ? "btn_show_paid" : "btn_hide_paid")}
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-[3px] border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          hasFilters={filter !== "all" || search.trim() !== "" || hidePaid}
        />
      ) : (
        <div className="space-y-8">
          {showArchived ? (
            <LoanSection
              title={`${t("btn_archive")} (${filtered.length})`}
              loans={filtered}
              repayments={repayments}
              hideAmounts={hideAmounts}
              onRepay={setQuickRepayLoan}
            />
          ) : (
            <>
              {activeLoans.length > 0 && (
                <LoanSection
                  title={t("loans_active_section", { n: activeLoans.length })}
                  loans={activeLoans}
                  repayments={repayments}
                  hideAmounts={hideAmounts}
                  onRepay={setQuickRepayLoan}
                />
              )}
              {!hidePaid && paidLoans.length > 0 && (
                <LoanSection
                  title={t("loans_paid_section", { n: paidLoans.length })}
                  loans={paidLoans}
                  repayments={repayments}
                  hideAmounts={hideAmounts}
                  onRepay={setQuickRepayLoan}
                />
              )}
            </>
          )}
        </div>
      )}

      {quickRepayLoan &&
        (() => {
          const loanReps = repayments[String(quickRepayLoan.id)] ?? [];
          const financials = calculateLoanFinancials(
            quickRepayLoan,
            loanReps,
          );
          return (
            <AddRepaymentModal
              loan={quickRepayLoan}
              remaining={financials.remaining}
              totalDue={financials.totalDue}
              onClose={() => setQuickRepayLoan(null)}
            />
          );
        })()}
    </div>
  );
}

function OverviewStatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="soft-card dashboard-stat rounded-2xl">
      <p className={clsx("text-2xl font-semibold", accent ?? "text-neutral-950")}>{value}</p>
      <p className="mt-2 text-sm text-neutral-500">{label}</p>
    </div>
  );
}

function HeroPill({
  icon: Icon,
  label,
}: {
  icon: ElementType;
  label: string;
}) {
  return (
    <span className="inline-flex h-9 items-center gap-2 rounded-xl border border-neutral-200 bg-white/80 px-3 text-xs font-semibold text-neutral-700 shadow-sm">
      <Icon size={14} className="text-blue-600" />
      {label}
    </span>
  );
}

function LoanAlertCard({
  icon: Icon,
  tone,
  title,
  loans,
}: {
  icon: ElementType;
  tone: "danger" | "warning";
  title: string;
  loans: Loan[];
}) {
  const visibleNames = loans.slice(0, 3);
  const hiddenCount = Math.max(0, loans.length - visibleNames.length);
  const toneClass =
    tone === "danger"
      ? {
          border: "border-red-200/80",
          icon: "bg-red-50 text-red-600 ring-red-100",
          title: "text-red-700",
          chip: "bg-red-50 text-red-700 border-red-100",
        }
      : {
          border: "border-amber-200/80",
          icon: "bg-amber-50 text-amber-600 ring-amber-100",
          title: "text-amber-700",
          chip: "bg-amber-50 text-amber-700 border-amber-100",
        };

  return (
    <div
      className={clsx(
        "group flex items-center gap-4 rounded-2xl border bg-white px-4 py-3 shadow-[0_16px_42px_-36px_rgba(15,23,42,0.45)] transition hover:-translate-y-[1px] hover:shadow-[0_20px_46px_-34px_rgba(15,23,42,0.5)]",
        toneClass.border,
      )}>
      <div
        className={clsx(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1",
          toneClass.icon,
        )}>
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className={clsx("text-sm font-semibold", toneClass.title)}>
          {title}
        </p>
        <div className="mt-2 flex min-w-0 flex-wrap gap-1.5">
          {visibleNames.map((loan) => (
            <span
              key={loan.id}
              className={clsx(
                "max-w-[180px] truncate rounded-full border px-2.5 py-1 text-xs font-semibold",
                toneClass.chip,
              )}>
              {loan.contact_name}
            </span>
          ))}
          {hiddenCount > 0 && (
            <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-semibold text-neutral-500">
              +{hiddenCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function LoanSection({
  title,
  loans,
  repayments,
  hideAmounts,
  onRepay,
}: {
  title: string;
  loans: Loan[];
  repayments: Record<string, Repayment[]>;
  hideAmounts: boolean;
  onRepay: (loan: Loan) => void;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-widest">
          {title}
        </p>
        <span className="h-px flex-1 bg-neutral-200/70 ml-4" />
      </div>
      <div className="flex flex-col gap-3">
        {loans.map((loan) => (
          <LoanCard
            key={loan.id}
            loan={loan}
            repayments={repayments[String(loan.id)] ?? []}
            hideAmounts={hideAmounts}
            onRepay={() => onRepay(loan)}
          />
        ))}
      </div>
    </section>
  );
}

function BalanceTile({
  label,
  value,
  currency,
  color,
  hidden,
}: {
  label: string;
  value: number;
  currency: string;
  color: string;
  hidden: boolean;
}) {
  return (
    <div className="soft-card rounded-2xl p-5">
      <div className={clsx("h-1.5 w-12 rounded-full", color)} />
      <p className="mt-4 text-[11px] uppercase tracking-[0.24em] text-neutral-400">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold text-neutral-950">
        {hidden ? "••••" : formatAmount(value, currency)}
      </p>
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  const router = useRouter();
  const { t } = useLangStore();
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
        <Search size={20} className="text-neutral-400" />
      </div>
      <p className="font-semibold text-neutral-800 mb-1">
        {hasFilters ? t("loans_empty_no_match") : t("loans_empty_no_loans")}
      </p>
      <p className="text-sm text-neutral-400 mb-5">
        {hasFilters ? t("loans_empty_filter_hint") : t("loans_empty_add_hint")}
      </p>
      {!hasFilters && (
        <button
          onClick={() => router.push("/loans/new")}
          className="flex items-center gap-1.5 h-9 px-4 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
          <Plus size={15} />
          {t("btn_new_loan")}
        </button>
      )}
    </div>
  );
}
