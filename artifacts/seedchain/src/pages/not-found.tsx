import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="mx-auto max-w-md px-4 pt-40 text-center">
        <h1 className="text-5xl font-medium">{t("notFound.title")}</h1>
        <p className="mt-2 text-ink/60">{t("notFound.body")}</p>
        <Link href="/"><Button className="mt-6 rounded-full">{t("notFound.home")}</Button></Link>
      </div>
    </div>
  );
}
