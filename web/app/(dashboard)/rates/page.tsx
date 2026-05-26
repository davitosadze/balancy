"use client";

import { useEffect, useState } from "react";
import { ArrowRightLeft, RefreshCw } from "lucide-react";
import { useRatesStore } from "@/lib/store/rates";
import { useLangStore } from "@/lib/i18n";
import { POPULAR_CURRENCIES, getCurrencySymbol } from "@/lib/utils/currency";

const BASES = ["GEL", "USD", "EUR"];

export default function RatesPage() {
  const { fetchRates, ratesMap, isLoading } = useRatesStore();
  const { t } = useLangStore();
  const [base, setBase] = useState("GEL");
  const [fromCur, setFromCur] = useState("USD");
  const [toCur, setToCur] = useState("GEL");
  const [amount, setAmount] = useState("100");
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  useEffect(() => {
    const loadAll = async () => {
      await Promise.all(BASES.map((b) => fetchRates(b)));
      setLastSynced(new Date().toLocaleString());
    };
    loadAll();
  }, [fetchRates]);

  const rates = ratesMap[base] ?? {};

  const { convert } = useRatesStore.getState();
  const parsedAmount = parseFloat(amount) || 0;
  const result = convert(parsedAmount, fromCur, toCur);

  const swap = () => {
    setFromCur(toCur);
    setToCur(fromCur);
  };

  const lastUpdatedText = lastSynced ? `Last updated ${lastSynced}` : "Syncing latest rates...";

  const displayedCurrencies = POPULAR_CURRENCIES.filter((c) => c.code !== base);

  return (
    <div className="max-w-6xl mx-auto px-8 py-8 space-y-5">
      <div className="soft-hero dashboard-hero rounded-[32px]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="dashboard-kicker">
              {t("rates_title")}
            </p>
            <h1 className="dashboard-title">
              {t("rates_title")}
            </h1>
            <p className="dashboard-subtitle">
              {t("rates_subtitle")}
            </p>
          </div>
          <div className="dashboard-note text-sm">
            <p className="font-semibold text-neutral-950">{lastUpdatedText}</p>
            <p className="mt-1 text-neutral-500">
              {t("rates_sync_hint")}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.7fr,1fr]">
        <div className="bg-white rounded-[32px] border border-neutral-200 p-6 shadow-[0_20px_50px_-20px_rgba(68,64,60,0.08)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-neutral-900">{t("rates_converter")}</h2>
              <p className="text-sm text-neutral-500 mt-1">
                {t("rates_converter_hint")}
              </p>
            </div>
            <button
              onClick={() => BASES.forEach((b) => fetchRates(b, true))}
              className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors">
              <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
              {t("rates_refresh")}
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr,auto,1fr]">
            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">
                {t("rates_from")}
              </label>
              <select
                value={fromCur}
                onChange={(e) => setFromCur(e.target.value)}
                className="w-full h-12 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 text-sm text-neutral-900 outline-none focus:border-neutral-900 transition-colors">
                {POPULAR_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={swap}
              className="mt-6 md:mt-8 h-12 w-12 rounded-2xl border border-neutral-200 bg-neutral-50 text-neutral-500 hover:bg-neutral-100 transition-colors flex items-center justify-center">
              <ArrowRightLeft size={18} />
            </button>
            <div>
              <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">
                {t("rates_to")}
              </label>
              <select
                value={toCur}
                onChange={(e) => setToCur(e.target.value)}
                className="w-full h-12 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 text-sm text-neutral-900 outline-none focus:border-neutral-900 transition-colors">
                {POPULAR_CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-5">
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">
              {t("rates_amount")}
            </label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              inputMode="decimal"
              className="w-full h-12 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 text-sm text-neutral-900 outline-none focus:border-neutral-900 transition-colors"
            />
          </div>
          <div className="mt-5 rounded-3xl ring-1 ring-black/5 bg-amber-50 p-5 text-amber-950 shadow-sm">
            {result !== null ? (
              <>
                <p className="text-3xl font-semibold">
                  {getCurrencySymbol(toCur)}
                  {result.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4,
                  })}
                </p>
                <p className="text-sm text-amber-700 mt-2">
                  {getCurrencySymbol(fromCur)}{parsedAmount} {fromCur} = {getCurrencySymbol(toCur)}{result.toFixed(4)} {toCur}
                </p>
              </>
            ) : (
              <p className="text-sm text-neutral-400">{t("rates_not_available")}</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-[32px] border border-neutral-200 p-6 shadow-[0_20px_50px_-20px_rgba(68,64,60,0.08)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-neutral-900">{t("rates_table_title")}</h2>
            <div className="flex gap-1">
              {BASES.map((b) => (
                <button
                  key={b}
                  onClick={() => setBase(b)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    base === b
                      ? "bg-neutral-900 text-white"
                      : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                  }`}>
                  {b}
                </button>
              ))}
            </div>
          </div>
          {Object.keys(rates).length === 0 ? (
            <p className="text-sm text-neutral-400 text-center py-6">
              {isLoading ? t("rates_loading") : t("rates_no_rates")}
            </p>
          ) : (
            <div className="space-y-0.5">
              {displayedCurrencies.map((c) => {
                const rate = rates[c.code];
                if (!rate) return null;
                return (
                  <div
                    key={c.code}
                    className="flex items-center justify-between py-2.5 border-b border-neutral-100 last:border-0">
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-sm text-neutral-900 w-10">
                        {c.code}
                      </span>
                      <span className="text-xs text-neutral-400">{c.name}</span>
                    </div>
                    <span className="font-semibold text-sm text-neutral-900">
                      {c.symbol}
                      {rate.toFixed(4)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
