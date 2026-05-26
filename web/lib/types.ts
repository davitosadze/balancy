// Domain types (mirrors mobile/src/types/index.ts)

export type LoanType = "lent" | "borrowed";
export type LoanStatus = "active" | "partially_paid" | "paid";

export interface LoanParticipant {
  name: string;
  phone?: string;
  amount: number;
}

export interface DirectusUser {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  avatar: string | null;
  locale: string | null;
  push_token: string | null;
  premium_active?: boolean | null;
  premium_plan?: string | null;
  premium_until?: string | null;
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
  loan_date: string;
  due_date: string | null;
  notes: string | null;
  status: LoanStatus;
  interest_rate: number | null;
  participants: string | null; // JSON: LoanParticipant[]
  archived: boolean;
  attachment_id: string | null;
}

export interface Repayment {
  id: string;
  user_created: string;
  date_created: string;
  loan_id: string;
  amount: number;
  date: string;
  notes: string | null;
  paid_by: string | null;
}

// Forms
export interface LoanForm {
  type: LoanType;
  contact_name: string;
  contact_id?: string;
  phone?: string;
  amount: number;
  currency: string;
  loan_date: string;
  due_date?: string;
  notes?: string;
  interest_rate?: number;
  participants?: string;
}

export interface RepaymentForm {
  amount: number;
  date: string;
  notes?: string;
  paid_by?: string;
}

// Statistics
export interface CurrencyBalance {
  currency: string;
  totalLent: number;
  totalBorrowed: number;
  outstandingLent: number;
  outstandingBorrowed: number;
}

export interface MonthlyStats {
  month: string;
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
  monthly: Record<string, MonthlyStats[]>;
  contactStats: ContactStats[];
}

// Activity Feed
export type ActivityEventType =
  | "loan_created"
  | "repayment_made"
  | "loan_paid"
  | "loan_overdue";

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  date: string;
  loan: Loan;
  repayment?: Repayment;
}
