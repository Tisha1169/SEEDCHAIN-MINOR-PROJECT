import { useAuth } from "@/hooks/use-auth";
import { useGetFarmerDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sprout, Package, TrendingUp, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";

export default function FarmerDashboard() {
  const { user } = useAuth();
  
  const { data: dashboard, isLoading } = useGetFarmerDashboard(user?.id ?? 0, {
    query: {
      enabled: !!user?.id,
      queryKey: ['farmerDashboard', user?.id]
    }
  });

  const chartData = [
    { name: 'Jan', volume: 400 },
    { name: 'Feb', volume: 300 },
    { name: 'Mar', volume: 500 },
    { name: 'Apr', volume: 700 },
    { name: 'May', volume: 600 },
    { name: 'Jun', volume: 900 },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
        <Skeleton className="h-96 rounded-2xl w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Welcome back, {user?.name}</h1>
        <p className="text-muted-foreground mt-1">Here's what's happening with your crops today.</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover-lift border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Crops</CardTitle>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Sprout className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboard?.activeCrops || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">+2 from last month</p>
          </CardContent>
        </Card>
        
        <Card className="hover-lift border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Harvest</CardTitle>
            <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-secondary-foreground">
              <Package className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboard?.totalHarvestKg ? (dashboard.totalHarvestKg / 1000).toFixed(1) : 0}t</div>
            <p className="text-xs text-muted-foreground mt-1">Total tons harvested</p>
          </CardContent>
        </Card>

        <Card className="hover-lift border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Storage</CardTitle>
            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent">
              <TrendingUp className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboard?.inStorageKg ? (dashboard.inStorageKg / 1000).toFixed(1) : 0}t</div>
            <p className="text-xs text-muted-foreground mt-1">Currently in cold storage</p>
          </CardContent>
        </Card>

        <Card className="hover-lift border-none shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sold Volume</CardTitle>
            <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{dashboard?.soldKg ? (dashboard.soldKg / 1000).toFixed(1) : 0}t</div>
            <p className="text-xs text-muted-foreground mt-1">Total tons sold</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <Card className="col-span-2 border-none shadow-sm bg-white">
          <CardHeader>
            <CardTitle>Harvest Volume Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: 'hsl(var(--muted))'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px -2px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="volume" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {dashboard?.recentBatches?.slice(0, 5).map((batch, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 self-start"></div>
                  <div>
                    <p className="text-sm font-medium">Batch {batch.batchCode} planted</p>
                    <p className="text-xs text-muted-foreground">{new Date(batch.plantingDate).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
              {(!dashboard?.recentBatches || dashboard.recentBatches.length === 0) && (
                <p className="text-sm text-muted-foreground">No recent activity found.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
