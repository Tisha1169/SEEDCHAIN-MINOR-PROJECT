import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import About from "@/pages/about";
import HowItWorks from "@/pages/how-it-works";
import PublicMarketplace from "@/pages/marketplace";
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";
import TrackingPage from "@/pages/tracking";

// Farmer Pages
import FarmerDashboard from "@/pages/farmer/dashboard";
import FarmerBatches from "@/pages/farmer/batches";
import FarmerHarvests from "@/pages/farmer/harvests";
import FarmerMarketplace from "@/pages/farmer/marketplace";
import FarmerShipments from "@/pages/farmer/shipments";
import FarmerSetup from "@/pages/farmer/setup";
import FarmerRegisterCrop from "@/pages/farmer/register-crop";
import FarmerRecordHarvest from "@/pages/farmer/record-harvest";
import FarmerSendToStorage from "@/pages/farmer/send-to-storage";

// Storage Pages
import StorageDashboard from "@/pages/storage/dashboard";
import StorageInventory from "@/pages/storage/inventory";
import StorageIncoming from "@/pages/storage/incoming";
import StorageOutgoing from "@/pages/storage/outgoing";
import StorageSetup from "@/pages/storage/setup";

// Logistics Pages
import LogisticsDashboard from "@/pages/logistics/dashboard";
import LogisticsDeliveries from "@/pages/logistics/deliveries";
import LogisticsTracking from "@/pages/logistics/tracking";
import LogisticsUpdateLocation from "@/pages/logistics/update-location";
import LogisticsSetup from "@/pages/logistics/setup";

// Buyer Pages
import BuyerDashboard from "@/pages/buyer/dashboard";
import BuyerMarketplace from "@/pages/buyer/marketplace";
import BuyerOrders from "@/pages/buyer/orders";
import BuyerSetup from "@/pages/buyer/setup";

// Admin Pages
import AdminDashboard from "@/pages/admin/dashboard";
import AdminUsers from "@/pages/admin/users";
import AdminBatches from "@/pages/admin/batches";
import AdminStorage from "@/pages/admin/storage";
import AdminSupplyChainMap from "@/pages/admin/supply-chain-map";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component, allowedRoles }: { component: any, allowedRoles?: string[] }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Redirect to={`/${user.role}`} />;
  }

  return (
    <DashboardLayout>
      <Component />
    </DashboardLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/about" component={About} />
      <Route path="/how-it-works" component={HowItWorks} />
      <Route path="/marketplace" component={PublicMarketplace} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/tracking/:trackingId" component={TrackingPage} />
      <Route path="/tracking" component={TrackingPage} />
      
      {/* Farmer Routes */}
      <Route path="/farmer/setup">
        {() => <ProtectedRoute component={FarmerSetup} allowedRoles={["farmer", "admin"]} />}
      </Route>
      <Route path="/farmer/register-crop">
        {() => <ProtectedRoute component={FarmerRegisterCrop} allowedRoles={["farmer", "admin"]} />}
      </Route>
      <Route path="/farmer/record-harvest">
        {() => <ProtectedRoute component={FarmerRecordHarvest} allowedRoles={["farmer", "admin"]} />}
      </Route>
      <Route path="/farmer/send-to-storage">
        {() => <ProtectedRoute component={FarmerSendToStorage} allowedRoles={["farmer", "admin"]} />}
      </Route>
      <Route path="/farmer">
        {() => <ProtectedRoute component={FarmerDashboard} allowedRoles={["farmer", "admin"]} />}
      </Route>
      <Route path="/farmer/batches">
        {() => <ProtectedRoute component={FarmerBatches} allowedRoles={["farmer", "admin"]} />}
      </Route>
      <Route path="/farmer/harvests">
        {() => <ProtectedRoute component={FarmerHarvests} allowedRoles={["farmer", "admin"]} />}
      </Route>
      <Route path="/farmer/marketplace">
        {() => <ProtectedRoute component={FarmerMarketplace} allowedRoles={["farmer", "admin"]} />}
      </Route>
      <Route path="/farmer/shipments">
        {() => <ProtectedRoute component={FarmerShipments} allowedRoles={["farmer", "admin"]} />}
      </Route>
      
      {/* Storage Routes */}
      <Route path="/storage/setup">
        {() => <ProtectedRoute component={StorageSetup} allowedRoles={["storage", "admin"]} />}
      </Route>
      <Route path="/storage">
        {() => <ProtectedRoute component={StorageDashboard} allowedRoles={["storage", "admin"]} />}
      </Route>
      <Route path="/storage/inventory">
        {() => <ProtectedRoute component={StorageInventory} allowedRoles={["storage", "admin"]} />}
      </Route>
      <Route path="/storage/incoming">
        {() => <ProtectedRoute component={StorageIncoming} allowedRoles={["storage", "admin"]} />}
      </Route>
      <Route path="/storage/outgoing">
        {() => <ProtectedRoute component={StorageOutgoing} allowedRoles={["storage", "admin"]} />}
      </Route>

      {/* Logistics Routes */}
      <Route path="/logistics/setup">
        {() => <ProtectedRoute component={LogisticsSetup} allowedRoles={["logistics", "admin"]} />}
      </Route>
      <Route path="/logistics">
        {() => <ProtectedRoute component={LogisticsDashboard} allowedRoles={["logistics", "admin"]} />}
      </Route>
      <Route path="/logistics/deliveries">
        {() => <ProtectedRoute component={LogisticsDeliveries} allowedRoles={["logistics", "admin"]} />}
      </Route>
      <Route path="/logistics/tracking">
        {() => <ProtectedRoute component={LogisticsTracking} allowedRoles={["logistics", "admin"]} />}
      </Route>
      <Route path="/logistics/update-location">
        {() => <ProtectedRoute component={LogisticsUpdateLocation} allowedRoles={["logistics", "admin"]} />}
      </Route>

      {/* Buyer Routes */}
      <Route path="/buyer/setup">
        {() => <ProtectedRoute component={BuyerSetup} allowedRoles={["buyer", "admin"]} />}
      </Route>
      <Route path="/buyer">
        {() => <ProtectedRoute component={BuyerDashboard} allowedRoles={["buyer", "admin"]} />}
      </Route>
      <Route path="/buyer/marketplace">
        {() => <ProtectedRoute component={BuyerMarketplace} allowedRoles={["buyer", "admin"]} />}
      </Route>
      <Route path="/buyer/orders">
        {() => <ProtectedRoute component={BuyerOrders} allowedRoles={["buyer", "admin"]} />}
      </Route>

      {/* Admin Routes */}
      <Route path="/admin">
        {() => <ProtectedRoute component={AdminDashboard} allowedRoles={["admin"]} />}
      </Route>
      <Route path="/admin/users">
        {() => <ProtectedRoute component={AdminUsers} allowedRoles={["admin"]} />}
      </Route>
      <Route path="/admin/batches">
        {() => <ProtectedRoute component={AdminBatches} allowedRoles={["admin"]} />}
      </Route>
      <Route path="/admin/storage">
        {() => <ProtectedRoute component={AdminStorage} allowedRoles={["admin"]} />}
      </Route>
      <Route path="/admin/supply-chain-map">
        {() => <ProtectedRoute component={AdminSupplyChainMap} allowedRoles={["admin"]} />}
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
