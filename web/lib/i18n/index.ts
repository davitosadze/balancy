import { create } from "zustand";
import {
  translations,
  type LangCode,
  type TranslationKey,
} from "./translations";

interface LangState {
  lang: LangCode;
  setLang: (lang: LangCode) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

export const useLangStore = create<LangState>((set, get) => ({
  lang:
    (typeof window !== "undefined"
      ? (localStorage.getItem("lang") as LangCode | null)
      : null) ?? "en",

  setLang: (lang) => {
    if (typeof window !== "undefined") localStorage.setItem("lang", lang);
    set({ lang });
  },

  t: (key, vars) => {
    const { lang } = get();
    let str = translations[lang][key] ?? translations.en[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(`{${k}}`, String(v));
      }
    }
    return str;
  },
}));
