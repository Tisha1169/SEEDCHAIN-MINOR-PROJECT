import { useAuth } from "@/hooks/use-auth";
import { useListTransportRecords } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Truck } from "lucide-react";

export default function LogisticsTracking() {
  const { user } = useAuth();
  
  const { data: records, isLoading } = useListTransportRecords(
    { driverId: user?.id, status: 'in_transit' },
    { query: { enabled: !!user?.id, queryKey: ['transportRecords', user?.id, 'in_transit'] } }
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Live Tracking</h1>
          <p className="text-muted-foreground">Monitor your active routes.</p>
        </div>
      </div>

      {isLoading ? (
        <p>Loading active routes...</p>
      ) : records?.length === 0 ? (
        <Card className="border-none shadow-sm bg-white p-8 text-center">
          <Truck className="w-12 h-12 text-muted mx-auto mb-4" />
          <p className="text-muted-foreground">No active routes in transit.</p>
        </Card>
      ) : (
        <div className="grid gap-6">
          {records?.map((record) => (
            <Card key={record.id} className="border-none shadow-sm bg-white overflow-hidden">
              <CardContent className="p-0">
                <div className="h-48 bg-muted w-full relative flex items-center justify-center">
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent"></div>
                  <MapPin className="w-8 h-8 text-primary" />
                  <span className="ml-2 text-sm text-muted-foreground font-mono">Map View Placeholder</span>
                </div>
                <div className="p-6 grid md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Batch Code</p>
                    <p className="text-lg font-bold">{record.batchCode}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Origin</p>
                    <p className="text-lg font-bold">{record.originLocation}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Destination</p>
                    <p className="text-lg font-bold">{record.destinationLocation}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
