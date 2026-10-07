import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUpdateMyProfile } from "@workspace/api-client-react";
import { BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, Field, inputCls, Kv, PageHeader, textareaCls, Pill } from "@/components/app/common";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeMode } from "@/hooks/use-realtime";
import { useToast } from "@/hooks/use-toast";
import { errMsg } from "@/lib/api";
import { dateOnly, enumLabel } from "@/lib/format";

export default function AccountPage() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  const mode = useRealtimeMode();
  const update = useUpdateMyProfile();
  const fp = user?.farmerProfile;
  const [f, setF] = useState({ name: user?.name ?? "", phone: user?.phone ?? "", location: user?.location ?? "", publicName: fp?.publicName ?? "", village: fp?.village ?? "", district: fp?.district ?? "", state: fp?.state ?? "", bio: fp?.bio ?? "" });
  if (!user) return null;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    try {
      await update.mutateAsync({ data: { name: f.name, ...(f.phone && { phone: f.phone }), ...(f.location && { location: f.location }), ...(user!.role === "farmer" && { farmerProfile: { publicName: f.publicName, ...(f.village && { village: f.village }), ...(f.district && { district: f.district }), ...(f.state && { state: f.state }), ...(f.bio && { bio: f.bio }) } }) } });
      await qc.invalidateQueries();
      toast({ title: t("account.saved") });
    } catch (err) {
      toast({ title: t("account.saveFailed"), description: errMsg(err), variant: "destructive" });
    }
  }

  return (
    <>
      <PageHeader title={t("account.title")} subtitle={t("account.subtitle")} />
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-6 sm:p-8">
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("account.fullName")}><input className={inputCls} required minLength={2} value={f.name} onChange={set("name")} /></Field>
              <Field label={t("account.phone")} hint={user.role === "customer" ? t("account.phoneCustomerHint") : t("account.phoneFarmerHint")}><input className={inputCls} value={f.phone} onChange={set("phone")} /></Field>
            </div>
            <Field label={t("account.location")}><input className={inputCls} value={f.location} onChange={set("location")} /></Field>
            {user.role === "farmer" && (
              <>
                <div className="hairline my-2" />
                <div className="eyebrow">{t("account.publicProfile")}</div>
                <Field label={t("account.publicName")}><input className={inputCls} required minLength={2} value={f.publicName} onChange={set("publicName")} /></Field>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label={t("account.village")}><input className={inputCls} value={f.village} onChange={set("village")} /></Field>
                  <Field label={t("account.district")}><input className={inputCls} value={f.district} onChange={set("district")} /></Field>
                  <Field label={t("account.state")}><input className={inputCls} value={f.state} onChange={set("state")} /></Field>
                </div>
                <Field label={t("account.about")}><textarea className={textareaCls} rows={3} maxLength={1000} value={f.bio} onChange={set("bio")} /></Field>
              </>
            )}
            <Button disabled={update.isPending} className="h-11 px-8">{update.isPending ? t("account.saving") : t("account.saveChanges")}</Button>
          </form>
        </Card>
        <div className="space-y-5">
          <Card className="p-6">
            <div className="eyebrow mb-3">{t("account.session")}</div>
            <Kv k={t("account.email")} v={user.email} /><Kv k={t("account.role")} v={enumLabel("role", user.role)} />
            <Kv k={t("account.status")} v={<Pill className={user.status === "active" ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-300"}>{enumLabel("userStatus", user.status)}</Pill>} />
            {fp && <Kv k={t("account.verification")} v={fp.verifiedAt ? <span className="inline-flex items-center gap-1 text-accent"><BadgeCheck className="h-4 w-4" />{dateOnly(fp.verifiedAt)}</span> : t("account.pendingReview")} />}
            <Kv k={t("account.memberSince")} v={dateOnly(user.createdAt)} />
            <Kv k={t("account.liveUpdates")} v={mode === "live" ? t("account.connected") : mode === "polling" ? t("account.polling") : t("account.offline")} />
            <Button variant="outline" className="mt-5 w-full" onClick={() => void logout()}>{t("account.signOut")}</Button>
          </Card>
          <Card className="p-6 text-xs leading-relaxed text-ink/45">{t("account.noPasswordReset")}</Card>
        </div>
      </div>
    </>
  );
}
