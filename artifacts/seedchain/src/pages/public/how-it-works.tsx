import { useTranslation } from "react-i18next";
import { Navbar } from "@/components/layout/navbar";
import { Card } from "@/components/app/common";

const rows = ["farmer", "customer", "admin"] as const;

export default function HowItWorks() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen pb-16">
      <Navbar />
      <div className="mx-auto max-w-3xl px-4 pt-28">
        <h1 className="text-3xl font-medium">{t("how.title")}</h1>
        <p className="mt-2 text-ink/60">{t("how.lead")}</p>
        <div className="mt-6 space-y-3">{rows.map((r) => <Card key={r} className="p-5"><div className="font-medium">{t(`how.${r}Role`)}</div><p className="mt-1 text-sm text-ink/65">{t(`how.${r}Text`)}</p></Card>)}</div>
        <h2 className="mb-2 mt-10 text-xl font-medium">{t("how.qrHeading")}</h2>
        <Card className="p-5 text-sm text-ink/70">
          {t("how.qrBody1")} <code className="rounded bg-glass px-1">https://…/trace/&lt;random token&gt;</code>{t("how.qrBody2")}
        </Card>
        <h2 className="mb-2 mt-10 text-xl font-medium">{t("how.claimHeading")}</h2>
        <Card className="p-5 text-sm text-ink/70">
          {t("how.claim1")} <b>{t("how.claimBold")}</b>{t("how.claim2")}
        </Card>
      </div>
    </div>
  );
}
