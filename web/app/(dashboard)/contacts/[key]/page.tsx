"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  Clock,
  Medal,
  Phone,
  ReceiptText,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import clsx from "clsx";
import { useAuthStore } from "@/lib/store/auth";
import { useLoansStore } from "@/lib/store/loans";
import { useLangStore } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/translations";
import { formatAmount } from "@/lib/utils/currency";
import { formatDate, isOverdue } from "@/lib/utils/date";
import { calculateLoanFinancials } from "@/lib/utils/interest";
import type { Loan, Repayment } from "@/lib/types";

type ContactProfile = {
  key: string;
  name: string;
  phone: string | null;
  loans: Loan[];
  paid: number;
  active: number;
  overdue: number;
  onTime: number;
  late: number;
  totalPaid: number;
  totalDue: number;
  outstandingLent: number;
  outstandingBorrowed: number;
  score: number;
};

export default function ContactDetailPage() {
  const { key } = useParams<{ key: string }>();
  const router = useRouter();
  const decodedKey = decodeURIComponent(key);
  const { token } = useAuthStore();
  const { loans, repayments, isLoading, loadLoans, loadAllRepayments } =
    useLoansStore();
  const { t } = useLangStore();

  useEffect(() => {
    if (token) loadLoans(token).then(() => loadAllRepayments(token));
  }, [token, loadLoans, loadAllRepayments]);

  const profiles = useMemo(
    () => buildContactProfiles(loans, repayments),
    [loans, repayments],
  );
  const rankedProfiles = useMemo(
    () =>
      [...profiles].sort(
        (a, b) => b.score - a.score || b.loans.length - a.loans.length,
      ),
    [profiles],
  );
  const profile = profiles.find((item) => item.key === decodedKey) ?? null;
  const rank = profile
    ? rankedProfiles.findIndex((item) => item.key === profile.key) + 1
    : 0;

  if (isLoading && !profile) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-neutral-200 border-t-neutral-900" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10 text-center">
        <p className="text-sm text-neutral-500">{t("contact_not_found")}</p>
        <button
          onClick={() => router.replace("/contacts")}
          className="mt-4 text-sm font-semibold text-blue-600">
          {t("btn_back")}
        </button>
      </div>
    );
  }

  const behavior = getBehavior(profile, t);
  const netOutstanding = profile.outstandingLent - profile.outstandingBorrowed;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 space-y-6">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-500 transition hover:text-neutral-950">
        <ChevronLeft size={16} />
        {t("btn_back")}
      </button>

      <section className="soft-hero dashboard-hero rounded-[32px]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-lg font-bold text-blue-700">
              {initials(profile.name)}
            </div>
            <div className="min-w-0">
              <p className="dashboard-kicker">{t("contact_profile_label")}</p>
              <h1 className="dashboard-title">{profile.name}</h1>
              {profile.phone && (
                <p className="dashboard-subtitle flex items-center gap-2">
                  <Phone size={14} />
                  {profile.phone}
                </p>
              )}
            </div>
          </div>

          <div className="dashboard-note min-w-[260px]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  {t("contact_behavior_title")}
                </p>
                <p className={clsx("mt-1 text-lg font-semibold", behavior.color)}>
                  {behavior.label}
                </p>
              </div>
              <ShieldCheck size={24} className={behavior.iconColor} />
            </div>
            <p className="mt-2 text-sm text-neutral-500">{behavior.description}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={Medal}
            label={t("contact_rank")}
            value={rank ? `#${rank}` : "-"}
            hint={t("contact_score", { n: Math.round(profile.score) })}
          />
          <MetricCard
            icon={ReceiptText}
            label={t("contact_paid_back")}
            value={formatAmount(profile.totalPaid, primaryCurrency(profile))}
            hint={t("contact_on_time_late", {
              onTime: profile.onTime,
              late: profile.late,
            })}
          />
          <MetricCard
            icon={Clock}
            label={t("contact_open_loans")}
            value={`${profile.active}`}
            hint={
              profile.overdue > 0
                ? t("contacts_overdue", { n: profile.overdue })
                : t("contact_no_overdue")
            }
            danger={profile.overdue > 0}
          />
          <MetricCard
            icon={TrendingUp}
            label={t("contact_net_balance")}
            value={`${netOutstanding >= 0 ? "+" : "-"}${formatAmount(
              Math.abs(netOutstanding),
              primaryCurrency(profile),
            )}`}
            hint={
              netOutstanding >= 0
                ? t("contact_they_owe_you")
                : t("contact_you_owe_them")
            }
            danger={netOutstanding < 0}
          />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[0.9fr,1.1fr]">
        <section className="soft-card rounded-3xl p-5">
          <h2 className="text-base font-semibold text-neutral-950">
            {t("contact_payment_summary")}
          </h2>
          <div className="mt-4 space-y-3">
            <SummaryRow
              label={t("contact_total_due")}
              value={profile.totalDue}
              profile={profile}
            />
            <SummaryRow
              label={t("contact_total_paid")}
              value={profile.totalPaid}
              profile={profile}
            />
            <SummaryRow
              label={t("contacts_lent_out")}
              value={profile.outstandingLent}
              profile={profile}
              color="text-blue-700"
            />
            <SummaryRow
              label={t("contacts_borrowed")}
              value={profile.outstandingBorrowed}
              profile={profile}
              color="text-red-600"
            />
          </div>
        </section>

        <section className="soft-card rounded-3xl p-5">
          <h2 className="text-base font-semibold text-neutral-950">
            {t("contact_loan_history")}
          </h2>
          <div className="mt-4 divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
            {[...profile.loans]
              .sort((a, b) => b.loan_date.localeCompare(a.loan_date))
              .map((loan) => (
                <HistoryRow
                  key={loan.id}
                  loan={loan}
                  repayments={repayments[String(loan.id)] ?? []}
                  t={t}
                />
              ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function buildContactProfiles(
  loans: Loan[],
  repayments: Record<string, Repayment[]>,
) {
  const map = new Map<string, ContactProfile>();
  for (const loan of loans) {
    const key = loan.contact_id ?? loan.contact_name;
    const existing =
      map.get(key) ??
      ({
        key,
        name: loan.contact_name,
        phone: loan.phone,
        loans: [],
        paid: 0,
        active: 0,
        overdue: 0,
        onTime: 0,
        late: 0,
        totalPaid: 0,
        totalDue: 0,
        outstandingLent: 0,
        outstandingBorrowed: 0,
        score: 0,
      } satisfies ContactProfile);

    const loanRepayments = repayments[String(loan.id)] ?? [];
    const financials = calculateLoanFinancials(loan, loanRepayments);
    existing.loans.push(loan);
    existing.totalPaid += financials.paid;
    existing.totalDue += financials.totalDue;

    if (loan.status === "paid") {
      existing.paid++;
      if (paidOnTime(loan, loanRepayments)) existing.onTime++;
      else existing.late++;
    } else {
      existing.active++;
      if (isOverdue(loan.due_date)) existing.overdue++;
      if (loan.type === "lent") existing.outstandingLent += financials.remaining;
      else existing.outstandingBorrowed += financials.remaining;
    }

    map.set(key, existing);
  }

  return Array.from(map.values()).map((profile) => ({
    ...profile,
    score: calculateScore(profile),
  }));
}

function calculateScore(profile: ContactProfile) {
  const completed = profile.onTime + profile.late;
  const base = completed > 0 ? (profile.onTime / completed) * 100 : 72;
  const overduePenalty = profile.overdue * 18;
  const latePenalty = profile.late * 8;
  return Math.max(0, Math.min(100, base - overduePenalty - latePenalty));
}

function paidOnTime(loan: Loan, repayments: Repayment[]) {
  if (!loan.due_date) return true;
  const lastRepayment = [...repayments].sort((a, b) =>
    b.date.localeCompare(a.date),
  )[0];
  return Boolean(lastRepayment && lastRepayment.date <= loan.due_date);
}

type TFn = (key: TranslationKey, vars?: Record<string, string | number>) => string;

function getBehavior(profile: ContactProfile, t: TFn) {
  if (profile.overdue > 0) {
    return {
      label: t("contact_behavior_attention"),
      description: t("contact_behavior_attention_desc"),
      color: "text-red-600",
      iconColor: "text-red-500",
    };
  }
  if (profile.score >= 85) {
    return {
      label: t("contact_behavior_reliable"),
      description: t("contact_behavior_reliable_desc"),
      color: "text-emerald-700",
      iconColor: "text-emerald-600",
    };
  }
  if (profile.late > 0) {
    return {
      label: t("contact_behavior_late"),
      description: t("contact_behavior_late_desc"),
      color: "text-amber-700",
      iconColor: "text-amber-600",
    };
  }
  return {
    label: t("contact_behavior_healthy"),
    description: t("contact_behavior_healthy_desc"),
    color: "text-blue-700",
    iconColor: "text-blue-600",
  };
}

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
  danger,
}: {
  icon: typeof Medal;
  label: string;
  value: string;
  hint: string;
  danger?: boolean;
}) {
  return (
    <div className="soft-card dashboard-stat rounded-2xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-neutral-500">{label}</p>
          <p
            className={clsx(
              "mt-1 text-xl font-semibold",
              danger ? "text-red-600" : "text-neutral-950",
            )}>
            {value}
          </p>
        </div>
        <Icon
          size={18}
          className={danger ? "text-red-500" : "text-blue-600"}
        />
      </div>
      <p className="mt-2 text-xs text-neutral-400">{hint}</p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  profile,
  color,
}: {
  label: string;
  value: number;
  profile: ContactProfile;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3">
      <span className="text-sm text-neutral-500">{label}</span>
      <span className={clsx("text-sm font-semibold text-neutral-950", color)}>
        {formatAmount(value, primaryCurrency(profile))}
      </span>
    </div>
  );
}

function HistoryRow({
  loan,
  repayments,
  t,
}: {
  loan: Loan;
  repayments: Repayment[];
  t: TFn;
}) {
  const financials = calculateLoanFinancials(loan, repayments);
  const isLent = loan.type === "lent";
  const overdue = loan.status !== "paid" && isOverdue(loan.due_date);

  return (
    <Link
      href={`/loans/${loan.id}`}
      className="flex items-center justify-between gap-4 px-4 py-3 transition hover:bg-neutral-50">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {isLent ? (
            <ArrowUpRight size={14} className="text-blue-600" />
          ) : (
            <ArrowDownLeft size={14} className="text-red-500" />
          )}
          <p className="truncate text-sm font-semibold text-neutral-900">
            {isLent ? t("contact_history_lent") : t("contact_history_borrowed")} ·{" "}
            {formatDate(loan.loan_date)}
          </p>
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          {t("contact_history_paid")}{" "}
          {formatAmount(financials.paid, loan.currency)} ·{" "}
          {t("contact_history_remaining")}{" "}
          {formatAmount(financials.remaining, loan.currency)}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p
          className={clsx(
            "text-sm font-bold",
            isLent ? "text-blue-700" : "text-red-600",
          )}>
          {formatAmount(financials.totalDue, loan.currency)}
        </p>
        <span
          className={clsx(
            "mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
            overdue
              ? "bg-red-50 text-red-600"
              : loan.status === "paid"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-neutral-100 text-neutral-500",
          )}>
          {overdue
            ? t("contacts_overdue", { n: 1 })
            : loan.status === "paid"
              ? t("status_paid")
              : t("status_active")}
        </span>
      </div>
    </Link>
  );
}

function primaryCurrency(profile: ContactProfile) {
  return profile.loans[0]?.currency ?? "GEL";
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
