import { useAuth } from "@/hooks/use-auth";
import { useGetBuyerDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBag, Truck, Package, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function BuyerDashboard() {
  const { user } = useAuth();
  
  const { data: dashboard, isLoading } = useGetBuyerDashboard(user?.id ?? 0, {
    query: {
      enabled: !!user?.id,
      queryKey: ['buyerDashboard', user?.id]
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Buyer Overview</h1>
        <p className="text-muted-foreground mt-1">Track your orders and purchased volumes.</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover-lift border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Orders</CardTitle>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboard?.activeOrders || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently open orders</p>
          </CardContent>
        </Card>
        
        <Card className="hover-lift border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Purchased Volume</CardTitle>
            <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-secondary-foreground">
              <Package className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboard?.totalPurchasedKg ? (dashboard.totalPurchasedKg / 1000).toFixed(1) : 0}t</div>
            <p className="text-xs text-muted-foreground mt-1">Total tons purchased</p>
          </CardContent>
        </Card>

        <Card className="hover-lift border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Transit</CardTitle>
            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent">
              <Truck className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboard?.inTransitOrders || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Orders on the way</p>
          </CardContent>
        </Card>

        <Card className="hover-lift border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Action</CardTitle>
            <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-600">
              <Clock className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting your review</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm bg-white max-w-3xl">
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {dashboard?.recentOrders?.slice(0, 5).map((order, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className={`w-2 h-2 rounded-full mt-1.5 self-start ${
                  order.status === 'delivered' ? 'bg-primary' : 
                  order.status === 'in_transit' ? 'bg-secondary' : 'bg-muted-foreground'
                }`}></div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <p className="text-sm font-medium">Batch {order.batchCode} - {order.variety}</p>
                    <p className="text-sm font-medium">${order.totalPrice?.toLocaleString()}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{order.quantityKg}kg • {order.status.replace('_', ' ')}</p>
                </div>
              </div>
            ))}
            {(!dashboard?.recentOrders || dashboard.recentOrders.length === 0) && (
              <p className="text-sm text-muted-foreground">No recent orders found.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
