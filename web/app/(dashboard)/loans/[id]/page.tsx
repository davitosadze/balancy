"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronLeft,
  Edit2,
  Trash2,
  Plus,
  AlertCircle,
  Calendar,
  MessageSquare,
  Percent,
  CheckCircle2,
  TrendingUp,
  Archive,
  ArchiveRestore,
  Paperclip,
  Receipt,
} from "lucide-react";
import clsx from "clsx";
import { useAuthStore } from "@/lib/store/auth";
import { useLoansStore } from "@/lib/store/loans";
import { useLangStore } from "@/lib/i18n";
import { useToastStore } from "@/lib/store/toast";
import { getFileUrl } from "@/lib/api/directus";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatAmount } from "@/lib/utils/currency";
import { formatDate, isOverdue, dueDateLabel } from "@/lib/utils/date";
import { calculateLoanFinancials } from "@/lib/utils/interest";
import type { Loan, Repayment } from "@/lib/types";
import AddRepaymentModal from "@/components/loans/AddRepaymentModal";
import RepaymentReceipt from "@/components/loans/RepaymentReceipt";

export default function LoanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuthStore();
  const {
    loans,
    loadLoan,
    removeLoan,
    loadRepayments,
    removeRepayment,
    repayments,
    archiveLoan,
  } = useLoansStore();
  const { t } = useLangStore();
  const toast = useToastStore();

  const [loan, setLoan] = useState<Loan | null>(
    loans.find((l) => String(l.id) === String(id)) ?? null,
  );
  const [loading, setLoading] = useState(!loan);
  const [showAddRepayment, setShowAddRepayment] = useState(false);
  const [deletingRepayment, setDeletingRepayment] = useState<string | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [receiptRepayment, setReceiptRepayment] = useState<Repayment | null>(
    null,
  );

  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      try {
        const l = await loadLoan(token, id);
        setLoan(l);
        await loadRepayments(token, id);
      } catch {
      } finally {
        setLoading(false);
      }
    })();
  }, [token, id]);

  // Keep loan in sync with store
  useEffect(() => {
    const updated = loans.find((l) => String(l.id) === String(id));
    if (updated) setLoan(updated);
  }, [loans, id]);

  const loanRepayments = repayments[id] ?? [];
  const financials = loan
    ? calculateLoanFinancials(loan, loanRepayments)
    : null;
  const paidSum = financials?.paid ?? 0;
  const remaining = financials?.remaining ?? 0;

  const handleSendReminder = () => {
    if (!loan) return;
    const lentLoan = loan.type === "lent";
    const direction = lentLoan
      ? `you owe me ${formatAmount(remaining, loan.currency)}`
      : `I owe you ${formatAmount(remaining, loan.currency)}`;
    const msg = `Hi ${loan.contact_name}, just a friendly reminder about our loan of ${formatAmount(loan.amount, loan.currency)} (${formatDate(loan.loan_date)}). Remaining: ${direction}. When would you be able to settle this?`;
    const phone = loan.phone?.replace(/[^\d+]/g, "");
    if (phone) {
      window.open(
        `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,
        "_blank",
      );
    } else {
      navigator.clipboard.writeText(msg).then(() => {
        toast.show(t("reminder_copied"));
      });
    }
  };

  const handleDelete = async () => {
    if (!token || !loan) return;
    if (!confirm(t("loan_delete_confirm", { name: loan.contact_name }))) return;
    setDeleting(true);
    try {
      await removeLoan(token, id);
      router.replace("/loans");
    } catch {
      setDeleting(false);
    }
  };

  const handleDeleteRepayment = async (repaymentId: string) => {
    if (!token || !loan) return;
    if (!confirm(t("loan_repayment_delete_confirm"))) return;
    setDeletingRepayment(repaymentId);
    try {
      await removeRepayment(token, repaymentId, id);
    } catch {
    } finally {
      setDeletingRepayment(null);
    }
  };

  const handleArchive = async () => {
    if (!token || !loan) return;
    const isArchiving = !loan.archived;
    if (
      !confirm(
        t(isArchiving ? "loan_archive_confirm" : "loan_unarchive_confirm"),
      )
    )
      return;
    setArchiving(true);
    try {
      await archiveLoan(token, id, isArchiving);
    } catch {
    } finally {
      setArchiving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="w-7 h-7 border-[3px] border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!loan) {
    return (
      <div className="max-w-6xl mx-auto px-8 py-16 text-center">
        <p className="text-neutral-500">{t("loan_not_found")}</p>
        <button
          onClick={() => router.replace("/loans")}
          className="mt-4 text-sm font-semibold text-neutral-900 underline">
          {t("loan_back_to_loans")}
        </button>
      </div>
    );
  }

  const overdue = loan.status !== "paid" && isOverdue(loan.due_date);
  const isLent = loan.type === "lent";
  const progressPct = financials?.progress ?? 0;

  return (
    <>
      <div className="max-w-6xl mx-auto px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-7">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 transition-colors">
            <ChevronLeft size={16} />
            {t("btn_back")}
          </button>
          <div className="flex items-center gap-2">
            {loan.status !== "paid" && (
              <button
                onClick={handleSendReminder}
                title={
                  loan.phone
                    ? t("loan_send_reminder_wa")
                    : t("loan_copy_reminder")
                }
                className="w-9 h-9 rounded-lg border border-neutral-200 bg-white hover:bg-stone-50 hover:border-stone-200 text-neutral-500 hover:text-stone-600 flex items-center justify-center transition-colors">
                <MessageSquare size={15} />
              </button>
            )}
            <button
              onClick={handleArchive}
              disabled={archiving}
              title={loan.archived ? t("btn_unarchive") : t("btn_archive")}
              className="w-9 h-9 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-500 flex items-center justify-center transition-colors disabled:opacity-50">
              {loan.archived ? (
                <ArchiveRestore size={15} />
              ) : (
                <Archive size={15} />
              )}
            </button>
            <button
              onClick={() => router.push(`/loans/${id}/edit`)}
              className="w-9 h-9 rounded-lg border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-500 flex items-center justify-center transition-colors">
              <Edit2 size={15} />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-9 h-9 rounded-lg border border-neutral-200 bg-white hover:bg-red-50 hover:border-red-200 text-neutral-500 hover:text-red-500 flex items-center justify-center transition-colors disabled:opacity-50">
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {/* Main card */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 mb-4 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-[20px] font-bold text-neutral-900 tracking-tight">
                {loan.contact_name}
              </h1>
              {loan.phone && (
                <p className="text-sm text-neutral-400 mt-0.5">{loan.phone}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span
                className={clsx(
                  "text-[11px] font-semibold px-2.5 py-1 rounded-full",
                  isLent
                    ? "bg-stone-50 text-stone-700"
                    : "bg-red-50 text-red-600",
                )}>
                {isLent ? t("loan_lent_badge") : t("loan_borrowed_badge")}
              </span>
              <StatusBadge status={loan.status} />
              {loan.archived && (
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-500">
                  {t("loan_archived_badge")}
                </span>
              )}
            </div>
          </div>

          {/* Amount */}
          <div className="mb-5">
            <p
              className={clsx(
                "text-[32px] font-extrabold tracking-tight leading-none",
                isLent ? "text-stone-700" : "text-red-600",
              )}>
              {formatAmount(financials?.totalDue ?? loan.amount, loan.currency)}
            </p>
            <div className="mt-2 grid gap-2 text-sm text-neutral-500 sm:grid-cols-3">
              <p>
                Principal{" "}
                <span className="font-semibold text-neutral-800">
                  {formatAmount(loan.amount, loan.currency)}
                </span>
              </p>
              <p>
                Paid{" "}
                <span className="font-semibold text-emerald-700">
                  {formatAmount(paidSum, loan.currency)}
                </span>
              </p>
              <p>
                Remaining{" "}
                <span className="font-semibold text-red-600">
                  {formatAmount(remaining, loan.currency)}
                </span>
              </p>
            </div>
          </div>

          {/* Progress bar */}
          {progressPct > 0 && (
            <div className="mb-5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide">
                  {t("loan_progress")}
                </span>
                <span className="text-[11px] font-bold text-neutral-600">
                  {progressPct.toFixed(0)}%
                </span>
              </div>
              <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                <div
                  className={clsx(
                    "h-full rounded-full transition-all duration-500",
                    progressPct >= 100
                      ? "bg-stone-500"
                      : isLent
                        ? "bg-blue-500"
                        : "bg-red-400",
                  )}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="space-y-2.5">
            <MetaRow
              icon={<Calendar size={13} />}
              label={t("loan_date")}
              value={formatDate(loan.loan_date)}
            />
            {loan.due_date && (
              <MetaRow
                icon={<Calendar size={13} />}
                label={t("loan_due_date")}
                value={
                  <span
                    className={clsx(overdue && "text-amber-600 font-medium")}>
                    {overdue && (
                      <AlertCircle size={12} className="inline mr-1 -mt-0.5" />
                    )}
                    {formatDate(loan.due_date)}{" "}
                    <span className="text-neutral-400 font-normal">
                      ({dueDateLabel(loan.due_date)})
                    </span>
                  </span>
                }
              />
            )}
            {loan.interest_rate != null && loan.interest_rate > 0 && (
              <MetaRow
                icon={<Percent size={13} />}
                label={t("loan_interest")}
                value={t("loan_interest_pa", { rate: loan.interest_rate })}
              />
            )}
            {financials && financials.interest > 0 && (
              <div className="mt-1 flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
                <TrendingUp
                  size={13}
                  className="text-blue-600 mt-0.5 shrink-0"
                />
                <div>
                  <p className="text-sm font-semibold text-blue-800">
                    Interest included:{" "}
                    {formatAmount(financials.interest, loan.currency)}
                  </p>
                  <p className="text-xs text-blue-600 mt-0.5">
                    {financials.interestDays} day
                    {financials.interestDays === 1 ? "" : "s"} at{" "}
                    {financials.annualRate}% yearly
                  </p>
                </div>
              </div>
            )}
            {loan.notes && (
              <MetaRow
                icon={<MessageSquare size={13} />}
                label={t("loan_notes")}
                value={loan.notes}
              />
            )}
            {loan.attachment_id &&
              token &&
              (() => {
                const url = getFileUrl(loan.attachment_id, token);
                return url ? (
                  <MetaRow
                    icon={<Paperclip size={13} />}
                    label={t("loan_attachment")}
                    value={
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-700 underline text-sm break-all">
                        {t("btn_upload_attachment")}
                      </a>
                    }
                  />
                ) : null;
              })()}
          </div>
        </div>

        {/* Repayments */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-[15px] text-neutral-900">
              {t("loan_repayments_section")}
            </h2>
            {loan.status !== "paid" && (
              <button
                onClick={() => setShowAddRepayment(true)}
                className="flex items-center gap-1.5 h-8 px-3 bg-neutral-950 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition-colors">
                <Plus size={13} />
                {t("loan_add_repayment_btn")}
              </button>
            )}
          </div>

          {loanRepayments.length === 0 ? (
            <p className="text-sm text-neutral-400 text-center py-6">
              {t("loan_no_repayments")}
            </p>
          ) : (
            <div className="divide-y divide-neutral-100">
              {loanRepayments.map((r) => (
                <RepaymentRow
                  key={r.id}
                  repayment={r}
                  currency={loan.currency}
                  onDelete={() => handleDeleteRepayment(r.id)}
                  deleting={deletingRepayment === r.id}
                  onReceipt={() => setReceiptRepayment(r)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {showAddRepayment && loan && (
        <AddRepaymentModal
          loan={loan}
          remaining={remaining}
          totalDue={financials?.totalDue}
          onClose={() => setShowAddRepayment(false)}
        />
      )}
      {receiptRepayment && loan && (
        <RepaymentReceipt
          repayment={receiptRepayment}
          loan={loan}
          onClose={() => setReceiptRepayment(null)}
        />
      )}
    </>
  );
}

function MetaRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-neutral-400 mt-0.5 shrink-0">{icon}</span>
      <span className="text-neutral-400 text-sm shrink-0 w-[76px]">
        {label}
      </span>
      <span className="text-neutral-900 text-sm flex-1">{value}</span>
    </div>
  );
}

function RepaymentRow({
  repayment,
  currency,
  onDelete,
  deleting,
  onReceipt,
}: {
  repayment: Repayment;
  currency: string;
  onDelete: () => void;
  deleting: boolean;
  onReceipt: () => void;
}) {
  const { t } = useLangStore();
  return (
    <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-full bg-stone-50 flex items-center justify-center shrink-0">
          <CheckCircle2 size={13} className="text-stone-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-neutral-900">
            {formatAmount(Number(repayment.amount), currency)}
          </p>
          <p className="text-xs text-neutral-400">
            {formatDate(repayment.date)}
            {repayment.paid_by ? ` · ${repayment.paid_by}` : ""}
            {repayment.notes ? ` · ${repayment.notes}` : ""}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={onReceipt}
          title={t("btn_receipt")}
          className="w-7 h-7 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors flex items-center justify-center">
          <Receipt size={13} />
        </button>
        <button
          onClick={onDelete}
          disabled={deleting}
          className="w-7 h-7 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors flex items-center justify-center">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
