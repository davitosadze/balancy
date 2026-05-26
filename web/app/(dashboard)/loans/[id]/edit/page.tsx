"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2, Split, Paperclip, X } from "lucide-react";
import clsx from "clsx";
import { useAuthStore } from "@/lib/store/auth";
import { useLoansStore } from "@/lib/store/loans";
import { useToastStore } from "@/lib/store/toast";
import { useLangStore } from "@/lib/i18n";
import { uploadFile } from "@/lib/api/directus";
import { POPULAR_CURRENCIES } from "@/lib/utils/currency";
import type { Loan, LoanParticipant } from "@/lib/types";
import InterestCalculator, {
  annualizeInterestRate,
  type InterestPeriod,
} from "@/components/loans/InterestCalculator";

const schema = z.object({
  type: z.enum(["lent", "borrowed"]),
  contact_name: z.string().min(1, "Contact name is required"),
  phone: z.string().optional(),
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().min(1),
  loan_date: z.string().min(1),
  due_date: z.string().optional(),
  interest_rate: z.number().min(0),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function EditLoanPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuthStore();
  const { loans, loadLoan, editLoan } = useLoansStore();
  const toast = useToastStore();
  const { t } = useLangStore();

  const [loan, setLoan] = useState<Loan | null>(
    loans.find((l) => String(l.id) === String(id)) ?? null,
  );
  const [loading, setLoading] = useState(!loan);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [interestPeriod, setInterestPeriod] =
    useState<InterestPeriod>("yearly");

  // Participants
  const [isShared, setIsShared] = useState(false);
  const [participants, setParticipants] = useState<LoanParticipant[]>([]);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!token) return;
    if (!loan) {
      (async () => {
        setLoading(true);
        try {
          const l = await loadLoan(token, id);
          setLoan(l);
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [token]);

  useEffect(() => {
    if (loan) {
      reset({
        type: loan.type,
        contact_name: loan.contact_name,
        phone: loan.phone ?? "",
        amount: loan.amount,
        currency: loan.currency,
        loan_date: loan.loan_date,
        due_date: loan.due_date ?? "",
        interest_rate: loan.interest_rate ?? 0,
        notes: loan.notes ?? "",
      });
      // Load participants from loan
      if (loan.participants) {
        try {
          const p = JSON.parse(loan.participants) as LoanParticipant[];
          if (p.length > 0) {
            setParticipants(p);
            setIsShared(true);
          }
        } catch {}
      }
    }
  }, [loan]);

  const onSubmit = async (data: FormData) => {
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      let attachment_id = loan?.attachment_id ?? null;
      if (attachmentFile) {
        const uploaded = await uploadFile(token, attachmentFile);
        attachment_id = uploaded.id;
      }
      await editLoan(token, id, {
        type: data.type,
        contact_name: data.contact_name,
        phone: data.phone || null,
        amount: data.amount,
        currency: data.currency,
        loan_date: data.loan_date,
        due_date: data.due_date || null,
        interest_rate: annualizeInterestRate(
          data.interest_rate,
          interestPeriod,
        ),
        notes: data.notes || null,
        attachment_id,
        participants:
          isShared && participants.length > 0
            ? JSON.stringify(participants)
            : null,
      });
      toast.show("Loan saved successfully");
      router.replace(`/loans/${id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save loan";
      setError(msg);
      toast.show(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const loanType = watch("type");

  // Participants helpers
  const watchedAmount = watch("amount");
  const watchedCurrency = watch("currency");
  const watchedLoanDate = watch("loan_date");
  const watchedDueDate = watch("due_date");
  const watchedInterestRate = watch("interest_rate");

  const equalSplit = (list: LoanParticipant[], total: number) => {
    if (list.length === 0) return list;
    const each = Math.round((total / list.length) * 100) / 100;
    return list.map((p) => ({ ...p, amount: each }));
  };

  const handleToggleShared = (val: boolean) => {
    setIsShared(val);
    if (val && participants.length === 0) {
      setParticipants([{ name: "", amount: Number(watchedAmount) || 0 }]);
    }
    if (!val) setParticipants([]);
  };

  const addParticipant = () => {
    if (participants.length >= 9) return;
    const total = Number(watchedAmount) || 0;
    const newList = [...participants, { name: "", amount: 0 }];
    setParticipants(equalSplit(newList, total));
  };

  const removeParticipant = (i: number) => {
    const newList = participants.filter((_, idx) => idx !== i);
    setParticipants(equalSplit(newList, Number(watchedAmount) || 0));
    if (newList.length === 0) setIsShared(false);
  };

  const updateParticipant = (
    i: number,
    field: keyof LoanParticipant,
    value: string,
  ) => {
    setParticipants((prev) =>
      prev.map((p, idx) =>
        idx === i
          ? { ...p, [field]: field === "amount" ? Number(value) || 0 : value }
          : p,
      ),
    );
  };

  const applyEqualSplit = () => {
    setParticipants(equalSplit(participants, Number(watchedAmount) || 0));
  };

  const participantTotal = participants.reduce((s, p) => s + p.amount, 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="w-8 h-8 border-4 border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="soft-hero dashboard-hero mb-6 rounded-[32px]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="dashboard-kicker">
              {t("form_edit_loan")}
            </p>
            <h1 className="dashboard-title">
              Update your loan details
            </h1>
            <p className="dashboard-subtitle">
              Refine the loan record, change payment dates, or adjust participants without losing history.
            </p>
          </div>
          <div className="dashboard-note text-sm">
            <p className="font-semibold text-neutral-950">Review once more</p>
            <p className="mt-1 text-neutral-500 text-sm">
              Make sure the loan amount, dates and notes reflect the latest agreement.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[32px] border border-neutral-200 p-6 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.08)]">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
              Type
            </label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <div className="inline-flex bg-neutral-100 rounded-lg p-1">
                  {(["lent", "borrowed"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => field.onChange(t)}
                      className={clsx(
                        "px-5 py-2 rounded-md text-sm font-semibold capitalize transition-colors",
                        field.value === t
                          ? t === "lent"
                            ? "bg-blue-600 text-white shadow-sm"
                            : "bg-red-500 text-white shadow-sm"
                          : "text-neutral-500 hover:text-neutral-900",
                      )}>
                      {t}
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wide mb-1.5">
              Contact name *
            </label>
            <input
              {...register("contact_name")}
              className="w-full h-12 px-4 rounded-2xl border border-neutral-200 bg-white text-sm text-neutral-900 outline-none focus:border-blue-600 transition-colors"
            />
            {errors.contact_name && (
              <p className="text-red-500 text-xs mt-1">
                {errors.contact_name.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wide mb-1.5">
              Phone (optional)
            </label>
            <input
              {...register("phone")}
              type="tel"
              className="w-full h-12 px-4 rounded-2xl border border-neutral-200 bg-white text-sm text-neutral-900 outline-none focus:border-blue-600 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wide mb-1.5">
                Amount *
              </label>
              <input
                {...register("amount", { valueAsNumber: true })}
                type="number"
                inputMode="decimal"
                step="0.01"
                className="w-full h-12 px-4 rounded-2xl border border-neutral-200 bg-white text-sm text-neutral-900 outline-none focus:border-blue-600 transition-colors"
              />
              {errors.amount && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.amount.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wide mb-1.5">
                Currency
              </label>
              <select
                {...register("currency")}
                className="w-full h-12 px-4 rounded-2xl border border-neutral-200 text-sm text-neutral-900 outline-none focus:border-blue-600 bg-white transition-colors">
                {POPULAR_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} ({c.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wide mb-1.5">
                Loan date *
              </label>
              <input
                {...register("loan_date")}
                type="date"
                className="w-full h-12 px-4 rounded-2xl border border-neutral-200 bg-white text-sm text-neutral-900 outline-none focus:border-blue-600 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wide mb-1.5">
                Due date (optional)
              </label>
              <input
                {...register("due_date")}
                type="date"
                className="w-full h-12 px-4 rounded-2xl border border-neutral-200 bg-white text-sm text-neutral-900 outline-none focus:border-blue-600 transition-colors"
              />
            </div>
          </div>

          <InterestCalculator
            amount={Number(watchedAmount) || 0}
            currency={watchedCurrency || "GEL"}
            loanDate={watchedLoanDate}
            dueDate={watchedDueDate}
            rate={Number(watchedInterestRate) || 0}
            period={interestPeriod}
            onRateChange={(rate) =>
              setValue("interest_rate", rate, { shouldDirty: true })
            }
            onPeriodChange={setInterestPeriod}
          />

          <div>
            <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wide mb-1.5">
              {t("form_notes")}
            </label>
            <textarea
              {...register("notes")}
              rows={3}
              className="w-full px-4 py-3 rounded-2xl border border-neutral-200 bg-white text-sm text-neutral-900 outline-none focus:border-blue-600 resize-none transition-colors"
            />
          </div>

          {/* Attachment */}
          <div>
            <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wide mb-1.5">
              {t("form_attachment_label")}
            </label>
            {loan?.attachment_id && !attachmentFile && (
              <p className="text-xs text-neutral-500 mb-2">
                ✓ {t("form_attachment_hint")} ({t("btn_upload_attachment")} to
                replace)
              </p>
            )}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 h-10 px-4 rounded-xl border border-dashed border-neutral-300 cursor-pointer hover:border-neutral-400 transition-colors text-sm text-neutral-500 hover:text-neutral-700">
                <Paperclip size={14} />
                <span>
                  {attachmentFile
                    ? attachmentFile.name
                    : t("btn_upload_attachment")}
                </span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) =>
                    setAttachmentFile(e.target.files?.[0] ?? null)
                  }
                />
              </label>
              {attachmentFile && (
                <button
                  type="button"
                  onClick={() => setAttachmentFile(null)}
                  className="w-7 h-7 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Shared loan / Participants */}
          <div className="border border-neutral-200 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => handleToggleShared(!isShared)}
              className="w-full flex items-center justify-between px-4 py-3.5 bg-neutral-50 hover:bg-neutral-100 transition-colors">
              <div className="flex items-center gap-2.5">
                <Split size={15} className="text-neutral-500" />
                <span className="text-sm font-semibold text-neutral-700">
                  Shared loan
                </span>
                <span className="text-xs text-neutral-400">
                  — split among participants
                </span>
              </div>
              <div
                className={clsx(
                  "w-9 h-5 rounded-full transition-colors relative shrink-0",
                  isShared ? "bg-blue-600" : "bg-neutral-200",
                )}>
                <span
                  className={clsx(
                    "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform",
                    isShared ? "translate-x-4" : "translate-x-0.5",
                  )}
                />
              </div>
            </button>

            {isShared && (
              <div className="px-4 py-4 space-y-3 border-t border-neutral-100">
                {participants.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={p.name}
                      onChange={(e) =>
                        updateParticipant(i, "name", e.target.value)
                      }
                      placeholder={`Participant ${i + 1}`}
                      className="flex-1 h-10 px-3 rounded-xl border border-neutral-200 bg-white text-sm outline-none focus:border-blue-600 transition-colors placeholder:text-neutral-400"
                    />
                    <input
                      type="number"
                      value={p.amount || ""}
                      onChange={(e) =>
                        updateParticipant(i, "amount", e.target.value)
                      }
                      placeholder="0.00"
                      step="0.01"
                      className="w-28 h-10 px-3 rounded-xl border border-neutral-200 bg-white text-sm outline-none focus:border-blue-600 transition-colors placeholder:text-neutral-400"
                    />
                    <button
                      type="button"
                      onClick={() => removeParticipant(i)}
                      className="w-8 h-8 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={addParticipant}
                      disabled={participants.length >= 9}
                      className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-dashed border-neutral-300 text-xs font-medium text-neutral-500 hover:border-neutral-400 hover:text-neutral-700 disabled:opacity-40 transition-colors">
                      <Plus size={12} />
                      Add person
                    </button>
                    <button
                      type="button"
                      onClick={applyEqualSplit}
                      className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-dashed border-neutral-300 text-xs font-medium text-neutral-500 hover:border-neutral-400 hover:text-neutral-700 transition-colors">
                      <Split size={12} />
                      Equal split
                    </button>
                  </div>
                  <p className="text-xs text-neutral-400">
                    Total:{" "}
                    <span
                      className={clsx(
                        "font-semibold",
                        Math.abs(
                          participantTotal - (Number(watchedAmount) || 0),
                        ) < 0.01
                           ? "text-emerald-600"
                          : "text-amber-600",
                      )}>
                      {participantTotal.toFixed(2)}
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className={clsx(
              "w-full h-12 rounded-2xl text-sm font-semibold text-white disabled:opacity-50 transition-colors",
              loanType === "lent"
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-red-500 hover:bg-red-600",
            )}>
            {saving ? t("form_saving") : t("btn_save")}
          </button>
        </form>
      </div>
    </div>
  );
}
