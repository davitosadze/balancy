import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import ka from "./ka.json";
import ru from "./ru.json";

i18n.use(initReactI18next).init({
  lng: "en",
  fallbackLng: "en",
  resources: {
    en: { translation: en },
    ka: { translation: ka },
    ru: { translation: ru },
  },
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export default i18n;
