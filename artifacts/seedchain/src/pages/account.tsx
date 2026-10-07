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
import { dateOnly } from "@/lib/format";

export default function AccountPage() {
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
      toast({ title: "Profile saved" });
    } catch (err) {
      toast({ title: "Could not save", description: errMsg(err), variant: "destructive" });
    }
  }

  return (
    <>
      <PageHeader title="Account" subtitle="Your profile and session." />
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-6 sm:p-8">
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name"><input className={inputCls} required minLength={2} value={f.name} onChange={set("name")} /></Field>
              <Field label="Phone" hint={user.role === "customer" ? "Shared only with the farmer you order from." : "Shared only with customers who order from you."}><input className={inputCls} value={f.phone} onChange={set("phone")} /></Field>
            </div>
            <Field label="Location"><input className={inputCls} value={f.location} onChange={set("location")} /></Field>
            {user.role === "farmer" && (
              <>
                <div className="hairline my-2" />
                <div className="eyebrow">Public farmer profile (shown on QR pages)</div>
                <Field label="Public name"><input className={inputCls} required minLength={2} value={f.publicName} onChange={set("publicName")} /></Field>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Village"><input className={inputCls} value={f.village} onChange={set("village")} /></Field>
                  <Field label="District"><input className={inputCls} value={f.district} onChange={set("district")} /></Field>
                  <Field label="State"><input className={inputCls} value={f.state} onChange={set("state")} /></Field>
                </div>
                <Field label="About"><textarea className={textareaCls} rows={3} maxLength={1000} value={f.bio} onChange={set("bio")} /></Field>
              </>
            )}
            <Button disabled={update.isPending} className="h-11 px-8">{update.isPending ? "Saving…" : "Save changes"}</Button>
          </form>
        </Card>
        <div className="space-y-5">
          <Card className="p-6">
            <div className="eyebrow mb-3">Session</div>
            <Kv k="Email" v={user.email} /><Kv k="Role" v={<span className="capitalize">{user.role}</span>} />
            <Kv k="Status" v={<Pill className={user.status === "active" ? "bg-emerald-400/15 text-emerald-300" : "bg-amber-400/15 text-amber-300"}>{user.status}</Pill>} />
            {fp && <Kv k="Verification" v={fp.verifiedAt ? <span className="inline-flex items-center gap-1 text-accent"><BadgeCheck className="h-4 w-4" />{dateOnly(fp.verifiedAt)}</span> : "Pending admin review"} />}
            <Kv k="Member since" v={dateOnly(user.createdAt)} />
            <Kv k="Live updates" v={mode === "live" ? "Connected" : mode === "polling" ? "Polling every 20 s" : "Offline"} />
            <Button variant="outline" className="mt-5 w-full" onClick={() => void logout()}>Sign out</Button>
          </Card>
          <Card className="p-6 text-xs leading-relaxed text-ink/45">Self-service password change and reset are not available yet. Keep your password safe; this is a known limitation of the pilot build.</Card>
        </div>
      </div>
    </>
  );
}
