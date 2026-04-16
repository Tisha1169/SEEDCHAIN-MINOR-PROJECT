import { useState } from "react";
import { useRoute, Link } from "wouter";
import { Navbar } from "@/components/layout/navbar";
import { PageTransition } from "@/components/page-transition";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  MapPin, Truck, Package, CheckCircle2, Circle, Clock, Search, 
  ArrowRight, Warehouse, ShoppingBag, Sprout, Navigation
} from "lucide-react";

const TRACKING_STATUSES = [
  { key: "order_created", label: "Order Created", icon: Package },
  { key: "accepted_by_logistics", label: "Accepted by Logistics", icon: Truck },
  { key: "picked_up_from_farm", label: "Picked Up From Farm", icon: Sprout },
  { key: "arrived_at_cold_storage", label: "Arrived At Cold Storage", icon: Warehouse },
  { key: "stored", label: "Stored", icon: Warehouse },
  { key: "picked_up_for_delivery", label: "Picked Up For Delivery", icon: Package },
  { key: "in_transit", label: "In Transit", icon: Navigation },
  { key: "delivered_to_buyer", label: "Delivered To Buyer", icon: ShoppingBag },
];

function getStatusBadgeColor(status: string) {
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

interface TrackingEvent {
  id: number;
  status: string;
  location: string | null;
  latitude: string | null;
  longitude: string | null;
  notes: string | null;
  timestamp: string;
}

interface TrackingData {
  trackingId: string;
  batchId: number;
  batchCode: string;
  variety: string;
  currentStatus: string;
  currentLocation: string | null;
  currentLatitude: string | null;
  currentLongitude: string | null;
  transportInfo: {
    vehicleNumber: string;
    originLocation: string;
    destinationLocation: string;
    driverName: string;
  } | null;
  timeline: TrackingEvent[];
}

export default function TrackingPage() {
  const [, params] = useRoute("/tracking/:trackingId");
  const [searchInput, setSearchInput] = useState("");
  const [trackingData, setTrackingData] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const trackingId = params?.trackingId;

  const fetchTracking = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tracking/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError("Tracking ID not found. Please check and try again.");
        } else {
          setError("Failed to fetch tracking data.");
        }
        setTrackingData(null);
        return;
      }
      const data = await res.json();
      setTrackingData(data);
    } catch {
      setError("Network error. Please try again.");
      setTrackingData(null);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  // Auto-fetch if URL has tracking ID
  useState(() => {
    if (trackingId) {
      setSearchInput(trackingId);
      fetchTracking(trackingId);
    }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      fetchTracking(searchInput.trim());
    }
  };

  const currentStatusIndex = trackingData
    ? TRACKING_STATUSES.findIndex(s => s.key === trackingData.currentStatus)
    : -1;

  return (
    <PageTransition className="min-h-screen bg-[#F7F7F7]">
      <Navbar />

      <div className="pt-28 pb-16 px-4 max-w-5xl mx-auto">
        {/* Search Section */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-[#1A1A1A] mb-3">Track Your Shipment</h1>
          <p className="text-muted-foreground text-lg mb-8">Enter your tracking ID to see real-time shipment status</p>
          
          <form onSubmit={handleSearch} className="flex gap-3 max-w-lg mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Enter Tracking ID (e.g. TRK-9482392)"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-12 h-14 rounded-full text-lg border-2 focus-visible:ring-[#3FAF5E] focus-visible:border-[#3FAF5E]"
              />
            </div>
            <Button type="submit" size="lg" className="rounded-full h-14 px-8 bg-[#3FAF5E] hover:bg-[#3FAF5E]/90 text-white" disabled={loading}>
              {loading ? "Tracking..." : "Track"}
            </Button>
          </form>
        </div>

        {error && (
          <Card className="border-none shadow-sm bg-white max-w-lg mx-auto">
            <CardContent className="p-8 text-center">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        )}

        {!searched && !trackingData && !loading && (
          <Card className="border-none shadow-sm bg-white max-w-lg mx-auto">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-[#3FAF5E]/10 flex items-center justify-center mx-auto mb-4">
                <Truck className="w-8 h-8 text-[#3FAF5E]" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-[#1A1A1A]">Shipment Tracking</h3>
              <p className="text-muted-foreground">Enter a tracking ID above to view the complete shipment journey, real-time location, and delivery timeline.</p>
            </CardContent>
          </Card>
        )}

        {trackingData && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Tracking Header */}
            <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
              <CardContent className="p-0">
                <div className="p-6 border-b border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-bold text-[#1A1A1A]">{trackingData.trackingId}</h2>
                      <Badge className={`${getStatusBadgeColor(trackingData.currentStatus)} border-none capitalize text-sm`}>
                        {trackingData.currentStatus.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground">
                      Batch: <span className="font-medium text-[#1A1A1A]">{trackingData.batchCode}</span>
                      {trackingData.variety && <> · {trackingData.variety}</>}
                    </p>
                  </div>
                  {trackingData.transportInfo && (
                    <div className="bg-[#F7F7F7] rounded-2xl p-4 text-sm">
                      <p className="text-muted-foreground">Vehicle: <span className="font-medium text-[#1A1A1A]">{trackingData.transportInfo.vehicleNumber || 'N/A'}</span></p>
                      <p className="text-muted-foreground">Driver: <span className="font-medium text-[#1A1A1A]">{trackingData.transportInfo.driverName || 'N/A'}</span></p>
                    </div>
                  )}
                </div>

                {/* Map Placeholder */}
                <div className="h-64 bg-gradient-to-br from-[#3FAF5E]/5 via-[#3B82F6]/5 to-[#8FD14F]/5 relative flex items-center justify-center">
                  <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%233FAF5E' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                  }}></div>
                  
                  {trackingData.transportInfo ? (
                    <div className="relative z-10 flex items-center gap-12">
                      <div className="text-center">
                        <div className="w-12 h-12 rounded-full bg-[#3FAF5E]/20 flex items-center justify-center mx-auto mb-2">
                          <MapPin className="w-6 h-6 text-[#3FAF5E]" />
                        </div>
                        <p className="text-sm font-medium">{trackingData.transportInfo.originLocation}</p>
                        <p className="text-xs text-muted-foreground">Origin</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-0.5 bg-[#3FAF5E]"></div>
                        <div className="w-10 h-10 rounded-full bg-[#3B82F6] flex items-center justify-center animate-pulse">
                          <Truck className="w-5 h-5 text-white" />
                        </div>
                        <div className="w-16 h-0.5 bg-gray-300"></div>
                      </div>
                      <div className="text-center">
                        <div className="w-12 h-12 rounded-full bg-[#3B82F6]/20 flex items-center justify-center mx-auto mb-2">
                          <MapPin className="w-6 h-6 text-[#3B82F6]" />
                        </div>
                        <p className="text-sm font-medium">{trackingData.transportInfo.destinationLocation}</p>
                        <p className="text-xs text-muted-foreground">Destination</p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative z-10 text-center">
                      <MapPin className="w-10 h-10 text-[#3FAF5E] mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {trackingData.currentLocation || "Location data will appear when shipment is in transit"}
                      </p>
                    </div>
                  )}
                </div>

                {/* Status Progress Bar */}
                <div className="p-6 border-t border-border">
                  <div className="flex items-center justify-between overflow-x-auto pb-2 gap-1">
                    {TRACKING_STATUSES.map((status, i) => {
                      const isCompleted = i <= currentStatusIndex;
                      const isCurrent = i === currentStatusIndex;
                      return (
                        <div key={status.key} className="flex items-center min-w-0">
                          <div className={`flex flex-col items-center ${isCurrent ? 'scale-110' : ''} transition-transform`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                              ${isCompleted ? 'bg-[#3FAF5E] text-white' : 'bg-gray-100 text-gray-400'}
                              ${isCurrent ? 'ring-4 ring-[#3FAF5E]/20' : ''}
                            `}>
                              {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                            </div>
                          </div>
                          {i < TRACKING_STATUSES.length - 1 && (
                            <div className={`h-0.5 w-4 md:w-8 mx-1 ${i < currentStatusIndex ? 'bg-[#3FAF5E]' : 'bg-gray-200'}`}></div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card className="border-none shadow-sm bg-white rounded-3xl">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-[#1A1A1A] mb-6">Shipment Timeline</h3>
                <div className="space-y-0">
                  {trackingData.timeline.slice().reverse().map((event, i) => {
                    const statusDef = TRACKING_STATUSES.find(s => s.key === event.status);
                    const StatusIcon = statusDef?.icon || Package;
                    const isLatest = i === 0;
                    return (
                      <div key={event.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0
                            ${isLatest ? 'bg-[#3FAF5E] text-white' : 'bg-[#3FAF5E]/10 text-[#3FAF5E]'}
                          `}>
                            <StatusIcon className="w-5 h-5" />
                          </div>
                          {i < trackingData.timeline.length - 1 && (
                            <div className="w-0.5 h-16 bg-gray-200 my-1"></div>
                          )}
                        </div>
                        <div className="pb-8">
                          <p className={`font-semibold capitalize ${isLatest ? 'text-[#1A1A1A]' : 'text-muted-foreground'}`}>
                            {event.status.replace(/_/g, ' ')}
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{new Date(event.timestamp).toLocaleString()}</span>
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                              <MapPin className="w-3.5 h-3.5" />
                              <span>{event.location}</span>
                            </div>
                          )}
                          {event.notes && (
                            <p className="text-sm text-muted-foreground mt-1 italic">{event.notes}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {trackingData.timeline.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-muted" />
                    <p>No timeline events yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
