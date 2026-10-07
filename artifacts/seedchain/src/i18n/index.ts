import i18n from "i18next";
import { initReactI18next } from "react-i18next";

export const LANGUAGES = ["en", "hi", "pa"] as const;
export type Lang = (typeof LANGUAGES)[number];
export const INTL_LOCALE: Record<Lang, string> = { en: "en-IN", hi: "hi-IN", pa: "pa-IN" };
const KEY = "sc.lang";

type Tree = { [k: string]: string | Tree };
const files = import.meta.glob<{ default: Tree }>("./locales/*/*.ts", { eager: true });

function merge(a: Tree, b: Tree): Tree {
  for (const [k, v] of Object.entries(b)) {
    const cur = a[k];
    a[k] = typeof v === "object" && typeof cur === "object" ? merge(cur, v) : v;
  }
  return a;
}
/** Every file under locales/<lang>/ contributes top-level keys; files must not share top-level keys. */
export function buildResources(): Record<Lang, Tree> {
  const out: Record<string, Tree> = { en: {}, hi: {}, pa: {} };
  for (const [path, mod] of Object.entries(files)) {
    const lang = path.split("/")[2];
    if (out[lang]) merge(out[lang], mod.default);
  }
  return out as Record<Lang, Tree>;
}

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

const resources = buildResources();
function apply(lang: Lang) {
  document.documentElement.lang = lang;
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: resources.en }, hi: { translation: resources.hi }, pa: { translation: resources.pa } },
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

export const currentLocale = () => INTL_LOCALE[(i18n.language as Lang) in INTL_LOCALE ? (i18n.language as Lang) : "en"];
export default i18n;
