import { useAuth } from "@/hooks/use-auth";
import { useGetStorageDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Warehouse, Truck, Package, Activity } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function StorageDashboard() {
  const { user } = useAuth();
  
  const { data: dashboard, isLoading } = useGetStorageDashboard(user?.id ?? 0, {
    query: {
      enabled: !!user?.id,
      queryKey: ['storageDashboard', user?.id]
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
        <h1 className="text-3xl font-bold text-foreground">Storage Overview</h1>
        <p className="text-muted-foreground mt-1">Facility status and inventory metrics.</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover-lift border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Inventory</CardTitle>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Warehouse className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboard?.totalInventoryKg ? (dashboard.totalInventoryKg / 1000).toFixed(1) : 0}t</div>
            <p className="text-xs text-muted-foreground mt-1">Current total volume</p>
          </CardContent>
        </Card>
        
        <Card className="hover-lift border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Incoming</CardTitle>
            <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-secondary-foreground">
              <Truck className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboard?.incomingShipments || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Pending arrivals</p>
          </CardContent>
        </Card>

        <Card className="hover-lift border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Outgoing</CardTitle>
            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent">
              <Package className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboard?.outgoingShipments || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Pending releases</p>
          </CardContent>
        </Card>

        <Card className="hover-lift border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Occupancy</CardTitle>
            <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-600">
              <Activity className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboard?.occupancyPercent || 0}%</div>
            <p className="text-xs text-muted-foreground mt-1">Facility utilization</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm bg-white max-w-3xl">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {dashboard?.recentRecords?.slice(0, 5).map((record, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className={`w-2 h-2 rounded-full mt-1.5 self-start ${
                  record.status === 'incoming' ? 'bg-secondary' : 
                  record.status === 'stored' ? 'bg-primary' : 'bg-accent'
                }`}></div>
                <div>
                  <p className="text-sm font-medium">Batch {record.batchCode} - {record.status}</p>
                  <p className="text-xs text-muted-foreground">Quantity: {record.quantityKg}kg</p>
                </div>
              </div>
            ))}
            {(!dashboard?.recentRecords || dashboard.recentRecords.length === 0) && (
              <p className="text-sm text-muted-foreground">No recent activity found.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
