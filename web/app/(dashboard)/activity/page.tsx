"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  AlertCircle,
  Banknote,
  Activity,
  HandCoins,
  TrendingUp,
} from "lucide-react";
import clsx from "clsx";
import { useAuthStore } from "@/lib/store/auth";
import { useLoansStore } from "@/lib/store/loans";
import { useLangStore } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/translations";
import { formatAmount } from "@/lib/utils/currency";
import type { ActivityEvent } from "@/lib/types";

// ── Date helpers ─────────────────────────────────────────────────────────────

function getGroupKey(dateStr: string): "today" | "yesterday" | "this_week" | "earlier" {
  const now = new Date();
  const d = new Date(dateStr);
  const diffDays = Math.floor(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() -
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) /
      86_400_000,
  );
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays <= 7) return "this_week";
  return "earlier";
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

const GROUP_ORDER = ["today", "yesterday", "this_week", "earlier"] as const;

// ── Event styling ─────────────────────────────────────────────────────────────

interface EventStyle {
  Icon: React.ElementType;
  iconClass: string;
  ringClass: string;
  bgClass: string;
  pillClass: string;
  pillText: string;
}

function getEventConfig(event: ActivityEvent): EventStyle {
  const isLent = event.loan.type === "lent";
  switch (event.type) {
    case "loan_created":
      return isLent
        ? {
            Icon: ArrowUpRight,
            iconClass: "text-amber-600",
            ringClass: "ring-amber-100",
            bgClass: "bg-amber-50",
            pillClass: "bg-amber-50 text-amber-700",
            pillText: "Lent",
          }
        : {
            Icon: ArrowDownLeft,
            iconClass: "text-rose-500",
            ringClass: "ring-rose-100",
            bgClass: "bg-rose-50",
            pillClass: "bg-rose-50 text-rose-700",
            pillText: "Borrowed",
          };
    case "repayment_made":
      return isLent
        ? {
            Icon: Banknote,
            iconClass: "text-amber-600",
            ringClass: "ring-amber-100",
            bgClass: "bg-amber-50",
            pillClass: "bg-amber-50 text-amber-700",
            pillText: "Repayment",
          }
        : {
            Icon: Banknote,
            iconClass: "text-violet-500",
            ringClass: "ring-violet-100",
            bgClass: "bg-violet-50",
            pillClass: "bg-violet-50 text-violet-700",
            pillText: "Repaid",
          };
    case "loan_paid":
      return {
        Icon: CheckCircle2,
        iconClass: "text-amber-600",
        ringClass: "ring-amber-100",
        bgClass: "bg-amber-50",
        pillClass: "bg-amber-50 text-amber-700",
        pillText: "Settled",
      };
    case "loan_overdue":
      return {
        Icon: AlertCircle,
        iconClass: "text-amber-600",
        ringClass: "ring-amber-100",
        bgClass: "bg-amber-50",
        pillClass: "bg-amber-50 text-amber-700",
        pillText: "Overdue",
      };
  }
}

type TFn = (k: TranslationKey, v?: Record<string, string | number>) => string;

