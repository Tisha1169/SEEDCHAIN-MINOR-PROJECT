import { useState } from "react";
import { Link } from "wouter";
import { AuthShell } from "@/components/app/auth-shell";
import { Button } from "@/components/ui/button";
import { Card, Field, inputCls } from "@/components/app/common";
import { useAuth } from "@/hooks/use-auth";
import { errMsg } from "@/lib/api";

export default function Login() {
  const { login, serviceError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <AuthShell>
      <div>
        <Card className="p-7 sm:p-9">
          <div className="eyebrow mb-3">Welcome back</div>
          <h1 className="text-4xl font-extralight tracking-tight">Sign in</h1>
          <p className="mb-7 mt-2 text-sm font-light text-ink/50">Farmers, customers and administrators.</p>
          {serviceError && <div className="mb-4 rounded-xl bg-amber-400/10 p-3 text-sm text-amber-300">{serviceError}</div>}
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError(null);
              try {
                await login(email.trim(), password);
              } catch (err) {
                setError(errMsg(err));
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label="Email"><input className={inputCls} type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
            <Field label="Password"><input className={inputCls} type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
            {error && <div className="rounded-xl bg-rose-400/10 p-3 text-sm text-rose-300" role="alert">{error}</div>}
            <Button disabled={busy} className="h-11 w-full rounded-2xl">{busy ? "Signing in…" : "Sign in"}</Button>
          </form>
          <p className="mt-5 text-center text-sm text-ink/55">New here? <Link href="/register" className="font-medium text-accent">Create an account</Link></p>
        </Card>
      </div>
    </AuthShell>
  );
}
