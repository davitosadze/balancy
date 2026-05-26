import { create } from "zustand";
import type {
  Loan,
  Repayment,
  Contact,
  LoanStats,
  CurrencyBalance,
  MonthlyStats,
  ContactStats,
  ActivityEvent,
} from "@/lib/types";
import {
  fetchLoans,
  fetchLoanById,
  createLoan,
  updateLoan,
  deleteLoan,
  fetchRepaymentsByLoan,
  fetchAllRepayments,
  createRepayment,
  deleteRepayment,
  fetchContacts,
  createContact,
} from "@/lib/api/directus";
import { calculateLoanFinancials } from "@/lib/utils/interest";

function computeStatus(paidAmount: number, total: number): Loan["status"] {
  if (paidAmount <= 0) return "active";
  if (paidAmount >= total) return "paid";
  return "partially_paid";
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

interface LoansState {
  loans: Loan[];
  repayments: Record<string, Repayment[]>;
  contacts: Contact[];
  isLoading: boolean;
  error: string | null;

  loadLoans: (token: string) => Promise<void>;
  loadLoan: (token: string, id: string) => Promise<Loan>;
  addLoan: (
    token: string,
    data: Omit<
      Loan,
      "id" | "user_created" | "date_created" | "date_updated" | "status"
    >,
  ) => Promise<Loan>;
  editLoan: (token: string, id: string, data: Partial<Loan>) => Promise<void>;
  removeLoan: (token: string, id: string) => Promise<void>;
  archiveLoan: (token: string, id: string, archived: boolean) => Promise<void>;

  loadRepayments: (token: string, loanId: string) => Promise<void>;
  addRepayment: (
    token: string,
    data: {
      loan_id: string;
      amount: number;
      date: string;
      notes?: string;
      paid_by?: string;
      loanTotal: number;
    },
  ) => Promise<void>;
  removeRepayment: (
    token: string,
    repaymentId: string,
    loanId: string,
  ) => Promise<void>;

  loadContacts: (token: string) => Promise<void>;
  addContact: (
    token: string,
    data: { name: string; phone?: string },
  ) => Promise<Contact>;

  loadAllRepayments: (token: string) => Promise<void>;
  getStats: () => LoanStats;
  getActivityFeed: () => ActivityEvent[];
  clearError: () => void;
}

export const useLoansStore = create<LoansState>((set, get) => ({
  loans: [],
  repayments: {},
  contacts: [],
  isLoading: false,
  error: null,

  loadLoans: async (token) => {
    set({ isLoading: true, error: null });
    try {
      const loans = (await fetchLoans(token)) as Loan[];
      set({ loans, isLoading: false });
    } catch (e: unknown) {
      set({ error: getErrorMessage(e, "Failed to load loans"), isLoading: false });
    }
  },

  loadLoan: async (token, id) => {
    const loan = (await fetchLoanById(token, id)) as Loan;
    set((s) => ({
      loans: s.loans.find((l) => String(l.id) === String(id))
        ? s.loans.map((l) => (String(l.id) === String(id) ? loan : l))
        : [...s.loans, loan],
    }));
    return loan;
  },

  addLoan: async (token, data) => {
    const loan = (await createLoan(
      token,
      data as Record<string, unknown>,
    )) as Loan;
    set((s) => ({ loans: [loan, ...s.loans] }));
    return loan;
  },

  editLoan: async (token, id, data) => {
    const updated = (await updateLoan(
      token,
      id,
      data as Record<string, unknown>,
    )) as Loan;
    set((s) => ({
      loans: s.loans.map((l) => (String(l.id) === String(id) ? updated : l)),
    }));
  },

  removeLoan: async (token, id) => {
    await deleteLoan(token, id);
    set((s) => ({
      loans: s.loans.filter((l) => String(l.id) !== String(id)),
      repayments: Object.fromEntries(
        Object.entries(s.repayments).filter(([k]) => String(k) !== String(id)),
      ),
    }));
  },

  archiveLoan: async (token, id, archived) => {
    const updated = (await updateLoan(token, id, { archived })) as Loan;
    set((s) => ({
      loans: s.loans.map((l) => (String(l.id) === String(id) ? updated : l)),
    }));
  },

  loadRepayments: async (token, loanId) => {
    const reps = (await fetchRepaymentsByLoan(token, loanId)) as Repayment[];
    set((s) => ({ repayments: { ...s.repayments, [loanId]: reps } }));
  },

  addRepayment: async (
    token,
    { loan_id, amount, date, notes, paid_by, loanTotal },
  ) => {
    const repayment = (await createRepayment(token, {
      loan_id,
      amount,
      date,
      notes,
      paid_by,
    })) as Repayment;
    set((s) => {
      const existing = s.repayments[loan_id] ?? [];
      const updated = [repayment, ...existing];
      const paidSum = updated.reduce((acc, r) => acc + Number(r.amount), 0);
      const newStatus = computeStatus(paidSum, loanTotal);
      return {
        repayments: { ...s.repayments, [loan_id]: updated },
        loans: s.loans.map((l) =>
          l.id === loan_id ? { ...l, status: newStatus } : l,
        ),
      };
    });
    const repayments = get().repayments[loan_id] ?? [];
    const paidSum = repayments.reduce((acc, r) => acc + Number(r.amount), 0);
    await updateLoan(token, loan_id, {
      status: computeStatus(paidSum, loanTotal),
    });
  },

  removeRepayment: async (token, repaymentId, loanId) => {
    await deleteRepayment(token, repaymentId);
    const loan = get().loans.find((l) => l.id === loanId);
    set((s) => {
      const updated = (s.repayments[loanId] ?? []).filter(
        (r) => r.id !== repaymentId,
      );
      const paidSum = updated.reduce((acc, r) => acc + Number(r.amount), 0);
      const loanTotal = loan
        ? calculateLoanFinancials(loan, updated).totalDue
        : 0;
      const newStatus = loan ? computeStatus(paidSum, loanTotal) : "active";
      return {
        repayments: { ...s.repayments, [loanId]: updated },
        loans: s.loans.map((l) =>
          l.id === loanId ? { ...l, status: newStatus } : l,
        ),
      };
    });
    if (loan) {
      const repayments = get().repayments[loanId] ?? [];
      const paidSum = repayments.reduce((acc, r) => acc + Number(r.amount), 0);
      const loanTotal = calculateLoanFinancials(loan, repayments).totalDue;
      await updateLoan(token, loanId, {
        status: computeStatus(paidSum, loanTotal),
      });
    }
  },

  loadContacts: async (token) => {
    const contacts = (await fetchContacts(token)) as Contact[];
    set({ contacts });
  },

  addContact: async (token, data) => {
    const contact = (await createContact(token, data)) as Contact;
    set((s) => ({ contacts: [...s.contacts, contact] }));
    return contact;
  },

  loadAllRepayments: async (token) => {
    try {
      const all = (await fetchAllRepayments(token)) as Repayment[];
      const grouped: Record<string, Repayment[]> = {};
      for (const r of all) {
        if (!grouped[r.loan_id]) grouped[r.loan_id] = [];
        grouped[r.loan_id].push(r);
      }
      set((s) => ({ repayments: { ...s.repayments, ...grouped } }));
    } catch {}
  },

  getStats: (): LoanStats => {
    const { loans, repayments } = get();
    const statusCount = { active: 0, partially_paid: 0, paid: 0 };
    const currencyMap: Record<string, CurrencyBalance> = {};
    const today = new Date().toISOString().split("T")[0];
    const overdue: Loan[] = [];

    const monthlyByCurrency: Record<string, Record<string, MonthlyStats>> = {};
    const now = new Date();
    const last6Months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      last6Months.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      );
    }
    const getMonthBucket = (currency: string, month: string): MonthlyStats => {
      if (!monthlyByCurrency[currency]) monthlyByCurrency[currency] = {};
      if (!monthlyByCurrency[currency][month])
        monthlyByCurrency[currency][month] = {
          month,
          lent: 0,
          borrowed: 0,
          repaid: 0,
          currency,
        };
      return monthlyByCurrency[currency][month];
    };

    const contactMap: Record<string, ContactStats> = {};

    for (const loan of loans) {
      statusCount[loan.status] = (statusCount[loan.status] ?? 0) + 1;

      if (!currencyMap[loan.currency]) {
        currencyMap[loan.currency] = {
          currency: loan.currency,
          totalLent: 0,
          totalBorrowed: 0,
          outstandingLent: 0,
          outstandingBorrowed: 0,
        };
      }
      const cb = currencyMap[loan.currency];
      const loanRepayments = repayments[loan.id] ?? [];
      const paid = loanRepayments.reduce((s, r) => s + Number(r.amount), 0);
      const financials = calculateLoanFinancials(loan, loanRepayments);
      const outstanding = financials.remaining;

      if (loan.type === "lent") {
        cb.totalLent += Number(loan.amount);
        cb.outstandingLent += outstanding;
      } else {
        cb.totalBorrowed += Number(loan.amount);
        cb.outstandingBorrowed += outstanding;
      }

      if (loan.due_date && loan.due_date < today && loan.status !== "paid") {
        overdue.push(loan);
      }

      const loanMonth = loan.loan_date.substring(0, 7);
      if (last6Months.includes(loanMonth)) {
        const bucket = getMonthBucket(loan.currency, loanMonth);
        if (loan.type === "lent") bucket.lent += Number(loan.amount);
        else bucket.borrowed += Number(loan.amount);
      }

      const contactKey = loan.contact_id ?? loan.contact_name;
      if (!contactMap[contactKey]) {
        contactMap[contactKey] = {
          name: loan.contact_name,
          phone: loan.phone,
          totalLoans: 0,
          paidOnTime: 0,
          paidLate: 0,
          outstanding: 0,
        };
      }
      const cs = contactMap[contactKey];
      cs.totalLoans++;
      const isFullyPaid = paid >= financials.totalDue;
      if (!isFullyPaid) {
        cs.outstanding++;
      } else if (loan.due_date) {
        const lastRep = [...loanRepayments].sort((a, b) =>
          b.date.localeCompare(a.date),
        )[0];
        if (lastRep && lastRep.date <= loan.due_date) cs.paidOnTime++;
        else cs.paidLate++;
      } else {
        cs.paidOnTime++;
      }
    }

    const userLoanIds = new Set(loans.map((l) => l.id));
    const loanCurrencyMap: Record<string, string> = {};
    for (const loan of loans) loanCurrencyMap[loan.id] = loan.currency;

    for (const [loanId, loanRepayments] of Object.entries(repayments)) {
      if (!userLoanIds.has(loanId)) continue;
      const currency = loanCurrencyMap[loanId];
      if (!currency) continue;
      for (const r of loanRepayments) {
        const rMonth = r.date.substring(0, 7);
        if (last6Months.includes(rMonth)) {
          getMonthBucket(currency, rMonth).repaid += Number(r.amount);
        }
      }
    }

    return {
      byStatus: statusCount,
      byCurrency: Object.values(currencyMap),
      overdue,
      totalLoans: loans.length,
      monthly: Object.fromEntries(
        Object.entries(monthlyByCurrency).map(([cur, map]) => [
          cur,
          last6Months.filter((m) => map[m]).map((m) => map[m]),
        ]),
      ),
      contactStats: Object.values(contactMap).sort(
        (a, b) => b.totalLoans - a.totalLoans,
      ),
    };
  },

  clearError: () => set({ error: null }),

  getActivityFeed: (): ActivityEvent[] => {
    const { loans, repayments } = get();
    const today = new Date().toISOString().split("T")[0];
    const events: ActivityEvent[] = [];

    for (const loan of loans) {
      if (loan.archived) continue;

      // loan_created event
      events.push({
        id: `loan_created_${loan.id}`,
        type: "loan_created",
        date: loan.date_created,
        loan,
      });

      // repayment events — sort ascending to track running total
      const loanReps = [...(repayments[loan.id] ?? [])].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
      let runningPaid = 0;
      for (const repayment of loanReps) {
        runningPaid += Number(repayment.amount);
        const fullyPaid = runningPaid >= Number(loan.amount);
        events.push({
          id: `repayment_${repayment.id}`,
          type:
            fullyPaid && loan.status === "paid" ? "loan_paid" : "repayment_made",
          date: repayment.date,
          loan,
          repayment,
        });
      }

      // overdue synthetic event at the due_date
      if (loan.status !== "paid" && loan.due_date && loan.due_date < today) {
        events.push({
          id: `overdue_${loan.id}`,
          type: "loan_overdue",
          date: loan.due_date,
          loan,
        });
      }
    }

    return events
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 60);
  },
}));
