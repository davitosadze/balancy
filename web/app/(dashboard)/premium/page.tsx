"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  BellRing,
  CheckCircle2,
  Crown,
  FileDown,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import clsx from "clsx";
import { useLangStore } from "@/lib/i18n";
import { useAuthStore } from "@/lib/store/auth";
import { usePremiumStore } from "@/lib/store/premium";

const FEATURES = [
  {
    icon: BarChart3,
    titleKey: "premium_feature_forecast_title",
    descKey: "premium_feature_forecast_desc",
  },
  {
    icon: ShieldCheck,
    titleKey: "premium_feature_risk_title",
    descKey: "premium_feature_risk_desc",
  },
  {
    icon: BellRing,
    titleKey: "premium_feature_nudges_title",
    descKey: "premium_feature_nudges_desc",
  },
  {
    icon: FileDown,
    titleKey: "premium_feature_export_title",
    descKey: "premium_feature_export_desc",
  },
] as const;

export default function PremiumPage() {
  const { t } = useLangStore();
  const { user, token, setUser } = useAuthStore();
  const { isPremium, isSaving, error, initialize, setPremium } =
    usePremiumStore();
  const [now] = useState(() => Date.now());

  useEffect(() => {
    initialize(user);
  }, [initialize, user]);

  const handleTogglePremium = async () => {
    const nextPremium = !isPremium;
    const updated = await setPremium(nextPremium, token);
    if (updated && user) {
      setUser({
        ...user,
        ...updated,
        premium_active: updated.premium_active ?? nextPremium,
      });
    }
  };
  const trialUntil = user?.premium_until
    ? new Date(user.premium_until).toLocaleDateString()
    : null;
  const trialExpired =
    Boolean(user?.premium_active) &&
    Boolean(user?.premium_until) &&
    new Date(user!.premium_until!).getTime() <= now;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-6">
      <section className="soft-hero rounded-[32px]">
        <div className="grid gap-0 lg:grid-cols-[1.15fr,0.85fr]">
          <div className="dashboard-hero">
            <div className="soft-hero-chip inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold">
              <Crown size={14} />
              {isPremium ? t("premium_active_badge") : t("premium_locked_badge")}
            </div>
            <h1 className="dashboard-title max-w-2xl">
              {t("premium_title")}
            </h1>
            <p className="dashboard-subtitle">
              {t("premium_subtitle")}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                t("premium_feature_forecast_title"),
                t("premium_feature_risk_title"),
                t("premium_planner_title"),
              ].map((label) => (
                <div
                  key={label}
                  className="soft-card dashboard-stat rounded-2xl">
                  <CheckCircle2 size={17} className="text-emerald-600" />
                  <p className="mt-2 text-sm font-semibold text-neutral-950">{label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white/40 p-5 lg:p-6">
            <div className="soft-card rounded-3xl p-5">
            <p className="text-sm font-semibold text-neutral-950">
              {t("premium_status_title")}
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              {isPremium
                ? t("premium_status_active")
                : t("premium_status_inactive")}
            </p>
            <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">
                {t("pricing_premium_name")}
              </p>
              <div className="mt-2 flex items-end gap-2">
                <p className="text-3xl font-extrabold text-neutral-950">
                  {t("pricing_premium_price")}
                </p>
                <p className="pb-1 text-sm font-semibold text-neutral-500">
                  {t("pricing_premium_period")}
                </p>
              </div>
              <p className="mt-2 text-sm text-neutral-500">
                {t("pricing_premium_desc")}
              </p>
            </div>
            <div className="mt-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
              <p className="text-sm font-semibold text-blue-700">
                {t("premium_trial_title")}
              </p>
              <p className="mt-1 text-sm leading-6 text-neutral-600">
                {isPremium && trialUntil
                  ? t("premium_trial_until", { date: trialUntil })
                  : trialExpired
                    ? t("premium_trial_expired")
                  : t("premium_trial_desc")}
              </p>
            </div>
            <button
              onClick={handleTogglePremium}
              disabled={isSaving}
              className={clsx(
                "mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl px-5 text-sm font-semibold transition-colors",
                isPremium
                  ? "bg-white text-blue-700 ring-1 ring-neutral-200 hover:bg-blue-50"
                  : "bg-blue-600 text-white hover:bg-blue-700",
                isSaving && "opacity-60",
              )}>
              {isPremium ? <Zap size={15} /> : <Sparkles size={15} />}
              {isSaving
                ? t("premium_saving")
                : isPremium
                  ? t("premium_deactivate")
                  : t("premium_activate")}
            </button>
            {error && (
              <p className="mt-3 text-xs leading-5 text-amber-700">
                {error}
              </p>
            )}
            </div>
            <Link
              href="/statistics"
              className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-2xl bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-700">
              {t("premium_try_stats_title")}
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {FEATURES.map(({ icon: Icon, titleKey, descKey }) => (
          <div
            key={titleKey}
            className="soft-card rounded-3xl p-5 transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <Icon size={20} />
            </div>
            <h2 className="mt-5 text-lg font-semibold text-neutral-950">
              {t(titleKey)}
            </h2>
            <p className="mt-2 text-sm leading-6 text-neutral-500">
              {t(descKey)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
