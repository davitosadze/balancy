"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Users,
  TrendingUp,
  TrendingDown,
  AlertCircle,
} from "lucide-react";
import clsx from "clsx";
import { useAuthStore } from "@/lib/store/auth";
import { useLoansStore } from "@/lib/store/loans";
import { useLangStore } from "@/lib/i18n";
import { formatAmount } from "@/lib/utils/currency";
import type { Loan } from "@/lib/types";

interface ContactGroup {
  key: string;
  name: string;
  phone: string | null;
  loans: Loan[];
  totalLent: number;
  totalBorrowed: number;
  outstandingLent: number;
  outstandingBorrowed: number;
  activeCount: number;
  paidCount: number;
  overdueCount: number;
  primaryCurrency: string;
}

export default function ContactsPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const { loans, repayments, isLoading, loadLoans, loadAllRepayments } =
    useLoansStore();
  const { t } = useLangStore();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "outstanding" | "loans">(
    "name",
  );

  useEffect(() => {
    if (token) loadLoans(token).then(() => loadAllRepayments(token));
  }, [token, loadLoans, loadAllRepayments]);

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const contactGroups = useMemo<ContactGroup[]>(() => {
    const map: Record<string, ContactGroup> = {};

    for (const loan of loans) {
      const key = loan.contact_id ?? loan.contact_name;
      if (!map[key]) {
        map[key] = {
          key,
          name: loan.contact_name,
          phone: loan.phone,
          loans: [],
          totalLent: 0,
          totalBorrowed: 0,
          outstandingLent: 0,
          outstandingBorrowed: 0,
          activeCount: 0,
          paidCount: 0,
          overdueCount: 0,
          primaryCurrency: loan.currency,
        };
      }
      const g = map[key];
      g.loans.push(loan);

      const loanReps = repayments[String(loan.id)] ?? [];
      const paid = loanReps.reduce((s, r) => s + Number(r.amount), 0);
      const outstanding = Math.max(0, Number(loan.amount) - paid);

      if (loan.type === "lent") {
        g.totalLent += Number(loan.amount);
        g.outstandingLent += outstanding;
      } else {
        g.totalBorrowed += Number(loan.amount);
        g.outstandingBorrowed += outstanding;
      }

      if (loan.status === "paid") g.paidCount++;
      else {
        g.activeCount++;
        if (loan.due_date && loan.due_date < today) g.overdueCount++;
      }
    }

    return Object.values(map);
  }, [loans, repayments, today]);

  const totalOutstanding = useMemo(
    () =>
      contactGroups.reduce(
        (sum, c) => sum + c.outstandingLent + c.outstandingBorrowed,
        0,
      ),
    [contactGroups],
  );
  const totalContacts = contactGroups.length;
  const totalLoans = loans.length;

  const filtered = useMemo(() => {
    let list = contactGroups;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) => c.name.toLowerCase().includes(q) || (c.phone ?? "").includes(q),
      );
    }
    return [...list].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "outstanding")
        return (
          b.outstandingLent +
          b.outstandingBorrowed -
          (a.outstandingLent + a.outstandingBorrowed)
        );
      return b.loans.length - a.loans.length;
    });
  }, [contactGroups, search, sortBy]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="soft-hero dashboard-hero mb-6 rounded-[32px]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="dashboard-kicker">
              {t("contacts_title")}
            </p>
            <h1 className="dashboard-title">
              {t("contacts_title")}
            </h1>
            <p className="dashboard-subtitle">
              Browse your contacts and see outstanding balances, loan activity, and overdue insights instantly.
            </p>
          </div>
          <div className="dashboard-note text-sm">
            <p className="font-semibold text-neutral-950">Contact intelligence</p>
            <p className="mt-1 text-neutral-500 text-sm">
              See your top relationships, outstanding balances, and overdue connections at a glance.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="soft-card dashboard-stat rounded-3xl">
            <p className="text-sm text-neutral-500">Contacts</p>
            <p className="mt-1 text-xl font-semibold text-neutral-950">{totalContacts}</p>
          </div>
          <div className="soft-card dashboard-stat rounded-3xl">
            <p className="text-sm text-neutral-500">Loans recorded</p>
            <p className="mt-1 text-xl font-semibold text-neutral-950">{totalLoans}</p>
          </div>
          <div className="soft-card dashboard-stat rounded-3xl">
            <p className="text-sm text-neutral-500">Total outstanding</p>
            <p className="mt-1 text-xl font-semibold text-neutral-950">
              {formatAmount(totalOutstanding, contactGroups[0]?.primaryCurrency ?? "GEL")}
            </p>
          </div>
        </div>
      </div>

      {/* Search + Sort */}
      <div className="flex items-center gap-2 mb-5">
        <div className="flex-1 relative">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("contacts_search_placeholder")}
            className="w-full h-9 pl-8 pr-3 rounded-lg border border-neutral-200 bg-white text-sm text-neutral-900 outline-none focus:border-neutral-400 transition-colors placeholder:text-neutral-400"
          />
        </div>
        <div className="flex bg-neutral-100 rounded-lg p-0.5">
          {(["name", "outstanding", "loans"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={clsx(
                "px-3 py-1.5 rounded-md text-[13px] font-medium capitalize transition-colors",
                sortBy === s
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700",
              )}>
              {s === "outstanding"
                ? t("contacts_sort_outstanding")
                : s === "loans"
                  ? t("contacts_sort_loans")
                  : t("contacts_sort_name")}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-[3px] border-neutral-200 border-t-neutral-900 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center mb-4">
            <Users size={20} className="text-neutral-400" />
          </div>
          <p className="font-semibold text-neutral-800 mb-1">
            {search ? t("contacts_empty_no_match") : t("contacts_empty_no_contacts")}
          </p>
          <p className="text-sm text-neutral-400">
            {search
              ? t("contacts_search_hint")
              : t("contacts_empty_hint")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((contact) => (
            <ContactCard
              key={contact.key}
              contact={contact}
              onView={() =>
                router.push(
                  `/contacts/${encodeURIComponent(contact.key)}`,
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ContactCard({
  contact,
  onView,
}: {
  contact: ContactGroup;
  onView: () => void;
}) {
  const { t } = useLangStore();
  const hasLent = contact.totalLent > 0;
  const hasBorrowed = contact.totalBorrowed > 0;
  const netOutstanding = contact.outstandingLent - contact.outstandingBorrowed;
  const isNetPositive = netOutstanding >= 0;

  return (
    <button
      onClick={onView}
      className="text-left w-full bg-white border border-neutral-200 rounded-[28px] p-5 shadow-sm hover:border-neutral-300 hover:shadow-lg transition-all">
      {/* Top row */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-neutral-900 text-white text-[14px] font-bold flex items-center justify-center shrink-0">
            {contact.name[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <p className="text-[15px] font-semibold text-neutral-900">
              {contact.name}
            </p>
            {contact.phone && (
              <p className="text-xs text-neutral-400 mt-0.5">{contact.phone}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {contact.overdueCount > 0 && (
            <span className="flex items-center gap-1 text-[11px] font-semibold bg-red-50 text-red-600 px-2 py-0.5 rounded-full">
              <AlertCircle size={10} />
              {t("contacts_overdue_badge", { n: contact.overdueCount })}
            </span>
          )}
          <span className="text-[11px] font-medium text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">
            {contact.loans.length !== 1
              ? t("contacts_loan_count_plural", { n: contact.loans.length })
              : t("contacts_loan_count", { n: contact.loans.length })}
          </span>
        </div>
      </div>

      {/* Amounts */}
      <div className="space-y-1.5">
        {hasLent && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-neutral-500">
              <TrendingUp size={11} className="text-stone-600" />
              {t("contacts_lent_out")}
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold text-stone-700">
                {formatAmount(contact.outstandingLent, contact.primaryCurrency)}
              </span>
              {contact.totalLent !== contact.outstandingLent && (
                <span className="text-xs text-neutral-400 ml-1.5">
                  {t("contacts_of")} {formatAmount(contact.totalLent, contact.primaryCurrency)}
                </span>
              )}
            </div>
          </div>
        )}
        {hasBorrowed && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-neutral-500">
              <TrendingDown size={11} className="text-red-500" />
              {t("contacts_borrowed")}
            </div>
            <div className="text-right">
              <span className="text-sm font-semibold text-red-600">
                {formatAmount(
                  contact.outstandingBorrowed,
                  contact.primaryCurrency,
                )}
              </span>
              {contact.totalBorrowed !== contact.outstandingBorrowed && (
                <span className="text-xs text-neutral-400 ml-1.5">
                  {t("contacts_of")}{" "}
                  {formatAmount(contact.totalBorrowed, contact.primaryCurrency)}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {contact.activeCount > 0 && (
            <span className="text-[11px] font-medium text-neutral-500">
              {t("contacts_active", { n: contact.activeCount })}
            </span>
          )}
          {contact.paidCount > 0 && (
            <span className="text-[11px] font-medium text-neutral-400">
              {t("contacts_paid", { n: contact.paidCount })}
            </span>
          )}
        </div>
        {(hasLent || hasBorrowed) && (
          <div
            className={clsx(
              "text-[12px] font-bold",
              isNetPositive ? "text-stone-700" : "text-red-600",
            )}>
            {t("contacts_net")} {netOutstanding >= 0 ? "+" : ""}
            {formatAmount(Math.abs(netOutstanding), contact.primaryCurrency)}
          </div>
        )}
      </div>
    </button>
  );
}
