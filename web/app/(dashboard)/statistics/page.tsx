"use client";

import { useEffect, useState } from "react";
import type { ElementType, ReactNode } from "react";
import Link from "next/link";
import { useAuthStore } from "@/lib/store/auth";
import { useLoansStore } from "@/lib/store/loans";
import { usePremiumStore } from "@/lib/store/premium";
import { useLangStore } from "@/lib/i18n";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { formatAmount, getCurrencySymbol } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import {
  BellRing,
  Copy,
  Crown,
  FileDown,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import clsx from "clsx";
import type { Loan, Repayment } from "@/lib/types";

export default function StatisticsPage() {
  const { token, user } = useAuthStore();
  const { loans, repayments, loadLoans, loadAllRepayments, getStats } =
    useLoansStore();
  const { isPremium, initialize: initializePremium } = usePremiumStore();
  const { t } = useLangStore();
  const stats = getStats();
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);

  useEffect(() => {
    initializePremium(user);
    if (!token) return;
    loadLoans(token).then(() => loadAllRepayments(token));
  }, [token, user, loadLoans, loadAllRepayments, initializePremium]);

  const currencies = Object.keys(stats.monthly);
  const activeCurrency = selectedCurrency ?? currencies[0] ?? null;
  const monthlyData = activeCurrency
    ? (stats.monthly[activeCurrency] ?? [])
    : [];

  const activeCount = stats.byStatus.active;
  const premiumInsights = buildPremiumInsights(loans, repayments);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
      <section className="soft-hero dashboard-hero rounded-[32px]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="dashboard-kicker">{t("stats_dashboard_header")}</p>
            <h1 className="dashboard-title">{t("stats_title")}</h1>
            <p className="dashboard-subtitle">
              {t("stats_dashboard_subtitle")}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label={t("stats_total_loans")}
              value={stats.totalLoans.toString()}
            />
            <StatCard
              label={t("status_active")}
              value={activeCount.toString()}
              color="text-neutral-900"
            />
            <StatCard
              label={t("status_partially_paid")}
              value={stats.byStatus.partially_paid.toString()}
              color="text-amber-600"
            />
            <StatCard
              label={t("status_paid")}
              value={stats.byStatus.paid.toString()}
              color="text-emerald-600"
            />
          </div>
        </div>
      </section>

      {isPremium ? (
        <PremiumInsights insights={premiumInsights} />
      ) : (
        <PremiumLockedPanel />
      )}

      <div className="grid gap-6 xl:grid-cols-[1.4fr,0.9fr]">
        <div className="space-y-6">
          {stats.byCurrency.length > 0 && (
            <div className="soft-card rounded-3xl p-6">
              <div className="flex items-center justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-950">
                    {t("stats_outstanding_balances")}
                  </h2>
                  <p className="text-sm text-neutral-500 mt-1">
                    {t("balance_net")} / {t("balance_lent_out")} /{" "}
                    {t("balance_borrowed")}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                {stats.byCurrency.map((c) => (
                  <div
                    key={c.currency}
                    className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <div>
                        <p className="text-sm font-semibold text-neutral-900">
                          {c.currency}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {formatAmount(
                            c.outstandingLent - c.outstandingBorrowed,
                            c.currency,
                          )}{" "}
                          {t("balance_net")}
                        </p>
                      </div>
                      <div className="text-right text-xs text-neutral-500">
                        <p>
                          {t("balance_lent_out")}:{" "}
                          {formatAmount(c.outstandingLent, c.currency)}
                        </p>
                        <p>
                          {t("balance_borrowed")}:{" "}
                          {formatAmount(c.outstandingBorrowed, c.currency)}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <BalanceBar
                        label={t("balance_lent_out")}
                        value={c.outstandingLent}
                        max={
                          Math.max(c.outstandingLent, c.outstandingBorrowed) ||
                          1
                        }
                        color="bg-blue-600"
                        currency={c.currency}
                      />
                      <BalanceBar
                        label={t("balance_borrowed")}
                        value={c.outstandingBorrowed}
                        max={
                          Math.max(c.outstandingLent, c.outstandingBorrowed) ||
                          1
                        }
                        color="bg-red-400"
                        currency={c.currency}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currencies.length > 0 && (
            <div className="soft-card rounded-3xl p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-neutral-950">
                    {t("stats_monthly_activity")}
                  </h2>
                  <p className="text-sm text-neutral-500 mt-1">
                    {t("stats_chart_lent")}, {t("loan_borrowed_badge")},{" "}
                    {t("stats_chart_repaid")}
                  </p>
                </div>
                {currencies.length > 1 && (
                  <div className="flex flex-wrap gap-2">
                    {currencies.map((c) => (
                      <button
                        key={c}
                        onClick={() => setSelectedCurrency(c)}
                        className={clsx(
                          "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                          activeCurrency === c
                            ? "bg-blue-600 text-white"
                            : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200",
                        )}>
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {monthlyData.length === 0 ? (
                <p className="text-sm text-neutral-400 text-center py-12">
                  {t("stats_no_data")}
                </p>
              ) : (
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={monthlyData}
                      margin={{ top: 0, right: 8, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11, fill: "#94A3B8" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => {
                          const [y, m] = v.split("-");
                          return new Date(+y, +m - 1, 1).toLocaleString("en", {
                            month: "short",
                          });
                        }}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#94A3B8" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) =>
                          `${getCurrencySymbol(activeCurrency ?? "")}${v}`
                        }
                      />
                      <Tooltip
                        formatter={(value, name) => [
                          formatAmount(Number(value), activeCurrency ?? ""),
                          String(name).charAt(0).toUpperCase() +
                            String(name).slice(1),
                        ]}
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid #E5E7EB",
                          fontSize: "12px",
                        }}
                      />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
                      />
                      <Bar
                        dataKey="lent"
                        name={t("stats_chart_lent")}
                        fill="#2563EB"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="borrowed"
                        name={t("loan_borrowed_badge")}
                        fill="#EF4444"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="repaid"
                        name={t("stats_chart_repaid")}
                        fill="#10B981"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-6">
          {stats.overdue.length > 0 && (
            <div className="soft-card rounded-3xl p-6">
              <h2 className="text-lg font-semibold text-neutral-950 mb-4">
                {t("stats_overdue_section", { n: stats.overdue.length })}
              </h2>
              <div className="space-y-3">
                {stats.overdue.map((loan) => (
                  <div
                    key={loan.id}
                    className="rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-neutral-950">
                          {loan.contact_name}
                        </p>
                        <p className="text-xs text-neutral-500 mt-1">
                          {t("stats_due_label", {
                            date: formatDate(loan.due_date),
                          })}
                        </p>
                      </div>
                      <span className="font-semibold text-red-600">
                        {formatAmount(loan.amount, loan.currency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats.contactStats.length > 0 && (
            <div className="soft-card rounded-3xl p-6">
              <h2 className="text-lg font-semibold text-neutral-950 mb-4">
                {t("stats_contacts_section")}
              </h2>
              <div className="space-y-3">
                {stats.contactStats.slice(0, 10).map((c) => (
                  <div
                    key={c.name}
                    className="flex items-center justify-between gap-4 rounded-3xl border border-neutral-200 bg-neutral-50 p-4">
                    <div>
                      <p className="font-semibold text-neutral-950">{c.name}</p>
                      <p className="text-xs text-neutral-500 mt-1">
                        {t(
                          c.totalLoans !== 1
                            ? "stats_loan_count_plural"
                            : "stats_loan_count",
                          { n: c.totalLoans },
                        )}
                        {c.paidOnTime > 0 &&
                          ` ${t("stats_on_time", { n: c.paidOnTime })}`}
                        {c.paidLate > 0 &&
                          ` ${t("stats_late", { n: c.paidLate })}`}
                      </p>
                    </div>
                    <span
                      className={clsx(
                        "text-xs font-semibold px-3 py-1 rounded-full",
                        c.outstanding > 0
                          ? "bg-amber-50 text-amber-700"
                          : "bg-emerald-50 text-emerald-700",
                      )}>
                      {c.outstanding > 0
                        ? t("stats_outstanding_badge")
                        : t("stats_settled_badge")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function buildPremiumInsights(
  loans: Loan[],
  repayments: Record<string, Repayment[]>,
) {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const next30 = new Date(today);
  next30.setDate(next30.getDate() + 30);
  const next30Str = next30.toISOString().split("T")[0];

  const outstandingFor = (loan: Loan) => {
    const paid = (repayments[String(loan.id)] ?? []).reduce(
      (sum, r) => sum + Number(r.amount),
      0,
    );
    return Math.max(0, Number(loan.amount) - paid);
  };

  const dueIn30 = loans.filter(
    (loan) =>
      !loan.archived &&
      loan.status !== "paid" &&
      loan.due_date &&
      loan.due_date >= todayStr &&
      loan.due_date <= next30Str,
  );

  const overdue = loans.filter(
    (loan) =>
      !loan.archived &&
      loan.status !== "paid" &&
      loan.due_date &&
      loan.due_date < todayStr,
  );

  const forecastByCurrency = new Map<
    string,
    { currency: string; incoming: number; outgoing: number }
  >();
  const exposureByCurrency = new Map<
    string,
    { currency: string; lent: number; borrowed: number }
  >();
  for (const loan of dueIn30) {
    const row = forecastByCurrency.get(loan.currency) ?? {
      currency: loan.currency,
      incoming: 0,
      outgoing: 0,
    };
    if (loan.type === "lent") row.incoming += outstandingFor(loan);
    else row.outgoing += outstandingFor(loan);
    forecastByCurrency.set(loan.currency, row);
  }

  for (const loan of loans) {
    if (loan.archived || loan.status === "paid") continue;
    const row = exposureByCurrency.get(loan.currency) ?? {
      currency: loan.currency,
      lent: 0,
      borrowed: 0,
    };
    if (loan.type === "lent") row.lent += outstandingFor(loan);
    else row.borrowed += outstandingFor(loan);
    exposureByCurrency.set(loan.currency, row);
  }

  const riskLoans = [...overdue, ...dueIn30]
    .map((loan) => ({
      loan,
      outstanding: outstandingFor(loan),
      overdue: Boolean(loan.due_date && loan.due_date < todayStr),
    }))
    .sort(
      (a, b) =>
        Number(b.overdue) - Number(a.overdue) || b.outstanding - a.outstanding,
    )
    .slice(0, 4);

  return {
    dueIn30,
    overdue,
    forecast: Array.from(forecastByCurrency.values()),
    exposure: Array.from(exposureByCurrency.values()),
    riskLoans,
  };
}

function PremiumLockedPanel() {
  const { t } = useLangStore();
  return (
    <section className="soft-hero rounded-[32px]">
      <div className="grid gap-0 lg:grid-cols-[1.05fr,1.2fr]">
        <div className="p-7 lg:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
            <Crown size={21} />
          </div>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.28em] text-blue-600">
            {t("premium_locked_badge")}
          </p>
          <h2 className="mt-3 max-w-xl text-2xl font-semibold tracking-tight">
            {t("premium_stats_locked_title")}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-600">
            {t("premium_stats_locked_desc")}
          </p>
          <Link
            href="/premium"
            className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700">
            <Sparkles size={15} />
            {t("premium_activate")}
          </Link>
        </div>
        <div className="grid gap-3 bg-white/40 p-5 sm:grid-cols-3">
          {[
            {
              icon: TrendingUp,
              title: t("premium_forecast_title"),
              desc: t("premium_preview_forecast"),
            },
            {
              icon: Target,
              title: t("premium_planner_title"),
              desc: t("premium_preview_planner"),
            },
            {
              icon: Copy,
              title: t("premium_reminders_title"),
              desc: t("premium_preview_reminders"),
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="soft-card rounded-3xl p-4">
              <Icon size={18} className="text-blue-600" />
              <p className="mt-4 text-sm font-semibold text-neutral-950">
                {title}
              </p>
              <p className="mt-2 text-xs leading-5 text-neutral-500">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PremiumInsights({
  insights,
}: {
  insights: ReturnType<typeof buildPremiumInsights>;
}) {
  const { t } = useLangStore();
  const [plannerCurrency, setPlannerCurrency] = useState(
    insights.exposure[0]?.currency ?? "",
  );
  const [plannerAmount, setPlannerAmount] = useState("100");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const selectedExposure =
    insights.exposure.find((row) => row.currency === plannerCurrency) ??
    insights.exposure[0] ??
    null;
  const parsedPlannerAmount = Math.max(0, Number(plannerAmount) || 0);
  const afterPlanner = selectedExposure
    ? selectedExposure.lent - selectedExposure.borrowed - parsedPlannerAmount
    : 0;

  const copyReminder = async (loan: Loan, outstanding: number) => {
    const text = t("premium_reminder_message", {
      name: loan.contact_name,
      amount: formatAmount(outstanding, loan.currency),
      date: loan.due_date ? formatDate(loan.due_date) : t("loan_due_date"),
    });
    await navigator.clipboard.writeText(text);
    setCopiedId(String(loan.id));
    window.setTimeout(() => setCopiedId(null), 1600);
  };

  const downloadReport = () => {
    const lines = [
      "Balancy Premium Portfolio Report",
      `Generated: ${new Date().toLocaleString()}`,
      "",
      "30-day forecast",
      ...(insights.forecast.length
        ? insights.forecast.map(
            (row) =>
              `${row.currency}: net ${formatAmount(row.incoming - row.outgoing, row.currency)} | in ${formatAmount(row.incoming, row.currency)} | out ${formatAmount(row.outgoing, row.currency)}`,
          )
        : ["No active due dates in the next 30 days."]),
      "",
      "Current exposure",
      ...(insights.exposure.length
        ? insights.exposure.map(
            (row) =>
              `${row.currency}: net ${formatAmount(row.lent - row.borrowed, row.currency)} | lent ${formatAmount(row.lent, row.currency)} | borrowed ${formatAmount(row.borrowed, row.currency)}`,
          )
        : ["No active exposure."]),
      "",
      "Priority follow-ups",
      ...(insights.riskLoans.length
        ? insights.riskLoans.map(
            ({ loan, outstanding, overdue }, index) =>
              `${index + 1}. ${loan.contact_name} | ${formatAmount(outstanding, loan.currency)} | ${overdue ? "overdue" : `due ${loan.due_date ? formatDate(loan.due_date) : "-"}`}`,
          )
        : ["No priority follow-ups."]),
    ];

    const blob = new Blob([lines.join("\n")], {
      type: "text/plain;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `balancy-premium-report-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const topAction = insights.riskLoans[0] ?? null;

  return (
    <section className="space-y-4">
      <div className="soft-card rounded-[32px] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-600">
              {t("premium_active_badge")}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
              {t("premium_command_title")}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
              {t("premium_command_desc")}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="grid grid-cols-3 gap-3">
              <MiniMetric
                label={t("premium_nudge_overdue")}
                value={insights.overdue.length}
              />
              <MiniMetric
                label={t("premium_nudge_due")}
                value={insights.dueIn30.length}
              />
              <MiniMetric
                label={t("premium_exposure_count")}
                value={insights.exposure.length}
              />
            </div>
            <button
              onClick={downloadReport}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700">
              <FileDown size={15} />
              {t("premium_report_download")}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[0.85fr,1.15fr]">
        <PremiumPanel icon={Target} title={t("premium_next_action_title")}>
          {topAction ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  {topAction.overdue
                    ? t("premium_next_action_overdue")
                    : t("premium_next_action_due")}
                </p>
                <div className="mt-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-neutral-950">
                      {topAction.loan.contact_name}
                    </p>
                    <p className="mt-1 text-sm text-neutral-500">
                      {formatAmount(
                        topAction.outstanding,
                        topAction.loan.currency,
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      copyReminder(topAction.loan, topAction.outstanding)
                    }
                    className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-white px-3 text-xs font-semibold text-neutral-800 shadow-sm transition hover:bg-neutral-100">
                    <Copy size={13} />
                    {copiedId === String(topAction.loan.id)
                      ? t("premium_reminder_copied")
                      : t("premium_reminder_copy")}
                  </button>
                </div>
              </div>
              <p className="text-sm leading-6 text-neutral-500">
                {topAction.overdue
                  ? t("premium_next_action_overdue_desc")
                  : t("premium_next_action_due_desc")}
              </p>
            </div>
          ) : (
            <p className="text-sm text-neutral-500">
              {t("premium_next_action_empty")}
            </p>
          )}
        </PremiumPanel>

        <PremiumPanel icon={FileDown} title={t("premium_report_title")}>
          <div className="grid gap-3 sm:grid-cols-3">
            <ReportFeature label={t("premium_report_forecast")} />
            <ReportFeature label={t("premium_report_exposure")} />
            <ReportFeature label={t("premium_report_followups")} />
          </div>
          <button
            onClick={downloadReport}
            className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700">
            <FileDown size={15} />
            {t("premium_report_download")}
          </button>
        </PremiumPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
        <div className="grid gap-4 lg:grid-cols-2">
          <PremiumPanel icon={TrendingUp} title={t("premium_forecast_title")}>
            {insights.forecast.length === 0 ? (
              <p className="text-sm text-neutral-500">
                {t("premium_forecast_empty")}
              </p>
            ) : (
              <div className="space-y-3">
                {insights.forecast.map((row) => (
                  <div
                    key={row.currency}
                    className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-neutral-950">
                        {row.currency}
                      </span>
                      <span
                        className={clsx(
                          "text-sm font-bold",
                          row.incoming - row.outgoing >= 0
                            ? "text-emerald-600"
                            : "text-red-600",
                        )}>
                        {formatAmount(
                          row.incoming - row.outgoing,
                          row.currency,
                        )}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-neutral-500">
                      {t("premium_forecast_line", {
                        in: formatAmount(row.incoming, row.currency),
                        out: formatAmount(row.outgoing, row.currency),
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </PremiumPanel>

          <PremiumPanel icon={BellRing} title={t("premium_risk_title")}>
            {insights.riskLoans.length === 0 ? (
              <p className="text-sm text-neutral-500">
                {t("premium_risk_empty")}
              </p>
            ) : (
              <div className="space-y-3">
                {insights.riskLoans.map(({ loan, outstanding, overdue }) => (
                  <div
                    key={loan.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-neutral-950">
                        {loan.contact_name}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        {overdue
                          ? t("premium_overdue_now")
                          : formatDate(loan.due_date)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-neutral-900">
                      {formatAmount(outstanding, loan.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </PremiumPanel>
        </div>

        <PremiumPanel icon={Target} title={t("premium_planner_title")}>
          {selectedExposure ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {insights.exposure.map((row) => (
                  <button
                    key={row.currency}
                    onClick={() => setPlannerCurrency(row.currency)}
                    className={clsx(
                      "h-9 rounded-full px-3 text-xs font-semibold transition-colors",
                      selectedExposure.currency === row.currency
                        ? "bg-blue-600 text-white"
                        : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200",
                    )}>
                    {row.currency}
                  </button>
                ))}
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
                  {t("premium_planner_input")}
                </label>
                <input
                  value={plannerAmount}
                  onChange={(e) => setPlannerAmount(e.target.value)}
                  inputMode="decimal"
                  className="mt-2 h-12 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 text-sm font-semibold text-neutral-950 outline-none transition focus:border-blue-600"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <PlannerTile
                  label={t("premium_planner_before")}
                  value={formatAmount(
                    selectedExposure.lent - selectedExposure.borrowed,
                    selectedExposure.currency,
                  )}
                />
                <PlannerTile
                  label={t("premium_planner_after")}
                  value={formatAmount(afterPlanner, selectedExposure.currency)}
                  accent={
                    afterPlanner >= 0 ? "text-emerald-600" : "text-red-600"
                  }
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-neutral-500">
              {t("premium_planner_empty")}
            </p>
          )}
        </PremiumPanel>
      </div>

      <PremiumPanel icon={Copy} title={t("premium_reminders_title")}>
        {insights.riskLoans.length === 0 ? (
          <p className="text-sm text-neutral-500">
            {t("premium_reminders_empty")}
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {insights.riskLoans.map(({ loan, outstanding }) => (
              <div
                key={loan.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-neutral-950">
                    {loan.contact_name}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {formatAmount(outstanding, loan.currency)}
                  </p>
                </div>
                <button
                  onClick={() => copyReminder(loan, outstanding)}
                  className="inline-flex h-9 shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700">
                  <Copy size={13} />
                  {copiedId === String(loan.id)
                    ? t("premium_reminder_copied")
                    : t("premium_reminder_copy")}
                </button>
              </div>
            ))}
          </div>
        )}
      </PremiumPanel>
    </section>
  );
}

function PremiumPanel({
  icon: Icon,
  title,
  children,
}: {
  icon: ElementType;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="soft-card rounded-3xl p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          <Icon size={18} />
        </div>
        <div>
          <h2 className="text-base font-semibold text-neutral-950">{title}</h2>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-neutral-50 px-4 py-3 text-center">
      <p className="text-xl font-bold text-neutral-950">{value}</p>
      <p className="mt-1 text-[11px] font-medium text-neutral-500">{label}</p>
    </div>
  );
}

function PlannerTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
        {label}
      </p>
      <p className={clsx("mt-2 text-lg font-bold text-neutral-950", accent)}>
        {value}
      </p>
    </div>
  );
}

function ReportFeature({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
      <p className="text-sm font-semibold text-neutral-800">{label}</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="soft-card dashboard-stat rounded-2xl text-center">
      <p className={clsx("text-xl font-bold", color ?? "text-neutral-900")}>
        {value}
      </p>
      <p className="text-xs text-neutral-400 mt-1">{label}</p>
    </div>
  );
}

function BalanceBar({
  label,
  value,
  max,
  color,
  currency,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  currency: string;
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-neutral-400 w-16 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
        <div
          className={clsx("h-full rounded-full", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-neutral-700 w-20 text-right shrink-0">
        {formatAmount(value, currency)}
      </span>
    </div>
  );
}
