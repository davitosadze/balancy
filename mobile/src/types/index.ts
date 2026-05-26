// ─── Domain Models ────────────────────────────────────────────────────────────

export type LoanType = "lent" | "borrowed";
export type LoanStatus = "active" | "partially_paid" | "paid";

// Shared loan participant
export interface LoanParticipant {
  name: string;
  phone?: string;
  amount: number; // their share of the total
}

export interface DirectusUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar: string | null;
  locale: string | null;
  push_token: string | null;
}

export interface Contact {
  id: string;
  user_created: string;
  date_created: string;
  name: string;
  phone: string | null;
}

export interface Loan {
  id: string;
  user_created: string;
  date_created: string;
  date_updated: string;
  type: LoanType;
  contact_name: string;
  contact_id: string | null;
  phone: string | null;
  amount: number;
  currency: string;
  loan_date: string; // ISO date string YYYY-MM-DD
  due_date: string | null;
  notes: string | null;
  status: LoanStatus;
  interest_rate: number | null;
  participants: string | null; // JSON: LoanParticipant[]
  repayments?: Repayment[];
}

export interface Repayment {
  id: string;
  user_created: string;
  date_created: string;
  loan_id: string;
  amount: number;
  date: string; // ISO date string YYYY-MM-DD
  notes: string | null;
  paid_by: string | null;
}

export interface AppTranslation {
  id: number;
  language_code: string;
  key: string;
  value: string;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires: number;
}

// ─── Forms ───────────────────────────────────────────────────────────────────

export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoanForm {
  type: LoanType;
  contact_name: string;
  contact_id?: string;
  phone?: string;
  amount: string;
  currency: string;
  loan_date: string;
  due_date?: string;
  notes?: string;
  interest_rate?: string;
  participants?: string; // JSON: LoanParticipant[]
}

export interface RepaymentForm {
  amount: string;
  date: string;
  notes?: string;
  paid_by?: string;
}

// ─── Statistics ──────────────────────────────────────────────────────────────

export interface CurrencyBalance {
  currency: string;
  totalLent: number;
  totalBorrowed: number;
  outstandingLent: number;
  outstandingBorrowed: number;
}

export interface MonthlyStats {
  month: string; // YYYY-MM
  lent: number;
  borrowed: number;
  repaid: number;
  currency: string;
}

export interface ContactStats {
  name: string;
  phone: string | null;
  totalLoans: number;
  paidOnTime: number;
  paidLate: number;
  outstanding: number;
}

export interface LoanStats {
  byStatus: { active: number; partially_paid: number; paid: number };
  byCurrency: CurrencyBalance[];
  overdue: Loan[];
  totalLoans: number;
  monthly: Record<string, MonthlyStats[]>; // key = currency
  contactStats: ContactStats[];
}

// ─── Navigation ──────────────────────────────────────────────────────────────

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  LoansTab: undefined;
  StatisticsTab: undefined;
  RatesTab: undefined;
  NotificationsTab: undefined;
  ProfileTab: undefined;
};

export type LoansStackParamList = {
  LoanList: undefined;
  LoanDetail: { loanId: string };
  AddLoan: { editLoanId?: string };
  AddRepayment: {
    loanId: string;
    loanAmount: number;
    paidAmount: number;
    currency: string;
    loanType: "lent" | "borrowed";
  };
};
