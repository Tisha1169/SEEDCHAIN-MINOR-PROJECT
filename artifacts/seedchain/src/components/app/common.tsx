import type { ReactNode } from "react";
import { AlertTriangle, Inbox, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { errMsg } from "@/lib/api";
import { useTranslation } from "react-i18next";
import { LOT_STATUS_STYLE, ORDER_STATUS_STYLE, RISK_STYLE, enumLabel } from "@/lib/format";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`glass rounded-[28px] ${className}`}>{children}</div>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-3xl font-extralight tracking-tight text-ink sm:text-4xl">{title}</h2>
        {subtitle && <p className="mt-1.5 text-sm font-light text-ink/50">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** Large figure with its unit set small beside it ("850" + "kg"), never wrapping. */
export function BigNumber({ value, className = "" }: { value: ReactNode; className?: string }) {
  if (typeof value === "string") {
    const m = value.match(/^([\d.,]+)\s*([\p{L}%][\p{L}\p{M}%]*)$/u);
    if (m) return <span className={`whitespace-nowrap ${className}`}>{m[1]}<span className="ml-1 text-[0.42em] font-light text-ink/45">{m[2]}</span></span>;
  }
  return <span className={`whitespace-nowrap ${className}`}>{value}</span>;
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: string; tone?: "warn" | "ok" }) {
  return (
    <Card className="p-5">
      <div className="eyebrow">{label}</div>
      <div className={`mt-2 text-[2.1rem] font-extralight leading-none tracking-tight ${tone === "warn" ? "text-amber-300" : tone === "ok" ? "text-accent" : "text-ink"}`}><BigNumber value={value} /></div>
      {hint && <div className="mt-1 text-xs text-ink/45">{hint}</div>}
    </Card>
  );
}

export function Pill({ children, className = "bg-zinc-400/15 text-zinc-300" }: { children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide ${className}`}>{children}</span>;
}
export const OrderStatusPill = ({ status }: { status: string }) => <Pill className={ORDER_STATUS_STYLE[status]}>{enumLabel("orderStatus", status)}</Pill>;
export const LotStatusPill = ({ status }: { status: string }) => <Pill className={LOT_STATUS_STYLE[status]}>{enumLabel("lotStatus", status)}</Pill>;
export const RiskPill = ({ level }: { level: string }) => {
  const { t } = useTranslation();
  return <Pill className={RISK_STYLE[level]}>{t("common.riskLevel", { level: enumLabel("risk", level) })}</Pill>;
};

export function Loading({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-ink/50" role="status">
      <Loader2 className="h-5 w-5 animate-spin" /> {label ?? t("common.loading")}
    </div>
  );
}

/** Real error state. Never substitutes sample data. */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <Card className="mx-auto my-8 max-w-lg p-8 text-center" >
      <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-amber-500" />
      <h3 className="text-lg eyebrow !text-ink/75">{t("common.unavailable")}</h3>
      <p className="mt-1 text-sm text-ink/60">{errMsg(error)}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="mt-4 rounded-full">
          <RefreshCw className="mr-2 h-4 w-4" /> {t("common.tryAgain")}
        </Button>
      )}
    </Card>
  );
}

export function Empty({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <Card className="p-10 text-center">
      <Inbox className="mx-auto mb-3 h-9 w-9 text-ink/25" />
      <div className="font-medium">{title}</div>
      {hint && <p className="mt-1 text-sm text-ink/50">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </Card>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="eyebrow mb-2 block !tracking-[0.16em]">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink/45">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full h-11 rounded-2xl border border-white/10 bg-white/[0.045] px-4 text-sm text-ink placeholder:text-ink/30 transition-colors focus:outline-none focus:border-accent/60 focus:bg-white/[0.07] focus:ring-2 focus:ring-accent/20";
export const textareaCls =
  "w-full rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-3 text-sm text-ink placeholder:text-ink/30 transition-colors focus:outline-none focus:border-accent/60 focus:bg-white/[0.07] focus:ring-2 focus:ring-accent/20";

export function Kv({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line/50 py-2 text-sm last:border-0">
      <span className="text-ink/45">{k}</span>
      <span className="text-right font-medium text-ink">{v}</span>
    </div>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.08] text-left">
            {head.map((h) => (
              <th key={h} className="eyebrow px-4 py-3.5 !text-[0.62rem] !tracking-[0.16em] whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line/60">{children}</tbody>
      </table>
    </Card>
  );
}
