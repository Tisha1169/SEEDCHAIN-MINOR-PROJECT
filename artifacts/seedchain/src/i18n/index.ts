import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en";
import hi from "./locales/hi";
import pa from "./locales/pa";

export const LANGUAGES = ["en", "hi", "pa"] as const;
export type Lang = (typeof LANGUAGES)[number];
const KEY = "sc.lang";

function isLang(v: unknown): v is Lang {
  return typeof v === "string" && (LANGUAGES as readonly string[]).includes(v);
}

/** Saved choice first; then the browser language; English as the fallback. */
export function detectLanguage(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (isLang(saved)) return saved;
  } catch {
    /* storage blocked: fall through */
  }
  for (const l of navigator.languages ?? [navigator.language]) {
    const base = l.toLowerCase().split("-")[0];
    if (isLang(base)) return base;
  }
  return "en";
}

function apply(lang: Lang) {
  document.documentElement.lang = lang;
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, hi: { translation: hi }, pa: { translation: pa } },
  lng: detectLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  returnNull: false,
});
apply(i18n.language as Lang);

export function setLanguage(lang: Lang) {
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    /* ignore */
  }
  void i18n.changeLanguage(lang);
  apply(lang);
}

export default i18n;
