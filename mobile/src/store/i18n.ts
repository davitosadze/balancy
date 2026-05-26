import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "@i18n/setup";
import { fetchTranslations } from "@api/directus";

const CACHE_KEY_PREFIX = "i18n_cache_";
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

// Converts { "loans.addLoan": "value" } → { loans: { addLoan: "value" } }
// Required because i18next resolves t("loans.addLoan") via nested objects,
// not flat dot-notation string keys.
function flatToNested(flat: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split(".");
    let obj = result;
    for (let i = 0; i < parts.length - 1; i++) {
      if (typeof obj[parts[i]] !== "object" || obj[parts[i]] === null) {
        obj[parts[i]] = {};
      }
      obj = obj[parts[i]] as Record<string, unknown>;
    }
    obj[parts[parts.length - 1]] = value;
  }
  return result;
}

interface I18nState {
  language: string;
  availableLanguages: { code: string; label: string }[];
  lastFetched: Record<string, number>;

  initLanguage: (savedLang?: string) => Promise<void>;
  changeLanguage: (lang: string) => Promise<void>;
  fetchAndApplyTranslations: (
    lang: string,
    forceRefresh?: boolean,
  ) => Promise<void>;
}

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "ka", label: "ქართული" },
  { code: "ru", label: "Русский" },
];

export const useI18nStore = create<I18nState>((set, get) => ({
  language: "en",
  availableLanguages: LANGUAGES,
  lastFetched: {},

  initLanguage: async (savedLang) => {
    const lang =
      savedLang ?? (await AsyncStorage.getItem("app_language")) ?? "en";
    await get().fetchAndApplyTranslations(lang);
    set({ language: lang });
  },

  changeLanguage: async (lang) => {
    await AsyncStorage.setItem("app_language", lang);
    await get().fetchAndApplyTranslations(lang, true);
    await i18n.changeLanguage(lang);
    set({ language: lang });
  },

  fetchAndApplyTranslations: async (lang, forceRefresh = false) => {
    const now = Date.now();
    const lastFetched = get().lastFetched[lang] ?? 0;
    const cacheKey = `${CACHE_KEY_PREFIX}${lang}`;

    // Use cache if fresh
    if (!forceRefresh && now - lastFetched < CACHE_TTL_MS) {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const bundle = JSON.parse(cached) as Record<string, string>;
        i18n.addResourceBundle(
          lang,
          "translation",
          flatToNested(bundle),
          true,
          true,
        );
        await i18n.changeLanguage(lang);
        return;
      }
    }

    try {
      const translations = await fetchTranslations(lang);
      const bundle: Record<string, string> = {};
      for (const t of translations) {
        bundle[t.key] = t.value;
      }
      if (Object.keys(bundle).length > 0) {
        await AsyncStorage.setItem(cacheKey, JSON.stringify(bundle));
        i18n.addResourceBundle(
          lang,
          "translation",
          flatToNested(bundle),
          true,
          true,
        );
        set((s) => ({ lastFetched: { ...s.lastFetched, [lang]: now } }));
      }
    } catch {
      // Fall back to bundled strings — already loaded
    }
    await i18n.changeLanguage(lang);
  },
}));
