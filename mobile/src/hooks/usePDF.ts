import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import type { Loan, Repayment } from "@/types";
import { formatAmount } from "@utils/currency";
import { formatDate } from "@utils/date";
import i18n from "@i18n/setup";

interface GeneratePDFOptions {
  loan: Loan;
  repayments: Repayment[];
  userName: string;
}

function t(key: string) {
  return i18n.t(key);
}

function buildHTML(
  loan: Loan,
  repayments: Repayment[],
  userName: string,
): string {
  const isLent = loan.type === "lent";
  const lender = isLent ? userName : loan.contact_name;
  const borrower = isLent ? loan.contact_name : userName;
  const paidSum = repayments.reduce((s, r) => s + Number(r.amount), 0);
  const outstanding = Math.max(0, Number(loan.amount) - paidSum);
  const generatedOn = formatDate(new Date().toISOString());

  const repaymentsRows =
    repayments.length === 0
      ? `<tr><td colspan="3" style="text-align:center;color:#94a3b8;">${t("repayments.noRepayments")}</td></tr>`
      : repayments
          .map(
            (r, i) => `
          <tr>
            <td>${i + 1}</td>
            <td>${formatDate(r.date)}</td>
            <td style="text-align:right;font-weight:600;">${formatAmount(Number(r.amount), loan.currency)}</td>
          </tr>`,
          )
          .join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 40px; color: #1e293b; }
  h1 { color: #1a56db; font-size: 24px; margin-bottom: 4px; }
  .subtitle { color: #64748b; font-size: 13px; margin-bottom: 32px; }
  .badge {
    display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; margin-bottom: 20px;
    background: ${isLent ? "#d1fae5" : "#fee2e2"}; color: ${isLent ? "#065f46" : "#991b1b"};
  }
  .parties { display: flex; gap: 32px; margin-bottom: 28px; }
  .party { flex: 1; background: #f8fafc; border-radius: 10px; padding: 14px 18px; border-left: 4px solid #1a56db; }
  .party label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; }
  .party .name { font-size: 18px; font-weight: 700; margin-top: 4px; }
  .details { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
  .details td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
  .details td:first-child { color: #64748b; font-size: 13px; width: 40%; }
  .details td:last-child { font-weight: 600; }
  .amounts { display: flex; gap: 16px; margin-bottom: 28px; }
  .amount-box { flex: 1; text-align: center; border-radius: 10px; padding: 16px; }
  .amount-box label { font-size: 11px; text-transform: uppercase; color: #64748b; }
  .amount-box .val { font-size: 22px; font-weight: 800; margin-top: 4px; }
  .repayments-table { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
  .repayments-table th { background: #f1f5f9; padding: 8px 12px; font-size: 12px; text-transform: uppercase; color: #64748b; text-align: left; }
  .repayments-table td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
  .terms { background: #f8fafc; border-radius: 10px; padding: 16px; margin-bottom: 28px; font-size: 13px; color: #475569; line-height: 1.6; }
  .footer { text-align: center; font-size: 11px; color: #94a3b8; margin-top: 40px; }
  .sig { display: flex; gap: 48px; margin-top: 48px; }
  .sig-block { flex: 1; }
  .sig-line { border-top: 1px solid #334155; padding-top: 6px; font-size: 12px; color: #64748b; margin-top: 40px; }
</style>
</head>
<body>
  <h1>💰 ${t("pdf.loanAgreement")}</h1>
  <p class="subtitle">${t("pdf.generatedOn")}: ${generatedOn}</p>
  <div class="badge">${isLent ? t("loans.iLent") : t("loans.iBorrowed")}</div>

  <div class="parties">
    <div class="party">
      <label>${t("pdf.lender")}</label>
      <div class="name">${lender}</div>
    </div>
    <div class="party">
      <label>${t("pdf.borrower")}</label>
      <div class="name">${borrower}</div>
    </div>
  </div>

  <table class="details">
    <tr>
      <td>${t("pdf.loanAmount")}</td>
      <td>${formatAmount(Number(loan.amount), loan.currency)}</td>
    </tr>
    <tr>
      <td>${t("pdf.loanDate")}</td>
      <td>${formatDate(loan.loan_date)}</td>
    </tr>
    <tr>
      <td>${t("pdf.dueDate")}</td>
      <td>${loan.due_date ? formatDate(loan.due_date) : "—"}</td>
    </tr>
    ${loan.phone ? `<tr><td>Phone</td><td>${loan.phone}</td></tr>` : ""}
    ${loan.notes ? `<tr><td>${t("loans.notes")}</td><td>${loan.notes}</td></tr>` : ""}
  </table>

  <div class="amounts">
    <div class="amount-box" style="background:#dbeafe;">
      <label>${t("loans.totalAmount")}</label>
      <div class="val" style="color:#1a56db;">${formatAmount(Number(loan.amount), loan.currency)}</div>
    </div>
    <div class="amount-box" style="background:#d1fae5;">
      <label>${t("loans.paidAmount")}</label>
      <div class="val" style="color:#065f46;">${formatAmount(paidSum, loan.currency)}</div>
    </div>
    <div class="amount-box" style="background:${outstanding > 0 ? "#fee2e2" : "#d1fae5"};">
      <label>${t("loans.outstandingBalance")}</label>
      <div class="val" style="color:${outstanding > 0 ? "#991b1b" : "#065f46"};">${formatAmount(outstanding, loan.currency)}</div>
    </div>
  </div>

  <h2 style="font-size:15px;margin-bottom:10px;">${t("repayments.repaymentHistory")}</h2>
  <table class="repayments-table">
    <thead>
      <tr>
        <th>#</th>
        <th>${t("repayments.repaymentDate")}</th>
        <th style="text-align:right;">${t("repayments.repaymentAmount")}</th>
      </tr>
    </thead>
    <tbody>${repaymentsRows}</tbody>
  </table>

  <div class="terms">
    <strong>${t("pdf.terms")}:</strong><br/>
    ${t("pdf.termsText")}
  </div>

  <div class="sig">
    <div class="sig-block">
      <div class="sig-line">${t("pdf.lender")}: ${lender}</div>
    </div>
    <div class="sig-block">
      <div class="sig-line">${t("pdf.borrower")}: ${borrower}</div>
    </div>
  </div>

  <div class="footer">Generated by Balancy · ${generatedOn}</div>
</body>
</html>`;
}

export function usePDF() {
  const generatePDF = async ({
    loan,
    repayments,
    userName,
  }: GeneratePDFOptions) => {
    const html = buildHTML(loan, repayments, userName);
    const { uri } = await Print.printToFileAsync({ html, base64: false });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: t("pdf.shareAgreement"),
        UTI: "com.adobe.pdf",
      });
    }
  };

  return { generatePDF };
}
