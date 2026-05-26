"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import clsx from "clsx";
import { useAuthStore } from "@/lib/store/auth";
import { useLoansStore } from "@/lib/store/loans";
import { useLangStore } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/translations";
import { formatAmount } from "@/lib/utils/currency";

type EventType = "loan_start" | "due" | "repayment";

type CalEvent = {
  type: EventType;
  loanId: string | number;
  contactName: string;
  amount: number;
  currency: string;
  loanType?: "lent" | "borrowed";
};

const EVENT_META: Record<
  EventType,
  {
    labelKey: TranslationKey;
    bg: string;
    text: string;
    dot: string;
    darkBg: string;
    darkText: string;
  }
> = {
  due: {
    labelKey: "cal_event_due",
    bg: "bg-red-50",
    text: "text-red-600",
    dot: "bg-red-400",
    darkBg: "bg-red-500",
    darkText: "text-white",
  },
  loan_start: {
    labelKey: "cal_event_loan",
    bg: "bg-violet-50",
    text: "text-violet-600",
    dot: "bg-violet-400",
    darkBg: "bg-violet-500",
    darkText: "text-white",
  },
  repayment: {
    labelKey: "cal_event_repaid",
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-400",
    darkBg: "bg-amber-500",
    darkText: "text-white",
  },
};

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function CalendarPage() {
  const { token } = useAuthStore();
  const { loans, repayments, loadLoans, loadAllRepayments } = useLoansStore();
  const { t, lang } = useLangStore();

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      loadLoans(token);
      loadAllRepayments(token);
    }
  }, [token]);

  const eventMap = useMemo(() => {
    const map = new Map<string, CalEvent[]>();
    const add = (date: string | null | undefined, event: CalEvent) => {
      if (!date) return;
      const d = date.substring(0, 10);
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(event);
    };
    for (const loan of loans) {
      if (loan.archived) continue;
      add(loan.loan_date, {
        type: "loan_start",
        loanId: loan.id,
        contactName: loan.contact_name,
        amount: loan.amount,
        currency: loan.currency,
        loanType: loan.type,
      });
      if (loan.due_date && loan.status !== "paid") {
        add(loan.due_date, {
          type: "due",
          loanId: loan.id,
          contactName: loan.contact_name,
          amount: loan.amount,
          currency: loan.currency,
          loanType: loan.type,
        });
      }
    }
    for (const [loanId, reps] of Object.entries(repayments)) {
      const loan = loans.find((l) => String(l.id) === loanId);
      if (!loan || loan.archived) continue;
      for (const rep of reps) {
        add(rep.date, {
          type: "repayment",
          loanId: loan.id,
          contactName: loan.contact_name,
          amount: Number(rep.amount),
          currency: loan.currency,
          loanType: loan.type,
        });
      }
    }
    return map;
  }, [loans, repayments]);

  const days = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const offset = (firstDay.getDay() + 6) % 7;
    const total = lastDay.getDate();
    const grid: (number | null)[] = [];
    for (let i = 0; i < offset; i++) grid.push(null);
    for (let i = 1; i <= total; i++) grid.push(i);
    while (grid.length % 7 !== 0) grid.push(null);
    return grid;
  }, [year, month]);

  const prevMonth = () => {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else setMonth((m) => m + 1);
  };
  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDay(todayStr);
  };

  const monthStats = useMemo(() => {
    let dueCount = 0,
      repayCount = 0,
      loanCount = 0;
    const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
    for (const [date, events] of eventMap.entries()) {
      if (!date.startsWith(prefix)) continue;
      for (const ev of events) {
        if (ev.type === "due") dueCount++;
        else if (ev.type === "repayment") repayCount++;
        else if (ev.type === "loan_start") loanCount++;
      }
    }
    return { dueCount, repayCount, loanCount };
  }, [eventMap, year, month]);

  const upcomingEntries = useMemo(() => {
    const entries: { date: string; events: CalEvent[] }[] = [];
    for (let i = 0; i < 120; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const ds = d.toISOString().split("T")[0];
      const evs = eventMap.get(ds);
      if (evs && evs.length > 0) entries.push({ date: ds, events: evs });
      if (entries.length >= 10) break;
    }
    return entries;
  }, [eventMap]);

  const selectedEvents = selectedDay ? (eventMap.get(selectedDay) ?? []) : [];

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="soft-hero dashboard-hero mb-6 rounded-[32px]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="dashboard-kicker">
              {t("cal_title")}
            </p>
            <h1 className="dashboard-title">
              {t("cal_title")}
            </h1>
            <p className="dashboard-subtitle">
              {t("cal_subtitle")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={prevMonth}
              className="w-10 h-10 rounded-2xl border border-neutral-200 bg-white text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-neutral-950 min-w-[180px] text-center">
              {new Date(year, month, 1).toLocaleDateString(lang === "ka" ? "ka-GE" : "en-US", { month: "long", year: "numeric" })}
            </span>
            <button
              onClick={nextMonth}
              className="w-10 h-10 rounded-2xl border border-neutral-200 bg-white text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center">
              <ChevronRight size={16} />
            </button>
            <button
              onClick={goToday}
              className="h-10 px-4 rounded-2xl bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
              {t("cal_today_btn")}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatPill
          icon={<AlertTriangle size={13} />}
          label={t("cal_due_this_month")}
          count={monthStats.dueCount}
          color="text-red-500"
          bg="bg-red-50"
          border="border-red-100"
        />
        <StatPill
          icon={<ArrowUpRight size={13} />}
          label={t("cal_loans_started")}
          count={monthStats.loanCount}
          color="text-violet-600"
          bg="bg-violet-50"
          border="border-violet-100"
        />
        <StatPill
          icon={<ArrowDownLeft size={13} />}
          label={t("cal_repayments_count")}
          count={monthStats.repayCount}
          color="text-amber-600"
          bg="bg-amber-50"
          border="border-amber-100"
        />
      </div>

      <div className="flex gap-5 items-start">
        <div className="flex-1 min-w-0">
          <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="grid grid-cols-7 bg-neutral-50 border-b border-neutral-100">
              {Array.from({ length: 7 }, (_, i) => {
                const d = new Date(2024, 0, 1 + i);
                return d.toLocaleDateString(lang === "ka" ? "ka-GE" : "en-US", { weekday: "short" });
              }).map((d) => (
                <div
                  key={d}
                  className="text-center py-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-widest">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day, i) => {
                if (!day) {
                  return (
                    <div
                      key={`blank-${i}`}
                      className="border-b border-r border-neutral-100 h-[88px] bg-neutral-50/50"
                    />
                  );
                }
                const dateStr = toDateStr(year, month, day);
                const events = eventMap.get(dateStr) ?? [];
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDay;
                const isPast = dateStr < todayStr;
                const dow = (new Date(dateStr + "T12:00:00").getDay() + 6) % 7;
                const isWeekend = dow >= 5;
                const isLastCol = i % 7 === 6;

                const hasDue = events.some((e) => e.type === "due");
                const hasLoan = events.some((e) => e.type === "loan_start");
                const hasRepay = events.some((e) => e.type === "repayment");
                const chips: EventType[] = [];
                if (hasDue) chips.push("due");
                if (hasLoan) chips.push("loan_start");
                if (hasRepay) chips.push("repayment");
                const shownChips = chips.slice(0, 2);
                const extraCount = chips.length - shownChips.length;

                return (
                  <button
                    key={dateStr}
                    onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                    className={clsx(
                      "relative h-[88px] p-2 text-left flex flex-col gap-1 border-b border-r border-neutral-100 transition-colors focus:outline-none",
                      isLastCol && "border-r-0",
                      isSelected
                        ? "bg-neutral-950"
                        : isToday
                          ? "bg-stone-50 hover:bg-stone-100"
                          : isWeekend
                            ? "bg-neutral-50/70 hover:bg-neutral-100/70"
                            : "hover:bg-neutral-50",
                    )}>
                    <span
                      className={clsx(
                        "w-7 h-7 rounded-lg flex items-center justify-center text-[12px] font-bold shrink-0",
                        isSelected
                          ? "bg-white text-neutral-950"
                          : isToday
                            ? "bg-stone-500 text-white shadow-sm"
                            : isPast
                              ? "text-neutral-400"
                              : "text-neutral-800",
                      )}>
                      {day}
                    </span>
                    <div className="flex flex-col gap-[3px] w-full">
                      {shownChips.map((type) => {
                        const meta = EVENT_META[type];
                        return (
                          <span
                            key={type}
                            className={clsx(
                              "text-[9px] font-bold px-1.5 py-[2px] rounded-md leading-tight truncate w-full text-left",
                              isSelected
                                ? `${meta.darkBg} ${meta.darkText}`
                                : `${meta.bg} ${meta.text}`,
                            )}>
                            {t(meta.labelKey)}
                          </span>
                        );
                      })}
                      {extraCount > 0 && (
                        <span
                          className={clsx(
                            "text-[9px] font-bold px-1",
                            isSelected
                              ? "text-neutral-300"
                              : "text-neutral-400",
                          )}>
                          +{extraCount}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-6 mt-3 px-1">
            {(["due", "loan_start", "repayment"] as EventType[]).map((type) => (
              <span
                key={type}
                className="flex items-center gap-1.5 text-[12px] text-neutral-500">
                <span
                  className={clsx(
                    "w-2 h-2 rounded-full inline-block shrink-0",
                    EVENT_META[type].dot,
                  )}
                />
                {t(EVENT_META[type].labelKey)}
              </span>
            ))}
            <span className="flex items-center gap-1.5 text-[12px] text-neutral-500">
              <span className="w-2 h-2 rounded-full inline-block shrink-0 bg-stone-500" />
              {t("cal_today_btn")}
            </span>
          </div>
        </div>

        <div className="w-[260px] shrink-0">
          {selectedDay ? (
            <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 pt-4 pb-3 border-b border-neutral-100">
                <p className="text-[13px] font-bold text-neutral-900">
                  {new Date(selectedDay + "T12:00:00").toLocaleDateString(
                    lang === "ka" ? "ka-GE" : "en-US",
                    { weekday: "long", month: "long", day: "numeric" },
                  )}
                </p>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  {selectedEvents.length !== 1
                    ? t("cal_events_count_plural", { n: selectedEvents.length })
                    : t("cal_events_count", { n: selectedEvents.length })}
                </p>
              </div>
              <div className="p-3">
                {selectedEvents.length === 0 ? (
                  <div className="flex flex-col items-center py-8">
                    <CalendarDays size={28} className="mb-2 text-neutral-200" />
                    <p className="text-sm text-neutral-400">
                      {t("cal_nothing_today")}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedEvents.map((ev, i) => (
                      <EventCard key={i} event={ev} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-4 pt-4 pb-3 border-b border-neutral-100">
                <p className="text-[13px] font-bold text-neutral-900">
                  {t("cal_upcoming_title")}
                </p>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  {t("cal_upcoming_subtitle")}
                </p>
              </div>
              <div className="p-3 max-h-[520px] overflow-y-auto">
                {upcomingEntries.length === 0 ? (
                  <div className="flex flex-col items-center py-8">
                    <CalendarDays size={28} className="mb-2 text-neutral-200" />
                    <p className="text-sm text-neutral-400">
                      {t("cal_no_upcoming")}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingEntries.map(({ date, events }) => {
                      const d = new Date(date + "T12:00:00");
                      const isUpToday = date === todayStr;
                      const diffDays = Math.round(
                        (d.getTime() - today.getTime()) / 86400000,
                      );
                      const rel = isUpToday
                        ? t("cal_today_badge")
                        : diffDays === 1
                          ? t("cal_tomorrow_badge")
                          : t("cal_in_days_badge", { n: diffDays });
                      return (
                        <div key={date}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wide">
                              {d.toLocaleDateString(lang === "ka" ? "ka-GE" : "en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                            <span
                              className={clsx(
                                "text-[9px] font-bold px-2 py-0.5 rounded-full",
                                isUpToday
                                  ? "bg-stone-100 text-stone-700"
                                  : diffDays <= 3
                                    ? "bg-red-50 text-red-500"
                                    : "bg-neutral-100 text-neutral-500",
                              )}>
                              {rel}
                            </span>
                          </div>
                          <div className="space-y-1.5">
                            {events.map((ev, i) => (
                              <EventCard key={i} event={ev} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EventCard({ event }: { event: CalEvent }) {
  const { t } = useLangStore();
  const m = EVENT_META[event.type];
  return (
    <Link
      href={`/loans/${event.loanId}`}
      className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl border border-neutral-100 hover:border-neutral-300 hover:bg-neutral-50 transition-all">
      <span
        className={clsx(
          "shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black",
          m.bg,
          m.text,
        )}>
        {event.type === "due" ? "!" : event.type === "loan_start" ? "L" : "✓"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold text-neutral-800 truncate leading-tight">
          {event.contactName}
        </p>
        <p className="text-[10px] text-neutral-400 leading-tight mt-0.5">
          <span className={clsx("font-semibold", m.text)}>{t(m.labelKey)}</span>
          {" · "}
          {formatAmount(event.amount, event.currency)}
        </p>
      </div>
      {event.loanType && (
        <span
          className={clsx(
            "shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase",
            event.loanType === "lent"
              ? "bg-stone-50 text-stone-700"
              : "bg-red-50 text-red-500",
          )}>
          {event.loanType === "lent" ? "Out" : "In"}
        </span>
      )}
    </Link>
  );
}

function StatPill({
  icon,
  label,
  count,
  color,
  bg,
  border,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  color: string;
  bg: string;
  border: string;
}) {
  return (
    <div
      className={clsx(
        "flex items-center gap-3 px-4 py-3 rounded-2xl border bg-white shadow-sm",
        border,
      )}>
      <span
        className={clsx(
          "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
          bg,
          color,
        )}>
        {icon}
      </span>
      <div>
        <p className="text-[20px] font-extrabold text-neutral-900 leading-none">
          {count}
        </p>
        <p className="text-[11px] text-neutral-400 mt-0.5">{label}</p>
      </div>
    </div>
  );
}
