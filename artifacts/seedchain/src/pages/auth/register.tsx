import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Link } from "wouter";
import { AuthShell } from "@/components/app/auth-shell";
import { Button } from "@/components/ui/button";
import { Card, Field, inputCls, textareaCls } from "@/components/app/common";
import { useAuth } from "@/hooks/use-auth";
import { errMsg } from "@/lib/api";

export default function Register() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const [role, setRole] = useState<"customer" | "farmer">(new URLSearchParams(window.location.search).get("role") === "farmer" ? "farmer" : "customer");
  const [f, setF] = useState({ name: "", email: "", password: "", phone: "", location: "", publicName: "", village: "", district: "", state: "", bio: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <AuthShell>
      <div>
        <Card className="p-7 sm:p-9">
          <div className="eyebrow mb-3">{t("auth.join")}</div>
          <h1 className="text-4xl font-extralight tracking-tight">{t("auth.createTitle")}</h1>
          <div className="my-5 grid grid-cols-2 gap-2 rounded-full bg-white/[0.06] p-1" role="tablist">
            {(["customer", "farmer"] as const).map((r) => (
              <button key={r} type="button" onClick={() => setRole(r)} className={`rounded-full py-2.5 text-sm font-medium transition-colors ${role === r ? "bg-white text-neutral-950" : "text-ink/55 hover:text-ink"}`}>
                {r === "farmer" ? t("auth.iAmFarmer") : t("auth.iAmCustomer")}
              </button>
            ))}
          </div>
          {role === "farmer" && <p className="mb-4 rounded-xl bg-amber-400/10 p-3 text-xs text-amber-300">{t("auth.farmerReview")}</p>}
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError(null);
              try {
                await register({
                  name: f.name.trim(), email: f.email.trim(), password: f.password, role,
                  ...(f.phone && { phone: f.phone }), ...(f.location && { location: f.location }),
                  ...(role === "farmer" && { farmerProfile: { publicName: f.publicName.trim() || f.name.trim(), ...(f.village && { village: f.village }), ...(f.district && { district: f.district }), ...(f.state && { state: f.state }), ...(f.bio && { bio: f.bio }) } }),
                });
              } catch (err) {
                setError(errMsg(err));
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label={t("auth.fullName")}><input className={inputCls} required minLength={2} value={f.name} onChange={set("name")} autoComplete="name" /></Field>
            <Field label={t("auth.email")}><input className={inputCls} type="email" required value={f.email} onChange={set("email")} autoComplete="email" /></Field>
            <Field label={t("auth.phone")} hint={role === "farmer" ? t("auth.phoneFarmerHint") : t("auth.phoneCustomerHint")}><input className={inputCls} type="tel" value={f.phone} onChange={set("phone")} autoComplete="tel" /></Field>
            <Field label={t("auth.password")} hint={t("auth.passwordHint")}><input className={inputCls} type="password" required minLength={10} value={f.password} onChange={set("password")} autoComplete="new-password" /></Field>
            {role === "farmer" ? (
              <>
                <Field label={t("auth.publicName")} hint={t("auth.publicNameHint")}><input className={inputCls} value={f.publicName} onChange={set("publicName")} placeholder={f.name || t("auth.publicNamePh")} /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t("auth.village")}><input className={inputCls} value={f.village} onChange={set("village")} /></Field>
                  <Field label={t("auth.district")}><input className={inputCls} value={f.district} onChange={set("district")} /></Field>
                </div>
                <Field label={t("auth.state")}><input className={inputCls} required value={f.state} onChange={set("state")} placeholder={t("auth.statePh")} /></Field>
                <Field label={t("auth.aboutPublic")}><textarea className={textareaCls} rows={2} maxLength={1000} value={f.bio} onChange={set("bio")} /></Field>
              </>
            ) : (
              <Field label={t("auth.cityArea")}><input className={inputCls} value={f.location} onChange={set("location")} /></Field>
            )}
            {error && <div className="rounded-xl bg-rose-400/10 p-3 text-sm text-rose-300" role="alert">{error}</div>}
            <Button disabled={busy} className="h-11 w-full rounded-2xl">{busy ? t("auth.creating") : t("auth.createAccount")}</Button>
          </form>
          <p className="mt-5 text-center text-sm text-ink/55">{t("auth.alreadyRegistered")} <Link href="/login" className="font-medium text-accent">{t("auth.signIn")}</Link></p>
        </Card>
      </div>
    </AuthShell>
  );
}
