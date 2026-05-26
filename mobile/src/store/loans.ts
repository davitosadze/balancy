import { create } from "zustand";
import type {
  Loan,
  Repayment,
  Contact,
  LoanStats,
  CurrencyBalance,
  MonthlyStats,
  ContactStats,
} from "@/types";
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
} from "@api/directus";
import { cancelLoanNotifications } from "@utils/loanNotifications";

interface LoansState {
  loans: Loan[];
  repayments: Record<string, Repayment[]>; // key = loanId
  contacts: Contact[];
  isLoading: boolean;
  error: string | null;

  loadLoans: () => Promise<void>;
  loadLoan: (id: string) => Promise<Loan>;
  addLoan: (
    data: Omit<
      Loan,
      "id" | "user_created" | "date_created" | "date_updated" | "status"
    >,
  ) => Promise<Loan>;
  editLoan: (id: string, data: Partial<Loan>) => Promise<void>;
  removeLoan: (id: string) => Promise<void>;

  loadRepayments: (loanId: string) => Promise<void>;
  addRepayment: (data: {
    loan_id: string;
    amount: number;
    date: string;
    notes?: string;
    paid_by?: string;
    loanTotal: number;
  }) => Promise<void>;
  removeRepayment: (repaymentId: string, loanId: string) => Promise<void>;

  loadContacts: () => Promise<void>;
  addContact: (data: { name: string; phone?: string }) => Promise<Contact>;

  loadAllRepayments: () => Promise<void>;
  getStats: () => LoanStats;
  clearError: () => void;
}

function computeStatus(paidAmount: number, total: number): Loan["status"] {
  if (paidAmount <= 0) return "active";
  if (paidAmount >= total) return "paid";
  return "partially_paid";
}

export const useLoansStore = create<LoansState>((set, get) => ({
  loans: [],
  repayments: {},
  contacts: [],
  isLoading: false,
  error: null,

  loadLoans: async () => {
    set({ isLoading: true, error: null });
    try {
      const loans = (await fetchLoans()) as Loan[];
      set({ loans, isLoading: false });
    } catch (e: any) {
      set({ error: e?.message ?? "Failed to load loans", isLoading: false });
    }
  },

  loadLoan: async (id) => {
    const loan = (await fetchLoanById(id)) as Loan;
    set((s) => ({
      loans: s.loans.map((l) => (l.id === id ? loan : l)),
    }));
    return loan;
  },

  addLoan: async (data) => {
    const loan = (await createLoan(data)) as Loan;
    set((s) => ({ loans: [loan, ...s.loans] }));
    return loan;
  },

  editLoan: async (id, data) => {
    const updated = (await updateLoan(id, data)) as Loan;
    set((s) => ({
      loans: s.loans.map((l) => (l.id === id ? { ...l, ...updated } : l)),
    }));
  },

  removeLoan: async (id) => {
    await deleteLoan(id);
    set((s) => ({
      loans: s.loans.filter((l) => l.id !== id),
      repayments: Object.fromEntries(
        Object.entries(s.repayments).filter(([k]) => k !== id),
      ),
    }));
  },

  loadRepayments: async (loanId) => {
    try {
      const list = (await fetchRepaymentsByLoan(loanId)) as Repayment[];
      set((s) => ({ repayments: { ...s.repayments, [loanId]: list } }));
    } catch (e: any) {
      console.error("loadRepayments error:", e?.message);
      set({ error: e?.message ?? "Failed to load repayments" });
    }
  },

  addRepayment: async ({
    loan_id,
    amount,
    date,
    notes,
    paid_by,
    loanTotal,
  }) => {
    const repayment = (await createRepayment({
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
      if (newStatus === "paid") {
        cancelLoanNotifications(loan_id).catch(() => {});
      }
      return {
        repayments: { ...s.repayments, [loan_id]: updated },
        loans: s.loans.map((l) =>
          l.id === loan_id ? { ...l, status: newStatus } : l,
        ),
      };
    });
    // persist status update to server
    const repayments = get().repayments[loan_id] ?? [];
    const paidSum = repayments.reduce((acc, r) => acc + Number(r.amount), 0);
    await updateLoan(loan_id, { status: computeStatus(paidSum, loanTotal) });
  },

  removeRepayment: async (repaymentId, loanId) => {
    await deleteRepayment(repaymentId);
    const loan = get().loans.find((l) => l.id === loanId);
    set((s) => {
      const updated = (s.repayments[loanId] ?? []).filter(
        (r) => r.id !== repaymentId,
      );
      const paidSum = updated.reduce((acc, r) => acc + Number(r.amount), 0);
      const newStatus = loan ? computeStatus(paidSum, loan.amount) : "active";
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
      await updateLoan(loanId, { status: computeStatus(paidSum, loan.amount) });
    }
  },

  loadContacts: async () => {
    const contacts = (await fetchContacts()) as Contact[];
    set({ contacts });
  },

  addContact: async (data) => {
    const contact = (await createContact(data)) as Contact;
    set((s) => ({ contacts: [...s.contacts, contact] }));
    return contact;
  },

  loadAllRepayments: async () => {
    try {
      const all = (await fetchAllRepayments()) as Repayment[];
      // Group by loan_id
      const grouped: Record<string, Repayment[]> = {};
      for (const r of all) {
        if (!grouped[r.loan_id]) grouped[r.loan_id] = [];
        grouped[r.loan_id].push(r);
      }
      set((s) => ({ repayments: { ...s.repayments, ...grouped } }));
    } catch (e: any) {
      console.error("loadAllRepayments error:", e?.message);
    }
  },

  getStats: () => {
    const { loans, repayments } = get();
    const statusCount = { active: 0, partially_paid: 0, paid: 0 };
    const currencyMap: Record<string, CurrencyBalance> = {};
    const today = new Date().toISOString().split("T")[0];
    const overdue: Loan[] = [];

    // ── Monthly stats: last 6 months, per currency ──────────────────────────
    // monthlyByCurrency[currency][YYYY-MM] = MonthlyStats
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

    // ── Contact reliability ────────────────────────────────────────────────
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
      const outstanding = Math.max(0, Number(loan.amount) - paid);

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

      // Monthly: bucket by loan_date + currency
      const loanMonth = loan.loan_date.substring(0, 7);
      if (last6Months.includes(loanMonth)) {
        const bucket = getMonthBucket(loan.currency, loanMonth);
        if (loan.type === "lent") bucket.lent += Number(loan.amount);
        else bucket.borrowed += Number(loan.amount);
      }

      // Contact stats
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
      const isFullyPaid = paid >= Number(loan.amount);
      if (!isFullyPaid) {
        cs.outstanding++;
      } else if (loan.due_date) {
        const lastRepayment = [...loanRepayments].sort((a, b) =>
          b.date.localeCompare(a.date),
        )[0];
        if (lastRepayment && lastRepayment.date <= loan.due_date) {
          cs.paidOnTime++;
        } else {
          cs.paidLate++;
        }
      } else {
        cs.paidOnTime++;
      }
    }

    // Monthly: bucket repayments by date + currency (only for this user's loans)
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
}));
