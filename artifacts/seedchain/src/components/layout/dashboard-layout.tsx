import { useState, useSyncExternalStore, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  AlertTriangle, BarChart3, ClipboardList, CloudOff, History, LayoutDashboard, Leaf, LogOut, Menu, Package, QrCode, RefreshCw,
  ScanLine, ShoppingBag, Sprout, Users, X, Plug, Wifi, WifiOff, Landmark, Boxes, UserCog, Plus, MapPinned, CreditCard, ShoppingCart,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import { useRealtimeMode } from "@/hooks/use-realtime";
import { dismissAction, queueSnapshot, subscribeQueue, syncQueue } from "@/lib/offline-queue";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { enumLabel } from "@/lib/format";
import { Logo } from "./navbar";

const NAV = {
  farmer: [
    { name: "dashboard", href: "/farmer", icon: LayoutDashboard },
    { name: "farms", href: "/farmer/farms", icon: Sprout },
    { name: "lots", href: "/farmer/lots", icon: Package },
    { name: "inventory", href: "/farmer/inventory", icon: Boxes },
    { name: "orders", href: "/farmer/orders", icon: ClipboardList },
    { name: "market", href: "/farmer/market", icon: Landmark },
    { name: "alerts", href: "/farmer/alerts", icon: AlertTriangle },
    { name: "scan", href: "/scan", icon: ScanLine },
    { name: "account", href: "/account", icon: UserCog },
  ],
  customer: [
    { name: "dashboard", href: "/customer", icon: LayoutDashboard },
    { name: "browse", href: "/marketplace", icon: ShoppingBag },
    { name: "cart", href: "/cart", icon: ShoppingCart },
    { name: "myOrders", href: "/customer/orders", icon: ClipboardList },
    { name: "scan", href: "/scan", icon: ScanLine },
    { name: "account", href: "/account", icon: UserCog },
  ],
  admin: [
    { name: "command", href: "/admin", icon: BarChart3 },
    { name: "users", href: "/admin/users", icon: Users },
    { name: "adminLots", href: "/admin/lots", icon: QrCode },
    { name: "orders", href: "/admin/orders", icon: ClipboardList },
    { name: "events", href: "/admin/events", icon: History },
    { name: "alerts", href: "/admin/alerts", icon: AlertTriangle },
    { name: "payments", href: "/admin/payments", icon: CreditCard },
    { name: "map", href: "/admin/map", icon: MapPinned },
    { name: "sources", href: "/admin/integrations", icon: Plug },
    { name: "inventory", href: "/admin/inventory", icon: Boxes },
    { name: "audit", href: "/admin/audit", icon: Leaf },
    { name: "account", href: "/account", icon: UserCog },
  ],
} as const;

function SyncStatus() {
  const { t } = useTranslation();
  const items = useSyncExternalStore(subscribeQueue, () => JSON.stringify(queueSnapshot()));
  const queue = JSON.parse(items) as ReturnType<typeof queueSnapshot>;
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  if (!queue.length) return null;
  const pending = queue.filter((q) => q.status === "PENDING");
  const conflicts = queue.filter((q) => q.status === "SYNC_CONFLICT");
  return (
    <div className="mb-4 rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm" role="status">
      <div className="flex flex-wrap items-center gap-3">
        <CloudOff className="h-5 w-5 text-amber-300" />
        <div className="flex-1">
          {pending.length > 0 && <div className="font-medium text-amber-300">{t("layout.sync.pending", { n: pending.length })}</div>}
          {conflicts.length > 0 && <div className="font-medium text-rose-300">{t("layout.sync.conflict", { n: conflicts.length })}</div>}
        </div>
        {pending.length > 0 && (
          <Button size="sm" variant="outline" disabled={busy} className="rounded-full" onClick={async () => {
            setBusy(true);
            const n = await syncQueue();
            setBusy(false);
            toast({ title: n ? t("layout.sync.done", { n }) : t("layout.sync.still") });
          }}>
            <RefreshCw className={`mr-2 h-4 w-4 ${busy ? "animate-spin" : ""}`} />{t("layout.sync.syncNow")}
          </Button>
        )}
      </div>
      {conflicts.map((c) => (
        <div key={c.id} className="mt-3 flex items-start justify-between gap-3 rounded-xl bg-glass-2 p-3">
          <div>
            <div className="font-medium">{c.label}</div>
            <div className="text-xs text-rose-300">{t("layout.sync.rejected", { error: c.error })}</div>
            <div className="text-xs text-ink/50">{t("layout.sync.nothingOverwritten")}</div>
          </div>
          <Button size="sm" variant="ghost" onClick={() => dismissAction(c.id)}>{t("layout.sync.dismiss")}</Button>
        </div>
      ))}
    </div>
  );
}

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const mode = useRealtimeMode();
  if (!user) return null;
  const items = NAV[user.role];

  return (
    <div className="relative min-h-screen">
      <button className="glass-strong fixed right-4 top-4 z-50 rounded-full p-3 md:hidden" onClick={() => setOpen(!open)} aria-label={open ? t("layout.closeMenu") : t("layout.openMenu")} aria-expanded={open}>
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
      <aside className={`glass-strong fixed inset-y-3 left-3 z-40 flex w-[248px] flex-col rounded-[28px] p-4 transition-transform duration-500 ease-out md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-[120%]"}`} aria-label={t("layout.workspaceNav")}>
        <Link href="/" className="mb-6 px-2 pt-1"><Logo /></Link>
        {user.role === "farmer" && user.status === "active" && (
          <Link href="/farmer/lots/new" onClick={() => setOpen(false)} className="mb-5 flex items-center justify-center gap-2 rounded-full bg-white py-3 text-sm font-medium text-neutral-950 transition-shadow hover:shadow-[0_0_34px_-6px_rgba(255,255,255,0.55)]"><Plus className="h-4 w-4" />{t("layout.newLot")}</Link>
        )}
        <nav className="flex-1 space-y-0.5 overflow-y-auto">
          {items.map((n) => {
            const active = location === n.href || (n.href !== `/${user.role}` && n.href !== "/scan" && location.startsWith(`${n.href}/`));
            return (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined}>
                <div className={`group flex cursor-pointer items-center gap-3 rounded-2xl px-3.5 py-2.5 text-[13px] transition-colors ${active ? "bg-white/10 text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]" : "text-ink/55 hover:bg-white/[0.05] hover:text-ink"}`}>
                  <n.icon size={17} strokeWidth={1.5} className={active ? "text-accent" : ""} /> {t(`layout.nav.${n.name}`)}
                  {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_10px_2px_rgba(134,214,160,0.6)]" />}
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="mt-3 border-t border-white/[0.08] pt-3">
          <div className="mb-3 flex items-center gap-2 px-2 text-[11px] text-ink/45" title={t("layout.liveHint")}>
            {mode === "live" ? <Wifi size={13} className="text-accent" /> : <WifiOff size={13} className="text-amber-300" />}
            {mode === "live" ? t("layout.live") : mode === "polling" ? t("layout.polling") : t("layout.offline")}
          </div>
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-accent/15 text-sm text-accent">{user.name[0]?.toUpperCase()}</div>
            <div className="min-w-0 flex-1"><div className="truncate text-[13px]">{user.name}</div><div className="text-[10px] uppercase tracking-[0.16em] text-ink/40">{enumLabel("role", user.role)}</div></div>
            <button onClick={() => void logout()} className="rounded-full p-2 text-ink/50 transition-colors hover:bg-white/10 hover:text-ink" aria-label={t("layout.signOut")}><LogOut size={16} /></button>
          </div>
        </div>
      </aside>
      {open && <div className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setOpen(false)} />}
      <main id="main" tabIndex={-1} className="relative z-[2] min-w-0 outline-none md:pl-[272px]">
        <div className="mx-auto max-w-[1280px] p-4 pt-20 md:p-10 md:pt-10">
          {user.role === "farmer" && user.status === "pending" && (
            <div className="mb-6 rounded-3xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-100">
              <b className="font-medium">{t("layout.pendingTitle")}</b> {t("layout.pendingBody")}
            </div>
          )}
          <SyncStatus />
          {children}
        </div>
      </main>
    </div>
  );
}
