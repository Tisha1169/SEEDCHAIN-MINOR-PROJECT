import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, ScanLine, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { LanguageSwitcher } from "@/i18n/language-switcher";

export const HASH_KEY = "sc.pendingHash";

const links = [
  { key: "platform", hash: "platform" },
  { key: "trace", href: "/scan" },
  { key: "marketplace", href: "/marketplace" },
  { key: "farmers", hash: "farmers" },
  { key: "insights", hash: "insights" },
] as const;

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 2.5c4.6 1.3 7.6 5.1 7.6 9.7 0 4.9-3.4 8.3-7.6 9.3-4.2-1-7.6-4.4-7.6-9.3 0-4.6 3-8.4 7.6-9.7Z" stroke="#86d6a0" strokeWidth="1.4" />
        <path d="M12 21.5V9m0 4.5c-2-.2-3.6-1.3-4.4-3M12 15.5c2-.2 3.6-1.3 4.4-3" stroke="#86d6a0" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
      <span className="text-[15px] font-medium tracking-[0.2em] text-ink">SEEDCHAIN</span>
    </span>
  );
}

export function Navbar() {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const [location, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let raf = 0;
    const on = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setScrolled(window.scrollY > 24));
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => {
      window.removeEventListener("scroll", on);
      cancelAnimationFrame(raf);
    };
  }, []);

  const goHash = (hash: string) => {
    setOpen(false);
    if (location === "/") document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
    else {
      try {
        sessionStorage.setItem(HASH_KEY, hash);
      } catch {
        /* ignore */
      }
      navigate("/");
    }
  };

  const item = "rounded-full px-4 py-2 text-[13px] text-ink/60 transition-colors hover:text-ink";
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3 sm:px-6 sm:pt-4">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-6 focus:top-5 focus:z-[60] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:text-neutral-950">{t("nav.skip")}</a>
      <nav
        aria-label="Primary"
        className={`glass-strong flex w-full max-w-[1060px] items-center justify-between rounded-full transition-all duration-500 ease-out ${scrolled ? "px-3 py-1.5 sm:px-4 !bg-black/50 !backdrop-blur-2xl" : "px-4 py-2.5 sm:px-5"}`}
      >
        <Link href="/" aria-label="SeedChain home"><Logo /></Link>

        <div className="hidden items-center md:flex">
          {links.map((l) =>
            "hash" in l ? (
              <button key={l.key} type="button" onClick={() => goHash(l.hash)} className={item}>{t(`nav.${l.key}`)}</button>
            ) : (
              <Link key={l.key} href={l.href} className={`${item} ${location.startsWith(l.href) ? "!text-ink" : ""}`}>{t(`nav.${l.key}`)}</Link>
            ),
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <LanguageSwitcher />
          <Link href="/scan" className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-[13px] text-ink/70 transition-colors hover:text-ink sm:flex"><ScanLine className="h-4 w-4" />{t("nav.scan")}</Link>
          {isAuthenticated ? (
            <Link href={`/${user?.role}`} className="rounded-full bg-white px-4 py-2 text-[13px] font-medium text-neutral-950 transition-shadow hover:shadow-[0_0_30px_-6px_rgba(255,255,255,0.55)]">{t("nav.dashboard")}</Link>
          ) : (
            <>
              <Link href="/login" className="hidden px-3 py-2 text-[13px] text-ink/70 transition-colors hover:text-ink sm:block">{t("nav.signIn")}</Link>
              <Link href="/register" className="rounded-full bg-white px-4 py-2 text-[13px] font-medium text-neutral-950 transition-shadow hover:shadow-[0_0_30px_-6px_rgba(255,255,255,0.55)]">{t("nav.getStarted")}</Link>
            </>
          )}
          <button type="button" className="rounded-full p-2 text-ink md:hidden" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? t("nav.closeMenu") : t("nav.openMenu")}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
            transition={{ duration: 0.25 }}
            className="glass-strong absolute left-3 right-3 top-[68px] rounded-[28px] p-3 md:hidden"
          >
            {links.map((l) =>
              "hash" in l ? (
                <button key={l.key} type="button" onClick={() => goHash(l.hash)} className="block w-full rounded-2xl px-4 py-3.5 text-left text-[15px] text-ink/80 hover:bg-white/5">{t(`nav.${l.key}`)}</button>
              ) : (
                <Link key={l.key} href={l.href} onClick={() => setOpen(false)} className="block rounded-2xl px-4 py-3.5 text-[15px] text-ink/80 hover:bg-white/5">{t(`nav.${l.key}`)}</Link>
              ),
            )}
            <div className="hairline my-2" />
            <Link href="/scan" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-2xl px-4 py-3.5 text-[15px] text-ink/80 hover:bg-white/5"><ScanLine className="h-4 w-4" />{t("nav.scan")}</Link>
            {!isAuthenticated && <Link href="/login" onClick={() => setOpen(false)} className="block rounded-2xl px-4 py-3.5 text-[15px] text-ink/80 hover:bg-white/5">{t("nav.signIn")}</Link>}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
