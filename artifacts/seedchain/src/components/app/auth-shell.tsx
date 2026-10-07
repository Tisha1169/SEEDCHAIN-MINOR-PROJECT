import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Frame, FieldScene } from "@/components/art";
import { Navbar } from "@/components/layout/navbar";

/** Sign-in / registration layout: a photographic panel beside the form on large screens. */
export function AuthShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen pb-16">
      <Navbar />
      <div className="relative z-[2] mx-auto grid max-w-[1180px] items-stretch gap-8 px-4 pt-28 sm:pt-32 lg:grid-cols-[1fr_minmax(0,520px)]">
        <Frame src="/media/potato.webp" alt="" art={<FieldScene />} ratio="hidden lg:block" position="52% 60%" scrim className="min-h-[560px] !rounded-[36px]">
          <div className="absolute inset-x-8 bottom-8 z-10">
            <div className="eyebrow mb-3">{t("authShell.brand")}</div>
            <div className="text-5xl font-extralight leading-[1.02] tracking-[-0.03em]">{t("authShell.line1")}<br /><span className="text-gradient">{t("authShell.line2")}</span></div>
          </div>
        </Frame>
        <div className={wide ? "lg:max-w-none" : ""}>{children}</div>
      </div>
    </div>
  );
}