function getEventLabel(event: ActivityEvent, t: TFn): string {
  const isLent = event.loan.type === "lent";
  const amount = formatAmount(
    event.repayment ? Number(event.repayment.amount) : Number(event.loan.amount),
    event.loan.currency,
  );
  const name = event.loan.contact_name;

  switch (event.type) {
    case "loan_created":
      return isLent
        ? t("activity_event_loan_created_lent", { amount, name })
        : t("activity_event_loan_created_borrowed", { amount, name });
    case "repayment_made":
      return isLent
        ? t("activity_event_repayment_lent", { amount, name })
        : t("activity_event_repayment_borrowed", { amount, name });
    case "loan_paid":
      return isLent
        ? t("activity_event_loan_paid_lent", { amount, name })
        : t("activity_event_loan_paid_borrowed", { amount, name });
    case "loan_overdue":
      return isLent
        ? t("activity_event_loan_overdue_lent", { name })
        : t("activity_event_loan_overdue_borrowed", { name });
  }
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-4">
      <div className="w-9 h-9 rounded-full bg-neutral-100 shrink-0 animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-neutral-100 rounded-full w-2/3 animate-pulse" />
        <div className="h-2.5 bg-neutral-100 rounded-full w-1/3 animate-pulse" />
      </div>
      <div className="h-5 bg-neutral-100 rounded-full w-14 animate-pulse" />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ActivityPage() {
  const { token } = useAuthStore();
  const { isLoading, loadLoans, loadAllRepayments, getActivityFeed } =
    useLoansStore();
  const { t } = useLangStore();

  useEffect(() => {
    if (token) {
      loadLoans(token);
      loadAllRepayments(token);
    }
  }, [token]);

  const feed = getActivityFeed();

  const grouped = useMemo(() => {
    const map: Partial<Record<(typeof GROUP_ORDER)[number], ActivityEvent[]>> = {};
    for (const event of feed) {
      const key = getGroupKey(event.date);
      if (!map[key]) map[key] = [];
      map[key]!.push(event);
    }
    return map;
  }, [feed]);

  const groupLabel: Record<(typeof GROUP_ORDER)[number], string> = {
    today: t("activity_group_today"),
    yesterday: t("activity_group_yesterday"),
    this_week: t("activity_group_this_week"),
    earlier: t("activity_group_earlier"),
  };

  const totalLoansCreated = feed.filter((e) => e.type === "loan_created").length;
  const totalRepayments = feed.filter(
    (e) => e.type === "repayment_made" || e.type === "loan_paid",
  ).length;
  const totalOverdue = feed.filter((e) => e.type === "loan_overdue").length;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="soft-hero dashboard-hero mb-6 rounded-[32px]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="dashboard-kicker">
              {t("activity_title")}
            </p>
            <h1 className="dashboard-title">
              {t("activity_title")}
            </h1>
            <p className="dashboard-subtitle">
              {t("activity_subtitle")}
            </p>
          </div>
          <div className="dashboard-note text-sm">
            <p className="font-semibold text-neutral-950">Stay on top of your money flows</p>
            <p className="mt-1 text-neutral-500 text-sm">
              Track new loans, repayments, and overdue items with a modern timeline.
            </p>
          </div>
        </div>
        {!isLoading && feed.length > 0 && (
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="soft-card dashboard-stat rounded-3xl">
              <p className="text-sm text-neutral-500">Events</p>
              <p className="mt-1 text-xl font-semibold text-neutral-950">{feed.length}</p>
            </div>
            <div className="soft-card dashboard-stat rounded-3xl">
              <p className="text-sm text-neutral-500">Repayments</p>
              <p className="mt-1 text-xl font-semibold text-neutral-950">{totalRepayments}</p>
            </div>
            <div className="soft-card dashboard-stat rounded-3xl">
              <p className="text-sm text-neutral-500">Overdue</p>
              <p className="mt-1 text-xl font-semibold text-neutral-950">{totalOverdue}</p>
            </div>
          </div>
        )}
      </div>

      {/* Summary pills */}
      {!isLoading && feed.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-7">
          <div className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-white border border-neutral-200 text-[12px] font-semibold text-neutral-600">
            <Activity size={12} className="text-neutral-400" />
            {feed.length} events
          </div>
          {totalLoansCreated > 0 && (
            <div className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-amber-50 border border-amber-100 text-[12px] font-semibold text-amber-700">
              <HandCoins size={12} />
              {totalLoansCreated} loan{totalLoansCreated !== 1 ? "s" : ""}
            </div>
          )}
          {totalRepayments > 0 && (
            <div className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-amber-50 text-[12px] font-semibold text-amber-700">
              <TrendingUp size={12} />
              {totalRepayments} repayment{totalRepayments !== 1 ? "s" : ""}
            </div>
          )}
          {totalOverdue > 0 && (
            <div className="flex items-center gap-1.5 h-8 px-3 rounded-full bg-amber-50 border border-amber-100 text-[12px] font-semibold text-amber-700">
              <AlertCircle size={12} />
              {totalOverdue} overdue
            </div>
          )}
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden divide-y divide-neutral-100 shadow-sm">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && feed.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4">
            <Activity size={26} className="text-neutral-300" />
          </div>
          <p className="font-semibold text-neutral-700 text-[15px]">
            {t("activity_empty")}
          </p>
          <p className="text-sm text-neutral-400 mt-1.5 max-w-xs">
            {t("activity_empty_hint")}
          </p>
        </div>
      )}

      {/* Timeline groups */}
      {!isLoading &&
        GROUP_ORDER.filter((g) => grouped[g]).map((groupKey, gi) => (
          <section key={groupKey} className={clsx(gi > 0 && "mt-8")}>
            {/* Group header */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-widest">
                {groupLabel[groupKey]}
              </span>
              <div className="flex-1 h-px bg-neutral-150 bg-neutral-200" />
              <span className="text-[11px] text-neutral-300 tabular-nums">
                {grouped[groupKey]!.length}
              </span>
            </div>

            {/* Card */}
            <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm divide-y divide-neutral-100">
              {grouped[groupKey]!.map((event) => {
                const style = getEventConfig(event);
                const label = getEventLabel(event, t);

                return (
                  <Link
                    key={event.id}
                    href={`/loans/${event.loan.id}`}
                    className="group flex items-center gap-4 px-4 py-4 transition-colors hover:bg-neutral-50 active:bg-neutral-100">
                    {/* Icon */}
                    <div
                      className={clsx(
                        "w-9 h-9 rounded-full flex items-center justify-center shrink-0 ring-[3px]",
                        style.bgClass,
                        style.ringClass,
                      )}>
                      <style.Icon size={15} className={style.iconClass} />
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13.5px] font-medium text-neutral-800 leading-snug truncate group-hover:text-neutral-950 transition-colors">
                        {label}
                      </p>
                      {event.repayment?.notes && (
                        <p className="text-xs text-neutral-400 mt-0.5 truncate">
                          {event.repayment.notes}
                        </p>
                      )}
                    </div>

                    {/* Right: pill + date */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className={clsx(
                          "text-[10.5px] font-semibold px-2 py-0.5 rounded-full",
                          style.pillClass,
                        )}>
                        {style.pillText}
                      </span>
                      <span className="text-[11px] text-neutral-400 tabular-nums">
                        {formatShortDate(event.date)}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}

      {feed.length > 0 && <div className="h-8" />}
    </div>
  );
}
