"use client";

import { Calculator } from "lucide-react";
import clsx from "clsx";
import { formatAmount } from "@/lib/utils/currency";

export type InterestPeriod = "monthly" | "yearly";

export function annualizeInterestRate(rate: number, period: InterestPeriod) {
  const safeRate = Number.isFinite(rate) ? Math.max(0, rate) : 0;
  return period === "monthly" ? safeRate * 12 : safeRate;
}

export function calculateInterestEstimate({
  amount,
  rate,
  period,
  loanDate,
  dueDate,
}: {
  amount: number;
  rate: number;
  period: InterestPeriod;
  loanDate?: string;
  dueDate?: string;
}) {
  const principal = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  const annualRate = annualizeInterestRate(rate, period);
  const days = getDayCount(loanDate, dueDate);
  const interest = principal * (annualRate / 100) * (days / 365);

  return {
    annualRate,
    days,
    interest,
    total: principal + interest,
  };
}

function getDayCount(loanDate?: string, dueDate?: string) {
  if (!loanDate || !dueDate) return 0;
  const start = new Date(`${loanDate}T00:00:00`);
  const end = new Date(`${dueDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  const diff = end.getTime() - start.getTime();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

export default function InterestCalculator({
  amount,
  currency,
  loanDate,
  dueDate,
  rate,
  period,
  onRateChange,
  onPeriodChange,
}: {
  amount: number;
  currency: string;
  loanDate?: string;
  dueDate?: string;
  rate: number;
  period: InterestPeriod;
  onRateChange: (rate: number) => void;
  onPeriodChange: (period: InterestPeriod) => void;
}) {
  const estimate = calculateInterestEstimate({
    amount,
    rate,
    period,
    loanDate,
    dueDate,
  });

  return (
    <section className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Calculator size={17} />
            </span>
            <div>
              <p className="text-sm font-semibold text-neutral-950">
                Interest calculator
              </p>
              <p className="text-xs text-neutral-500">
                Simple interest, counted by exact days.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr),auto] lg:min-w-[420px]">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Interest rate
            </span>
            <div className="flex h-11 items-center rounded-xl border border-neutral-200 bg-white px-3 transition-colors focus-within:border-blue-500">
              <input
                value={Number.isFinite(rate) ? rate : 0}
                onChange={(event) =>
                  onRateChange(Math.max(0, Number(event.target.value) || 0))
                }
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-neutral-950 outline-none"
              />
              <span className="text-sm font-semibold text-neutral-400">%</span>
            </div>
          </label>

          <div>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Period
            </span>
            <div className="grid h-11 grid-cols-2 rounded-xl bg-neutral-200/70 p-1">
              {(["monthly", "yearly"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => onPeriodChange(option)}
                  className={clsx(
                    "rounded-lg px-3 text-xs font-semibold capitalize transition-colors",
                    period === option
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-neutral-500 hover:text-neutral-900",
                  )}>
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <InterestTile label="Days" value={`${estimate.days}`} />
        <InterestTile
          label="Annual rate"
          value={`${trimNumber(estimate.annualRate)}%`}
        />
        <InterestTile
          label="Interest"
          value={formatAmount(estimate.interest, currency)}
          accent="text-blue-700"
        />
        <InterestTile
          label="Total"
          value={formatAmount(estimate.total, currency)}
          accent="text-emerald-700"
        />
      </div>
      <p className="mt-3 text-xs leading-5 text-neutral-500">
        Monthly rates are converted to an annual equivalent when saved, so the
        loan stays consistent everywhere in the app.
      </p>
    </section>
  );
}

function InterestTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
        {label}
      </p>
      <p className={clsx("mt-1 text-sm font-bold text-neutral-950", accent)}>
        {value}
      </p>
    </div>
  );
}

function trimNumber(value: number) {
  return Number(value.toFixed(4)).toString();
}
