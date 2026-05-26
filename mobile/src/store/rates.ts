import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "https://open.er-api.com/v6/latest";
const CACHE_KEY = "currency_rates_cache";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface Rates {
  base: string;
  date: string;
  rates: Record<string, number>;
}

interface RatesState {
  ratesMap: Record<string, Rates>; // keyed by base currency
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;

  fetchRates: (base?: string) => Promise<void>;
  convert: (amount: number, from: string, to: string) => number | null;
  loadCache: () => Promise<void>;
}

export const useRatesStore = create<RatesState>((set, get) => ({
  ratesMap: {},
  isLoading: false,
  error: null,
  lastFetched: null,

  loadCache: async () => {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (raw) {
        const { ratesMap, lastFetched } = JSON.parse(raw);
        if (Date.now() - lastFetched < CACHE_TTL_MS) {
          set({ ratesMap, lastFetched });
        }
      }
    } catch {}
  },

  fetchRates: async (base = "GEL") => {
    const { lastFetched, ratesMap } = get();
    // Use cache if fresh
    if (
      lastFetched &&
      Date.now() - lastFetched < CACHE_TTL_MS &&
      ratesMap[base]
    ) {
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const resp = await fetch(`${BASE_URL}/${base}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      if (json.result !== "success")
        throw new Error(json["error-type"] ?? "API error");
      const data: Rates = {
        base: json.base_code,
        date: json.time_last_update_utc
          ? json.time_last_update_utc.substring(0, 16)
          : "",
        rates: json.rates,
      };
      const updated = { ...get().ratesMap, [base]: data };
      const now = Date.now();
      set({ ratesMap: updated, isLoading: false, lastFetched: now });
      await AsyncStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ ratesMap: updated, lastFetched: now }),
      );
    } catch (e: any) {
      set({ error: e?.message ?? "Failed to fetch rates", isLoading: false });
    }
  },

  convert: (amount, from, to) => {
    if (from === to) return amount;
    const { ratesMap } = get();
    // Direct: from is a loaded base
    const fromBase = ratesMap[from];
    if (fromBase?.rates[to] != null) {
      return amount * fromBase.rates[to];
    }
    // Inverse: to is a loaded base (e.g. convert USD→GEL when GEL base is loaded)
    const toBase = ratesMap[to];
    if (toBase?.rates[from] != null) {
      return amount / toBase.rates[from];
    }
    // Cross-rate via any loaded base
    for (const [, r] of Object.entries(ratesMap)) {
      if (r.rates[from] != null && r.rates[to] != null) {
        return (amount / r.rates[from]) * r.rates[to];
      }
    }
    return null;
  },
}));
