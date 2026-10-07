import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LANGUAGES, setLanguage, type Lang } from "./index";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { t, i18n } = useTranslation();
  return (
    <label className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1.5 text-[13px] text-ink/70 hover:text-ink ${className}`}>
      <Languages className="h-4 w-4" aria-hidden />
      <span className="sr-only">{t("lang.label")}</span>
      <select
        value={i18n.language}
        onChange={(e) => setLanguage(e.target.value as Lang)}
        className="cursor-pointer appearance-none bg-transparent pr-1 outline-none [&>option]:bg-neutral-900 [&>option]:text-white"
      >
        {LANGUAGES.map((l) => (
          <option key={l} value={l}>{t(`lang.${l}`)}</option>
        ))}
      </select>
    </label>
  );
}
