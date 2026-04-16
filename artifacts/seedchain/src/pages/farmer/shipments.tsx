import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Truck, MapPin, Package, Navigation } from "lucide-react";
import { useState, useEffect } from "react";

interface Shipment {
  id: number;
  trackingId: string;
  batchId: number;
  status: string;
  location: string | null;
  createdAt: string;
  batchCode: string | null;
  variety: string | null;
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    order_created: "bg-gray-100 text-gray-700",
    accepted_by_logistics: "bg-blue-100 text-blue-700",
    picked_up_from_farm: "bg-purple-100 text-purple-700",
    arrived_at_cold_storage: "bg-cyan-100 text-cyan-700",
    stored: "bg-indigo-100 text-indigo-700",
    picked_up_for_delivery: "bg-orange-100 text-orange-700",
    in_transit: "bg-yellow-100 text-yellow-700",
    delivered_to_buyer: "bg-green-100 text-green-700",
  };
  return colors[status] || "bg-gray-100 text-gray-700";
}

export default function FarmerShipments() {
  const { user } = useAuth();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const fetchShipments = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/shipments/user/${user.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setShipments(data);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchShipments();
  }, [user?.id]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-foreground">My Shipments</h1>
        <p className="text-muted-foreground">Track where your crop shipments are in real time.</p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading shipments...</p>
      ) : shipments.length === 0 ? (
        <Card className="border-none shadow-sm bg-white p-8 text-center">
          <Package className="w-12 h-12 text-muted mx-auto mb-4" />
          <p className="text-muted-foreground">No shipments found. Shipments will appear here once your crops are dispatched.</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {shipments.map((shipment) => (
            <Card key={shipment.id} className="border-none shadow-sm bg-white rounded-3xl overflow-hidden hover-lift">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-mono text-sm text-muted-foreground">{shipment.trackingId}</p>
                    <p className="font-bold text-lg text-foreground">{shipment.batchCode || 'Unknown Batch'}</p>
                    {shipment.variety && <p className="text-sm text-muted-foreground">{shipment.variety}</p>}
                  </div>
                  <Badge className={`${getStatusColor(shipment.status)} border-none capitalize text-xs`}>
                    {shipment.status.replace(/_/g, ' ')}
                  </Badge>
                </div>

                {shipment.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <MapPin className="w-4 h-4" />
                    <span>{shipment.location}</span>
                  </div>
                )}

                <Link href={`/tracking/${shipment.trackingId}`}>
                  <Button className="w-full rounded-xl bg-[#3FAF5E] hover:bg-[#3FAF5E]/90 text-white gap-2">
                    <Navigation className="w-4 h-4" />
                    Track Shipment
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
