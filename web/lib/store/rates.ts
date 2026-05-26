import { create } from "zustand";
import { fetchExchangeRates } from "@/lib/api/directus";

type Rates = Record<string, number>;

interface RatesState {
  ratesMap: Record<string, Rates>;
  isLoading: boolean;
  error: string | null;
  fetchRates: (base?: string, force?: boolean) => Promise<void>;
  convert: (amount: number, from: string, to: string) => number | null;
}

export const useRatesStore = create<RatesState>((set, get) => ({
  ratesMap: {},
  isLoading: false,
  error: null,

  fetchRates: async (base = "GEL", force = false) => {
    if (!force && get().ratesMap[base]) return;
    set({ isLoading: true, error: null });
    try {
      const data = await fetchExchangeRates(base);
      set((s) => ({
        ratesMap: { ...s.ratesMap, [base]: data.rates },
        isLoading: false,
      }));
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to fetch rates";
      set({ error: message, isLoading: false });
    }
  },

  convert: (amount, from, to) => {
    if (from === to) return amount;
    const { ratesMap } = get();
    // Direct: ratesMap[from][to]
    if (ratesMap[from]?.[to]) return amount * ratesMap[from][to];
    // Inverse: ratesMap[to][from]
    if (ratesMap[to]?.[from]) return amount / ratesMap[to][from];
    // Cross via any loaded base
    for (const rates of Object.values(ratesMap)) {
      if (rates[from] && rates[to]) {
        return (amount / rates[from]) * rates[to];
      }
    }
    return null;
  },
}));
