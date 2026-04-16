import { useAuth } from "@/hooks/use-auth";
import { useGetLogisticsDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, MapPin, CheckCircle, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function LogisticsDashboard() {
  const { user } = useAuth();
  
  const { data: dashboard, isLoading } = useGetLogisticsDashboard(user?.id ?? 0, {
    query: {
      enabled: !!user?.id,
      queryKey: ['logisticsDashboard', user?.id]
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
        <h1 className="text-3xl font-bold text-foreground">Logistics Overview</h1>
        <p className="text-muted-foreground mt-1">Manage your active deliveries and routes.</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover-lift border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Assigned</CardTitle>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Clock className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboard?.assignedDeliveries || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Deliveries pending pickup</p>
          </CardContent>
        </Card>
        
        <Card className="hover-lift border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Transit</CardTitle>
            <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-secondary-foreground">
              <Truck className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboard?.inTransit || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently on the road</p>
          </CardContent>
        </Card>

        <Card className="hover-lift border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent">
              <CheckCircle className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboard?.completedToday || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Completed today</p>
          </CardContent>
        </Card>

        <Card className="hover-lift border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Pickups</CardTitle>
            <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-600">
              <MapPin className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboard?.pendingPickups || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting driver action</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm bg-white max-w-3xl">
        <CardHeader>
          <CardTitle>Recent Transports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {dashboard?.recentTransports?.slice(0, 5).map((transport, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className={`w-2 h-2 rounded-full mt-1.5 self-start ${
                  transport.status === 'delivered' ? 'bg-primary' : 
                  transport.status === 'in_transit' ? 'bg-secondary' : 'bg-muted-foreground'
                }`}></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Batch {transport.batchCode} - {transport.status.replace('_', ' ')}</p>
                  <p className="text-xs text-muted-foreground">{transport.originLocation} → {transport.destinationLocation}</p>
                </div>
              </div>
            ))}
            {(!dashboard?.recentTransports || dashboard.recentTransports.length === 0) && (
              <p className="text-sm text-muted-foreground">No recent transports found.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
