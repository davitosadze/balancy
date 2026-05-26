"use client";

import { Printer, X } from "lucide-react";
import { formatAmount } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import { useLangStore } from "@/lib/i18n";
import type { Repayment, Loan } from "@/lib/types";

interface Props {
  repayment: Repayment;
  loan: Loan;
  onClose: () => void;
}

export default function RepaymentReceipt({ repayment, loan, onClose }: Props) {
  const { t } = useLangStore();
  const shortId = String(repayment.id).slice(-8).toUpperCase();

  const handlePrint = () => window.print();

  return (
    <>
      {/* Overlay — hidden in print */}
      <div
        className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 print:hidden"
        onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
          {/* Modal controls */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 print:hidden">
            <h2 className="font-semibold text-[15px] text-neutral-900">
              {t("receipt_title")}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 h-8 px-3 bg-neutral-950 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition-colors">
                <Printer size={13} />
                {t("receipt_print")}
              </button>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-50 flex items-center justify-center transition-colors">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Receipt body */}
          <div id="receipt-body" className="p-6">
            <ReceiptContent
              repayment={repayment}
              loan={loan}
              shortId={shortId}
            />
          </div>
        </div>
      </div>

      {/* Print-only full-page receipt */}
      <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-10">
        <ReceiptContent repayment={repayment} loan={loan} shortId={shortId} />
      </div>
    </>
  );
}

function ReceiptContent({
  repayment,
  loan,
  shortId,
}: {
  repayment: Repayment;
  loan: Loan;
  shortId: string;
}) {
  const { t } = useLangStore();

  return (
    <div className="font-mono text-sm">
      {/* Header */}
      <div className="text-center mb-6">
        <p className="font-bold text-xl tracking-tight">Balancy</p>
        <p className="text-neutral-400 text-xs mt-0.5">{t("receipt_title")}</p>
      </div>

      <div className="border-t border-dashed border-neutral-300 my-4" />

      {/* Receipt details */}
      <div className="space-y-2.5">
        <ReceiptLine
          label={t("receipt_receipt_no")}
          value={`#${shortId}`}
          bold
        />
        <ReceiptLine label={t("receipt_from")} value={loan.contact_name} />
        <ReceiptLine
          label={t("receipt_loan_ref")}
          value={`${loan.type === "lent" ? t("loan_lent_badge") : t("loan_borrowed_badge")} – ${formatAmount(loan.amount, loan.currency)}`}
        />
        <ReceiptLine
          label={t("receipt_loan_date")}
          value={formatDate(loan.loan_date)}
        />
        <ReceiptLine
          label={t("receipt_payment_date")}
          value={formatDate(repayment.date)}
        />
      </div>

      <div className="border-t border-dashed border-neutral-300 my-4" />

      {/* Amount */}
      <div className="flex items-center justify-between">
        <span className="text-neutral-500 text-xs uppercase tracking-wider">
          {t("receipt_amount_paid")}
        </span>
        <span className="font-bold text-lg">
          {formatAmount(Number(repayment.amount), loan.currency)}
        </span>
      </div>

      {repayment.paid_by && (
        <>
          <div className="border-t border-dashed border-neutral-300 my-4" />
          <ReceiptLine label={t("receipt_paid_by")} value={repayment.paid_by} />
        </>
      )}

      {repayment.notes && (
        <>
          {!repayment.paid_by && (
            <div className="border-t border-dashed border-neutral-300 my-4" />
          )}
          <ReceiptLine label={t("receipt_notes")} value={repayment.notes} />
        </>
      )}

      <div className="border-t border-dashed border-neutral-300 my-4" />

      <p className="text-center text-neutral-400 text-[11px]">
        {t("receipt_generated")}
      </p>
    </div>
  );
}

function ReceiptLine({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-neutral-400 text-xs shrink-0">{label}</span>
      <span
        className={`text-neutral-900 text-xs text-right ${bold ? "font-bold" : ""}`}>
        {value}
      </span>
    </div>
  );
}
