"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  HandCoins,
  ShieldCheck,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { useAuthStore } from "@/lib/store/auth";
import { useLangStore } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/translations";

type TFn = (
  key: TranslationKey,
  vars?: Record<string, string | number>,
) => string;
type PreviewView = "loans" | "contacts" | "stats";

const demoLoans = [
  {
    initials: "AK",
    name: "Ana Kapanadze",
    metaKey: "land_mock_total_due" as const,
    amount: "₾1,575",
    tone: "blue" as const,
  },
  {
    initials: "LM",
    name: "Levan Maisuradze",
    metaKey: "land_mock_paid_back" as const,
    amount: "$420",
    tone: "green" as const,
  },
  {
    initials: "SG",
    name: "Salome Gigauri",
    metaKey: "loans_due_label" as const,
    amount: "€260",
    tone: "amber" as const,
  },
];

export default function RootPage() {
  const router = useRouter();
  const { isAuthenticated, initialize } = useAuthStore();
  const { t, lang, setLang } = useLangStore();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    initialize().then(() => {
      setChecking(false);
    });
  }, [initialize]);

  useEffect(() => {
    if (!checking && isAuthenticated) {
      router.replace("/loans");
    }
  }, [checking, isAuthenticated, router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-7 h-7 border-[3px] border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) return null;

  const stats = [
    { value: t("land_stat_1_value"), label: t("land_stat_1_label") },
    { value: t("land_stat_2_value"), label: t("land_stat_2_label") },
    { value: t("land_stat_3_value"), label: t("land_stat_3_label") },
    { value: t("land_stat_4_value"), label: t("land_stat_4_label") },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[#E5E7EB] bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-sm font-black text-white shadow-sm shadow-blue-600/20">
              B
            </span>
            <span className="text-[17px] font-extrabold tracking-tight">
              Balancy
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === "en" ? "ka" : "en")}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-[#E5E7EB] bg-white px-3 text-sm font-bold text-slate-600 transition-colors hover:border-blue-200 hover:text-blue-700"
              type="button">
              {lang === "en" ? "GE" : "EN"}
            </button>
            <Link
              href="/login"
              className="hidden h-10 items-center rounded-xl px-3 text-sm font-bold text-slate-600 transition-colors hover:text-slate-950 sm:inline-flex">
              {t("land_sign_in")}
            </Link>
            <Link
              href="/register"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-sm shadow-blue-600/20 transition-colors hover:bg-blue-700">
              <span className="hidden sm:inline">{t("land_get_started")}</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="px-5 pb-12 pt-28 sm:px-6 lg:pb-16">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-8 lg:grid-cols-[0.88fr,1.12fr] lg:items-center">
              <div className="max-w-2xl">
                <h1 className="text-[34px] font-bold leading-[1.08] tracking-tight text-slate-950 sm:text-[44px] lg:text-[48px]">
                  {t("land_hero_line1")}{" "}
                  <span className="text-blue-600">{t("land_hero_line2")}</span>
                </h1>
                <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
                  {t("land_hero_desc")}
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/register"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-7 text-base font-extrabold text-white shadow-lg shadow-blue-600/20 transition-colors hover:bg-blue-700">
                    {t("land_start_free")}
                    <ArrowRight size={18} />
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#E5E7EB] bg-white px-7 text-base font-extrabold text-slate-700 shadow-sm transition-colors hover:border-blue-200 hover:text-blue-700">
                    {t("land_sign_in")}
                  </Link>
                </div>
                <p className="mt-4 text-sm font-medium text-slate-500">
                  {t("land_no_card")}
                </p>
              </div>

              <ProductCockpit t={t} />
            </div>

            <div className="mt-10 grid gap-3 rounded-3xl border border-[#E5E7EB] bg-white p-3 shadow-sm sm:grid-cols-4">
              {stats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                  <p className="text-xl font-bold tracking-tight text-slate-950">
                    {item.value}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-14 sm:px-6 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 max-w-2xl">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
                {t("land_features_label")}
              </p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                {t("land_features_title")}
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                {t("land_preview_desc")}
              </p>
            </div>

            <div className="grid gap-4 lg:grid-cols-4">
              <BentoCard
                className="lg:col-span-2 lg:row-span-2"
                icon={<HandCoins size={19} />}
                title={t("land_feat_1_title")}
                desc={t("land_feat_1_desc")}>
                <div className="mt-6 space-y-3">
                  <LoanPreviewRow
                    initials={demoLoans[0].initials}
                    name={demoLoans[0].name}
                    meta={t("land_mock_total_due")}
                    amount="₾1,575.00"
                    tone="blue"
                  />
                  <LoanPreviewRow
                    initials={demoLoans[1].initials}
                    name={demoLoans[1].name}
                    meta={t("land_mock_paid_back")}
                    amount="$420.00"
                    tone="green"
                  />
                  <LoanPreviewRow
                    initials={demoLoans[2].initials}
                    name={demoLoans[2].name}
                    meta={t("loans_due_label")}
                    amount="€260.00"
                    tone="amber"
                  />
                </div>
              </BentoCard>

              <BentoCard
                icon={<Clock3 size={19} />}
                title={t("land_feat_3_title")}
                desc={t("land_feat_3_desc")}>
                <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                  <p className="text-2xl font-black text-amber-700">2</p>
                  <p className="mt-1 text-sm font-bold text-amber-800">
                    {t("loans_overdue_plural", { n: 2 })}
                  </p>
                </div>
              </BentoCard>

              <BentoCard
                icon={<ShieldCheck size={19} />}
                title={t("land_feat_6_title")}
                desc={t("land_feat_6_desc")}>
                <div className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-extrabold text-emerald-700">
                  <CheckCircle2 size={18} />
                  {t("land_check_6")}
                </div>
              </BentoCard>

              <BentoCard
                className="lg:col-span-2"
                icon={<BarChart3 size={19} />}
                title={t("land_feat_4_title")}
                desc={t("land_feat_4_desc")}>
                <div className="mt-6 flex h-28 items-end gap-2 rounded-2xl bg-slate-50 p-4">
                  {[42, 72, 50, 88, 63, 96, 76].map((height, index) => (
                    <span
                      key={index}
                      className="flex-1 rounded-t-lg bg-blue-600"
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
              </BentoCard>
            </div>
          </div>
        </section>

        <section className="px-5 py-14 sm:px-6 lg:py-20">
          <div className="mx-auto grid max-w-7xl gap-6 rounded-[32px] border border-[#E5E7EB] bg-white p-6 shadow-sm md:grid-cols-[0.85fr,1.15fr] md:p-8 lg:p-10">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
                {t("land_why_label")}
              </p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                {t("land_why_title_1")}
                <br />
                {t("land_why_title_2")}
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                {t("land_why_desc")}
              </p>
              <Link
                href="/register"
                className="mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-7 text-base font-extrabold text-white shadow-lg shadow-blue-600/20 transition-colors hover:bg-blue-700">
                {t("land_try_free")}
                <ArrowRight size={18} />
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                t("land_check_1"),
                t("land_check_2"),
                t("land_check_3"),
                t("land_check_4"),
                t("land_check_5"),
                t("land_check_6"),
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-4 py-4 text-sm font-bold text-slate-700">
                  <CheckCircle2
                    size={18}
                    className="shrink-0 text-emerald-500"
                  />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <PricingSection t={t} />

        <section className="px-5 py-16 text-center sm:px-6">
          <div className="mx-auto max-w-3xl rounded-[32px] bg-slate-950 px-6 py-10 text-white shadow-sm sm:px-10">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {t("land_cta_title")}
            </h2>
            <p className="mx-auto mt-4 max-w-md text-base leading-7 text-slate-300">
              {t("land_cta_desc")}
            </p>
            <Link
              href="/register"
              className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-7 text-base font-extrabold text-white transition-colors hover:bg-blue-500">
              {t("land_cta_btn")}
              <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#E5E7EB] bg-white px-5 py-6 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-black text-slate-950">Balancy</span>
          <p>{t("land_footer_copy", { year: new Date().getFullYear() })}</p>
          <div className="flex gap-5 font-bold">
            <Link
              href="/login"
              className="transition-colors hover:text-blue-700">
              {t("land_sign_in")}
            </Link>
            <Link
              href="/register"
              className="transition-colors hover:text-blue-700">
              {t("land_footer_register")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PricingSection({ t }: { t: TFn }) {
  return (
    <section className="px-5 py-14 sm:px-6 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
            {t("pricing_label")}
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            {t("pricing_title")}
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-600">
            {t("pricing_desc")}
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-2">
          <PricingCard
            name={t("pricing_free_name")}
            price={t("pricing_free_price")}
            period={t("pricing_free_period")}
            desc={t("pricing_free_desc")}
            cta={t("land_start_free")}
            href="/register"
            features={[
              t("pricing_free_feature_1"),
              t("pricing_free_feature_2"),
              t("pricing_free_feature_3"),
            ]}
          />
          <PricingCard
            featured
            name={t("pricing_premium_name")}
            price={t("pricing_premium_price")}
            period={t("pricing_premium_period")}
            desc={t("pricing_premium_desc")}
            cta={t("land_get_started")}
            href="/register"
            badge={t("pricing_popular")}
            features={[
              t("pricing_premium_feature_1"),
              t("pricing_premium_feature_2"),
              t("pricing_premium_feature_3"),
              t("pricing_premium_feature_4"),
              t("pricing_premium_feature_5"),
            ]}
          />
        </div>
      </div>
    </section>
  );
}

function PricingCard({
  name,
  price,
  period,
  desc,
  cta,
  href,
  features,
  badge,
  featured = false,
}: {
  name: string;
  price: string;
  period: string;
  desc: string;
  cta: string;
  href: string;
  features: string[];
  badge?: string;
  featured?: boolean;
}) {
  return (
    <div
      className={`relative rounded-[30px] border p-6 shadow-sm ${
        featured
          ? "border-blue-200 bg-blue-600 text-white"
          : "border-[#E5E7EB] bg-white text-slate-950"
      }`}>
      {badge && (
        <span className="absolute right-5 top-5 rounded-full bg-white px-3 py-1 text-xs font-black text-blue-700">
          {badge}
        </span>
      )}
      <p
        className={`text-sm font-black uppercase tracking-[0.14em] ${
          featured ? "text-blue-100" : "text-blue-600"
        }`}>
        {name}
      </p>
      <div className="mt-5 flex items-end gap-2">
        <p className="text-4xl font-bold tracking-tight">{price}</p>
        <p
          className={`pb-2 text-sm font-bold ${
            featured ? "text-blue-100" : "text-slate-500"
          }`}>
          {period}
        </p>
      </div>
      <p
        className={`mt-4 text-sm leading-6 ${
          featured ? "text-blue-50" : "text-slate-600"
        }`}>
        {desc}
      </p>
      <Link
        href={href}
        className={`mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-black transition-colors ${
          featured
            ? "bg-white text-blue-700 hover:bg-blue-50"
            : "bg-slate-950 text-white hover:bg-slate-800"
        }`}>
        {cta}
        <ArrowRight size={17} />
      </Link>
      <div
        className={`mt-6 space-y-3 border-t pt-6 ${
          featured ? "border-blue-400/40" : "border-[#E5E7EB]"
        }`}>
        {features.map((feature) => (
          <div
            key={feature}
            className={`flex gap-3 text-sm font-bold leading-6 ${
              featured ? "text-white" : "text-slate-700"
            }`}>
            <CheckCircle2
              size={18}
              className={`mt-0.5 shrink-0 ${
                featured ? "text-emerald-200" : "text-emerald-500"
              }`}
            />
            {feature}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductCockpit({ t }: { t: TFn }) {
  const [view, setView] = useState<PreviewView>("loans");
  const tabs = [
    { id: "loans" as const, label: t("land_screen_loans"), icon: WalletCards },
    {
      id: "contacts" as const,
      label: t("land_screen_contacts"),
      icon: TrendingUp,
    },
    { id: "stats" as const, label: t("land_screen_stats"), icon: BarChart3 },
  ];

  return (
    <div className="rounded-[28px] border border-[#E5E7EB] bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">
            {t("land_preview_label")}
          </p>
          <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
            {t("land_preview_title")}
          </h3>
        </div>
        <div className="grid grid-cols-3 rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-1">
          {tabs.map(({ id, label, icon: Icon }) => {
            const active = view === id;

            return (
              <button
                key={id}
                type="button"
                onClick={() => setView(id)}
                className={`flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-xs font-black transition-colors ${
                  active
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-950"
                }`}
                aria-pressed={active}>
                <Icon size={15} />
                <span className="hidden md:inline">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-[24px] border border-[#E5E7EB] bg-[#F8FAFC] p-4 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
              {view === "contacts"
                ? t("land_screen_contacts")
                : view === "stats"
                  ? t("land_screen_stats")
                  : t("loans_dashboard_header")}
            </p>
            <h4 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
              {view === "contacts"
                ? demoLoans[0].name
                : view === "stats"
                  ? t("nav_statistics")
                  : t("loans_title_hi", { name: "Ana" })}
            </h4>
          </div>
          <div className="rounded-2xl border border-[#E5E7EB] bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-bold text-slate-400">
              {t("balance_net")}
            </p>
            <p className="text-xl font-bold text-blue-600">₾4,820</p>
          </div>
        </div>

        {view === "loans" && (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                {
                  label: t("balance_lent_out"),
                  value: "₾6,120",
                  color: "text-blue-600",
                },
                {
                  label: t("balance_borrowed"),
                  value: "₾1,300",
                  color: "text-slate-950",
                },
                {
                  label: t("land_mock_paid_back"),
                  value: "₾940",
                  color: "text-emerald-600",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
                  <p className="text-xs font-bold text-slate-400">
                    {item.label}
                  </p>
                  <p className={`mt-2 text-xl font-black ${item.color}`}>
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-black text-slate-950">
                  {t("loans_active_section", { n: 3 })}
                </p>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                  {t("loans_overdue", { n: 1 })}
                </span>
              </div>
              <div className="space-y-3">
                {demoLoans.map((loan) => (
                  <LoanPreviewRow
                    key={loan.name}
                    initials={loan.initials}
                    name={loan.name}
                    meta={t(loan.metaKey)}
                    amount={loan.amount}
                    tone={loan.tone}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {view === "contacts" && (
          <div className="grid gap-4 lg:grid-cols-[0.9fr,1.1fr]">
            <div className="rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-sm font-black text-blue-700">
                  {demoLoans[0].initials}
                </div>
                <div>
                  <p className="font-black text-slate-950">
                    {demoLoans[0].name}
                  </p>
                  <p className="text-sm font-semibold text-slate-500">
                    {t("contact_score", { n: 94 })}
                  </p>
                </div>
              </div>
              <div className="mt-5 h-2 rounded-full bg-slate-100">
                <div className="h-full w-[94%] rounded-full bg-emerald-500" />
              </div>
              <div className="mt-5 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-700">
                {t("land_mock_reliable")}
              </div>
            </div>

            <div className="rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
              <p className="mb-4 font-black text-slate-950">
                {t("contact_loan_history")}
              </p>
              <div className="space-y-3">
                {[
                  {
                    initials: "PB",
                    label: t("land_mock_paid_back"),
                    value: "₾500",
                    tone: "green" as const,
                  },
                  {
                    initials: "TD",
                    label: t("land_mock_total_due"),
                    value: "₾1,075",
                    tone: "blue" as const,
                  },
                  {
                    initials: "OD",
                    label: t("loans_overdue", { n: 0 }),
                    value: "0",
                    tone: "amber" as const,
                  },
                ].map((item) => (
                  <LoanPreviewRow
                    key={item.label}
                    initials={item.initials}
                    name={item.label}
                    meta={t("land_screen_contacts")}
                    amount={item.value}
                    tone={item.tone}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {view === "stats" && (
          <div className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
            <div className="rounded-3xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
              <p className="mb-4 font-black text-slate-950">
                {t("land_feat_4_title")}
              </p>
              <div className="flex h-48 items-end gap-2 rounded-2xl bg-slate-50 p-4">
                {[42, 72, 50, 88, 63, 96, 76, 84].map((height, index) => (
                  <span
                    key={index}
                    className="flex-1 rounded-t-lg bg-blue-600"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>
            <div className="grid gap-3">
              {[
                { label: t("land_stat_3_label"), value: "₾4,820" },
                { label: t("loans_overdue", { n: 1 }), value: "₾260" },
                { label: t("land_mock_paid_back"), value: "₾940" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-sm">
                  <p className="text-xs font-bold text-slate-400">
                    {item.label}
                  </p>
                  <p className="mt-2 text-xl font-black text-slate-950">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BentoCard({
  icon,
  title,
  desc,
  children,
  className = "",
}: {
  icon: ReactNode;
  title: string;
  desc: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[28px] border border-[#E5E7EB] bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
        {icon}
      </div>
      <h3 className="text-lg font-black tracking-tight text-slate-950">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{desc}</p>
      {children}
    </div>
  );
}

function LoanPreviewRow({
  initials,
  name,
  meta,
  amount,
  tone,
}: {
  initials: string;
  name: string;
  meta: string;
  amount: string;
  tone: "blue" | "green" | "amber";
}) {
  const toneClass =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700"
        : "bg-blue-50 text-blue-700";

  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xs font-black ${toneClass}`}>
          {initials}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-slate-950">{name}</p>
          <p className="truncate text-xs font-semibold text-slate-500">
            {meta}
          </p>
        </div>
      </div>
      <p className="shrink-0 text-sm font-black text-slate-950">{amount}</p>
    </div>
  );
}
