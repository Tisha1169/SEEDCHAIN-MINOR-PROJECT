import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Truck, Warehouse, Sprout, ShoppingBag, Navigation } from "lucide-react";
import { useState, useEffect } from "react";

interface ActiveShipment {
  id: number;
  trackingId: string;
  batchId: number;
  status: string;
  location: string | null;
  latitude: string | null;
  longitude: string | null;
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

function getStatusIcon(status: string) {
  if (status.includes("transit") || status.includes("picked_up")) return Truck;
  if (status.includes("storage") || status === "stored") return Warehouse;
  if (status.includes("farm")) return Sprout;
  if (status.includes("buyer") || status.includes("delivered")) return ShoppingBag;
  return MapPin;
}

export default function AdminSupplyChainMap() {
  const { user } = useAuth();
  const [shipments, setShipments] = useState<ActiveShipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShipments = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/tracking/all/active", {
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
  }, []);

  const statusGroups = {
    "In Transit": shipments.filter(s => s.status === "in_transit" || s.status === "picked_up_for_delivery"),
    "At Storage": shipments.filter(s => s.status === "arrived_at_cold_storage" || s.status === "stored"),
    "Pending Pickup": shipments.filter(s => s.status === "order_created" || s.status === "accepted_by_logistics"),
    "Being Collected": shipments.filter(s => s.status === "picked_up_from_farm"),
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Supply Chain Map</h1>
        <p className="text-muted-foreground">Real-time view of all active shipments across the platform.</p>
      </div>

      {/* Map Visualization */}
      <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
        <CardContent className="p-0">
          <div className="h-80 bg-gradient-to-br from-[#3FAF5E]/5 via-[#3B82F6]/5 to-[#8FD14F]/5 relative">
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%233FAF5E' fill-opacity='0.3'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }}></div>

            {/* Simulated map with shipment dots */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-full max-w-2xl h-64">
                {/* Farm locations */}
                <div className="absolute top-8 left-12 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-[#3FAF5E]/20 flex items-center justify-center border-2 border-[#3FAF5E]">
                    <Sprout className="w-5 h-5 text-[#3FAF5E]" />
                  </div>
                  <span className="text-xs mt-1 font-medium">Farms</span>
                </div>

                {/* Storage locations */}
                <div className="absolute top-4 right-32 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-[#3B82F6]/20 flex items-center justify-center border-2 border-[#3B82F6]">
                    <Warehouse className="w-5 h-5 text-[#3B82F6]" />
                  </div>
                  <span className="text-xs mt-1 font-medium">Storage</span>
                </div>

                {/* Active vehicles */}
                {shipments.filter(s => s.status === "in_transit").slice(0, 5).map((s, i) => (
                  <div 
                    key={s.id}
                    className="absolute animate-pulse flex flex-col items-center"
                    style={{ 
                      top: `${30 + (i * 20) % 50}%`, 
                      left: `${25 + (i * 15) % 55}%` 
                    }}
                  >
                    <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center shadow-lg">
                      <Truck className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-[10px] mt-0.5 font-mono bg-white/80 px-1 rounded">{s.trackingId}</span>
                  </div>
                ))}

                {/* Buyer locations */}
                <div className="absolute bottom-8 right-12 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center border-2 border-purple-500">
                    <ShoppingBag className="w-5 h-5 text-purple-500" />
                  </div>
                  <span className="text-xs mt-1 font-medium">Buyers</span>
                </div>

                {/* Connecting lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: -1 }}>
                  <line x1="15%" y1="20%" x2="45%" y2="50%" stroke="#3FAF5E" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
                  <line x1="45%" y1="50%" x2="75%" y2="15%" stroke="#3B82F6" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
                  <line x1="75%" y1="15%" x2="85%" y2="80%" stroke="#8B5CF6" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
                </svg>
              </div>
            </div>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-xl p-3 shadow-sm">
              <div className="flex gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#3FAF5E]"></div>
                  <span>Farms</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#3B82F6]"></div>
                  <span>Storage</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <span>In Transit</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <span>Buyers</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(statusGroups).map(([group, items]) => (
          <Card key={group} className="border-none shadow-sm bg-white rounded-2xl">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground font-medium">{group}</p>
              <p className="text-3xl font-bold text-[#1A1A1A] mt-1">{items.length}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active Shipments List */}
      <Card className="border-none shadow-sm bg-white rounded-3xl">
        <CardContent className="p-6">
          <h3 className="text-xl font-bold text-[#1A1A1A] mb-4">All Active Shipments</h3>
          {loading ? (
            <p className="text-muted-foreground py-4 text-center">Loading shipments...</p>
          ) : shipments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Navigation className="w-8 h-8 mx-auto mb-2 text-muted" />
              <p>No active shipments found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {shipments.map((shipment) => {
                const Icon = getStatusIcon(shipment.status);
                return (
                  <div key={shipment.id} className="flex items-center justify-between p-4 bg-[#F7F7F7] rounded-2xl hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-[#3FAF5E]/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-[#3FAF5E]" />
                      </div>
                      <div>
                        <p className="font-semibold text-[#1A1A1A]">{shipment.trackingId}</p>
                        <p className="text-sm text-muted-foreground">{shipment.batchCode} · {shipment.variety || 'Unknown'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {shipment.location && (
                        <span className="text-sm text-muted-foreground hidden md:block">{shipment.location}</span>
                      )}
                      <Badge className={`${getStatusColor(shipment.status)} border-none capitalize text-xs`}>
                        {shipment.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
