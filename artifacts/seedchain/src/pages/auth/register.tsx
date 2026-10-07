import { useState } from "react";
import { Link } from "wouter";
import { AuthShell } from "@/components/app/auth-shell";
import { Button } from "@/components/ui/button";
import { Card, Field, inputCls, textareaCls } from "@/components/app/common";
import { useAuth } from "@/hooks/use-auth";
import { errMsg } from "@/lib/api";

export default function Register() {
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
          <div className="eyebrow mb-3">Join SeedChain</div>
          <h1 className="text-4xl font-extralight tracking-tight">Create your account</h1>
          <div className="my-5 grid grid-cols-2 gap-2 rounded-full bg-white/[0.06] p-1" role="tablist">
            {(["customer", "farmer"] as const).map((r) => (
              <button key={r} type="button" onClick={() => setRole(r)} className={`rounded-full py-2.5 text-sm font-medium transition-colors ${role === r ? "bg-white text-neutral-950" : "text-ink/55 hover:text-ink"}`}>
                I am a {r}
              </button>
            ))}
          </div>
          {role === "farmer" && <p className="mb-4 rounded-xl bg-amber-400/10 p-3 text-xs text-amber-300">Farmer accounts are reviewed by a SeedChain admin before you can create farms, lots and QR codes.</p>}
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
            <Field label="Full name"><input className={inputCls} required minLength={2} value={f.name} onChange={set("name")} autoComplete="name" /></Field>
            <Field label="Email"><input className={inputCls} type="email" required value={f.email} onChange={set("email")} autoComplete="email" /></Field>
            <Field label="Phone" hint={role === "farmer" ? "Shared only with customers who order from you." : "Shared only with the farmer you order from."}><input className={inputCls} type="tel" value={f.phone} onChange={set("phone")} autoComplete="tel" /></Field>
            <Field label="Password" hint="At least 10 characters."><input className={inputCls} type="password" required minLength={10} value={f.password} onChange={set("password")} autoComplete="new-password" /></Field>
            {role === "farmer" ? (
              <>
                <Field label="Public farm / farmer name" hint="Shown to customers on QR trace pages."><input className={inputCls} value={f.publicName} onChange={set("publicName")} placeholder={f.name || "e.g. Gurpreet Farms"} /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Village"><input className={inputCls} value={f.village} onChange={set("village")} /></Field>
                  <Field label="District"><input className={inputCls} value={f.district} onChange={set("district")} /></Field>
                </div>
                <Field label="State"><input className={inputCls} required value={f.state} onChange={set("state")} placeholder="e.g. Punjab" /></Field>
                <Field label="About you (public)"><textarea className={textareaCls} rows={2} maxLength={1000} value={f.bio} onChange={set("bio")} /></Field>
              </>
            ) : (
              <Field label="City / area (optional)"><input className={inputCls} value={f.location} onChange={set("location")} /></Field>
            )}
            {error && <div className="rounded-xl bg-rose-400/10 p-3 text-sm text-rose-300" role="alert">{error}</div>}
            <Button disabled={busy} className="h-11 w-full rounded-2xl">{busy ? "Creating…" : "Create account"}</Button>
          </form>
          <p className="mt-5 text-center text-sm text-ink/55">Already registered? <Link href="/login" className="font-medium text-accent">Sign in</Link></p>
        </Card>
      </div>
    </AuthShell>
  );
}
