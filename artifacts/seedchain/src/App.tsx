import { useTranslation } from "react-i18next";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, type ComponentType } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, homeFor, useAuth } from "@/hooks/use-auth";
import { RealtimeProvider } from "@/hooks/use-realtime";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Loading } from "@/components/app/common";
import { syncQueue } from "@/lib/offline-queue";

import Landing from "@/pages/public/landing";
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";
import { PageHeader } from "@/components/app/common";

// Everything except the landing page and auth is loaded on demand (scanner, charts and dashboards are heavy).
const NotFound = lazy(() => import("@/pages/not-found"));
const HowItWorks = lazy(() => import("@/pages/public/how-it-works"));
const TracePage = lazy(() => import("@/pages/public/trace"));
const ScanPage = lazy(() => import("@/pages/public/scan"));
const MarketplacePage = lazy(() => import("@/pages/public/marketplace").then((m) => ({ default: m.MarketplacePage })));
const ListingPage = lazy(() => import("@/pages/public/marketplace").then((m) => ({ default: m.ListingPage })));
const FarmerPublicPage = lazy(() => import("@/pages/public/marketplace").then((m) => ({ default: m.FarmerPublicPage })));
const OrdersList = lazy(() => import("@/pages/orders").then((m) => ({ default: m.OrdersList })));
const OrderDetail = lazy(() => import("@/pages/orders").then((m) => ({ default: m.OrderDetail })));
const AlertsPage = lazy(() => import("@/pages/alerts"));
const InventoryPage = lazy(() => import("@/pages/inventory"));
const AccountPage = lazy(() => import("@/pages/account"));
const FarmerDashboard = lazy(() => import("@/pages/farmer/dashboard"));
const FarmsPage = lazy(() => import("@/pages/farmer/farms"));
const FarmerLots = lazy(() => import("@/pages/farmer/lots"));
const LotsTable = lazy(() => import("@/pages/farmer/lots").then((m) => ({ default: m.LotsTable })));
const LotNew = lazy(() => import("@/pages/farmer/lot-new"));
const LotDetailPage = lazy(() => import("@/pages/farmer/lot-detail"));
const MarketPage = lazy(() => import("@/pages/farmer/market"));
const CustomerDashboard = lazy(() => import("@/pages/customer/dashboard"));
const AdminDashboard = lazy(() => import("@/pages/admin/dashboard"));
const AdminUsers = lazy(() => import("@/pages/admin/users"));
const AdminEvents = lazy(() => import("@/pages/admin/logs").then((m) => ({ default: m.AdminEvents })));
const AdminAudit = lazy(() => import("@/pages/admin/logs").then((m) => ({ default: m.AdminAudit })));
const AdminIntegrations = lazy(() => import("@/pages/admin/logs").then((m) => ({ default: m.AdminIntegrations })));

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: true, staleTime: 5_000 } } });

type Role = "admin" | "farmer" | "customer";

/** UI guard only. Every API call is independently authorised by the backend. */
function Protected({ component: C, role }: { component: ComponentType; role: Role }) {
  const { user, loading, serviceError } = useAuth();
  if (loading) return <Loading />;
  if (serviceError && !user) return <div className="p-10 text-center">{serviceError}</div>;
  if (!user) return <Redirect to="/login" />;
  if (user.role !== role) return <Redirect to={homeFor(user.role)} />;
  return <DashboardLayout><C /></DashboardLayout>;
}
/** Any signed-in role (account page). */
function ProtectedAny({ component: C }: { component: ComponentType }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Redirect to="/login" />;
  return <DashboardLayout><C /></DashboardLayout>;
}
const P = (role: Role, C: ComponentType) => () => <Protected role={role} component={C} />;

const AdminLots = () => (<><PageHeader title="Lots & QR codes" subtitle="All lots across farmers." /><LotsTable base="admin" /></>);

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/how-it-works" component={HowItWorks} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/trace/:token" component={TracePage} />
      <Route path="/scan" component={ScanPage} />
      <Route path="/marketplace" component={MarketplacePage} />
      <Route path="/marketplace/:lotId" component={ListingPage} />
      <Route path="/farmers/:id" component={FarmerPublicPage} />

      <Route path="/farmer">{P("farmer", FarmerDashboard)}</Route>
      <Route path="/farmer/farms">{P("farmer", FarmsPage)}</Route>
      <Route path="/farmer/lots">{P("farmer", FarmerLots)}</Route>
      <Route path="/farmer/lots/new">{P("farmer", LotNew)}</Route>
      <Route path="/farmer/lots/:id">{P("farmer", () => <LotDetailPage base="farmer" />)}</Route>
      <Route path="/farmer/orders">{P("farmer", () => <OrdersList base="farmer" />)}</Route>
      <Route path="/farmer/orders/:id">{P("farmer", () => <OrderDetail base="farmer" />)}</Route>
      <Route path="/farmer/inventory">{P("farmer", InventoryPage)}</Route>
      <Route path="/farmer/market">{P("farmer", MarketPage)}</Route>
      <Route path="/farmer/alerts">{P("farmer", AlertsPage)}</Route>

      <Route path="/customer">{P("customer", CustomerDashboard)}</Route>
      <Route path="/customer/orders">{P("customer", () => <OrdersList base="customer" />)}</Route>
      <Route path="/customer/orders/:id">{P("customer", () => <OrderDetail base="customer" />)}</Route>

      <Route path="/admin">{P("admin", AdminDashboard)}</Route>
      <Route path="/admin/users">{P("admin", AdminUsers)}</Route>
      <Route path="/admin/lots">{P("admin", AdminLots)}</Route>
      <Route path="/admin/lots/:id">{P("admin", () => <LotDetailPage base="admin" />)}</Route>
      <Route path="/admin/orders">{P("admin", () => <OrdersList base="admin" />)}</Route>
      <Route path="/admin/orders/:id">{P("admin", () => <OrderDetail base="admin" />)}</Route>
      <Route path="/admin/inventory">{P("admin", InventoryPage)}</Route>
      <Route path="/admin/events">{P("admin", AdminEvents)}</Route>
      <Route path="/admin/alerts">{P("admin", AlertsPage)}</Route>
      <Route path="/admin/integrations">{P("admin", AdminIntegrations)}</Route>
      <Route path="/admin/audit">{P("admin", AdminAudit)}</Route>
      <Route path="/account">{() => <ProtectedAny component={AccountPage} />}</Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function OfflineSync() {
  useEffect(() => {
    const run = () => void syncQueue().then(() => queryClient.invalidateQueries());
    run();
    window.addEventListener("online", run);
    const t = setInterval(run, 60_000);
    return () => { window.removeEventListener("online", run); clearInterval(t); };
  }, []);
  return null;
}

export default function App() {
  const { i18n } = useTranslation();
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <RealtimeProvider>
              <OfflineSync />
              <Suspense fallback={<Loading />}>
                <Router key={i18n.language} />
              </Suspense>
            </RealtimeProvider>
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
