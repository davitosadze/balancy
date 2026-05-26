import type { Loan, Repayment } from "@/lib/types";

export function countInterestDays(
  loanDate: string | null | undefined,
  dueDate: string | null | undefined,
  asOf = new Date(),
) {
  if (!loanDate) return 0;
  const start = parseDateOnly(loanDate);
  const due = dueDate ? parseDateOnly(dueDate) : null;
  const today = parseDateOnly(asOf.toISOString().split("T")[0]);
  if (!start || !today) return 0;

  const end = due && due.getTime() > today.getTime() ? due : today;
  const diff = end.getTime() - start.getTime();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

export function calculateLoanFinancials(
  loan: Loan,
  repayments: Repayment[] = [],
  asOf = new Date(),
) {
  const principal = Number(loan.amount) || 0;
  const paid = repayments.reduce((sum, repayment) => {
    return sum + Number(repayment.amount || 0);
  }, 0);
  const annualRate = Math.max(0, Number(loan.interest_rate || 0));
  const interestDays =
    loan.status === "paid" ? 0 : countInterestDays(loan.loan_date, loan.due_date, asOf);
  const interest = principal * (annualRate / 100) * (interestDays / 365);
  const totalDue = principal + interest;
  const remaining = Math.max(0, totalDue - paid);
  const progress = totalDue > 0 ? Math.min(100, (paid / totalDue) * 100) : 0;

  return {
    principal,
    annualRate,
    interestDays,
    interest,
    totalDue,
    paid,
    remaining,
    progress,
  };
}

function parseDateOnly(value: string) {
  const date = new Date(`${value.substring(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}
