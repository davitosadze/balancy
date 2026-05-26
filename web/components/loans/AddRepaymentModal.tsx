"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";
import clsx from "clsx";
import { useAuthStore } from "@/lib/store/auth";
import { useLoansStore } from "@/lib/store/loans";
import { useToastStore } from "@/lib/store/toast";
import { useLangStore } from "@/lib/i18n";
import { todayISO } from "@/lib/utils/date";
import { formatAmount } from "@/lib/utils/currency";
import type { Loan, LoanParticipant } from "@/lib/types";

const schema = z.object({
  amount: z.number().positive("Amount must be positive"),
  date: z.string().min(1),
  paid_by: z.string().optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

interface Props {
  loan: Loan;
  remaining: number;
  totalDue?: number;
  onClose: () => void;
}

const PCT_SHORTCUTS = [25, 50, 75, 100] as const;

export default function AddRepaymentModal({
  loan,
  remaining,
  totalDue = loan.amount,
  onClose,
}: Props) {
  const { token } = useAuthStore();
  const { addRepayment } = useLoansStore();
  const toast = useToastStore();
  const { t } = useLangStore();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const participants = useMemo<LoanParticipant[]>(() => {
    if (!loan.participants) return [];
    try {
      return JSON.parse(loan.participants) as LoanParticipant[];
    } catch {
      return [];
    }
  }, [loan.participants]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { date: todayISO() },
  });

  const currentAmount = watch("amount");

  const applyPct = (pct: number) => {
    const val = Math.round(remaining * (pct / 100) * 100) / 100;
    setValue("amount", val, { shouldValidate: true });
  };

  const onSubmit = async (data: FormData) => {
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      await addRepayment(token, {
        loan_id: loan.id,
        amount: data.amount,
        date: data.date,
        paid_by: data.paid_by || undefined,
        notes: data.notes,
        loanTotal: totalDue,
      });
      toast.show("Repayment added");
      onClose();
    } catch (e: unknown) {
      const msg = getErrorMessage(e, "Failed to add repayment");
      setError(msg);
      toast.show(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 border border-neutral-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-[17px] text-neutral-900">
            {t("repayment_title")}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-neutral-100 text-neutral-500 flex items-center justify-center transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Balance summary */}
        <div className="flex items-center justify-between bg-neutral-50 rounded-xl px-4 py-3 mb-5">
          <div>
            <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide">
              {t("repayment_total")}
            </p>
            <p className="text-sm font-bold text-neutral-900">
              {formatAmount(totalDue, loan.currency)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide">
              {t("repayment_remaining")}
            </p>
            <p
              className={clsx(
                "text-sm font-bold",
                remaining > 0 ? "text-red-600" : "text-stone-600",
              )}>
              {formatAmount(remaining, loan.currency)}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Amount + % shortcuts */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">
                {t("repayment_amount")} ({loan.currency})
              </label>
              <div className="flex gap-1">
                {PCT_SHORTCUTS.map((pct) => {
                  const val = Math.round(remaining * (pct / 100) * 100) / 100;
                  const active = currentAmount === val;
                  return (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => applyPct(pct)}
                      className={clsx(
                        "h-6 px-2 rounded-md text-[11px] font-semibold transition-colors",
                        active
                          ? "bg-neutral-950 text-white"
                          : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200",
                      )}>
                      {pct}%
                    </button>
                  );
                })}
              </div>
            </div>
            <input
              {...register("amount", { valueAsNumber: true })}
              type="number"
              inputMode="decimal"
              step="0.01"
              className="w-full h-12 px-4 rounded-2xl border border-neutral-200 bg-white text-sm text-neutral-900 outline-none focus:border-neutral-900 transition-colors"
              placeholder="0.00"
            />
            {errors.amount && (
              <p className="text-red-500 text-xs mt-1.5">
                {errors.amount.message}
              </p>
            )}
          </div>

          {/* Paid by — only for shared loans */}
          {participants.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wide mb-1.5">
                {t("repayment_paid_by")}
              </label>
              <select
                {...register("paid_by")}
                className="w-full h-12 px-4 rounded-2xl border border-neutral-200 bg-white text-sm text-neutral-900 outline-none focus:border-neutral-900 transition-colors">
                <option value="">— Select participant —</option>
                {participants.map((p, i) => (
                  <option key={i} value={p.name}>
                    {p.name || `Participant ${i + 1}`}
                    {p.amount
                      ? ` (share: ${formatAmount(p.amount, loan.currency)})`
                      : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wide mb-1.5">
              {t("repayment_date")}
            </label>
            <input
              {...register("date")}
              type="date"
              className="w-full h-12 px-4 rounded-2xl border border-neutral-200 bg-white text-sm text-neutral-900 outline-none focus:border-neutral-900 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wide mb-1.5">
              {t("repayment_notes")}
            </label>
            <input
              {...register("notes")}
              className="w-full h-12 px-4 rounded-2xl border border-neutral-200 bg-white text-sm text-neutral-900 outline-none focus:border-neutral-900 transition-colors placeholder:text-neutral-400"
              placeholder="e.g. Bank transfer"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-12 rounded-2xl border border-neutral-200 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors">
              {t("btn_cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 h-12 bg-neutral-950 text-white rounded-2xl text-sm font-semibold hover:bg-neutral-800 disabled:opacity-50 transition-colors">
              {saving ? t("form_saving") : t("repayment_add")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
