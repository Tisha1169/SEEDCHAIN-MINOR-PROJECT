import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Navigation, Send } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function LogisticsUpdateLocation() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [trackingId, setTrackingId] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude.toFixed(7));
          setLongitude(pos.coords.longitude.toFixed(7));
          toast({ title: "Location acquired", description: "GPS coordinates updated." });
        },
        () => {
          toast({ title: "Error", description: "Could not get current location.", variant: "destructive" });
        }
      );
    }
  };

  const handleUpdateLocation = async () => {
    if (!trackingId) {
      toast({ title: "Error", description: "Please enter a tracking ID.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/tracking/update-location", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          trackingId,
          latitude: latitude || undefined,
          longitude: longitude || undefined,
          location: location || undefined,
          status: status || undefined,
          notes: notes || undefined,
        }),
      });
      if (res.ok) {
        toast({ title: "Success", description: "Shipment location updated." });
        setNotes("");
      } else {
        const err = await res.json();
        toast({ title: "Error", description: err.error || "Failed to update.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Update Shipment Location</h1>
        <p className="text-muted-foreground">Update GPS coordinates and status for active shipments.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm bg-white rounded-3xl">
          <CardContent className="p-6 space-y-5">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Tracking ID</label>
              <Input
                placeholder="TRK-9482392"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Status Update</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="accepted_by_logistics">Accepted by Logistics</SelectItem>
                  <SelectItem value="picked_up_from_farm">Picked Up From Farm</SelectItem>
                  <SelectItem value="arrived_at_cold_storage">Arrived At Cold Storage</SelectItem>
                  <SelectItem value="picked_up_for_delivery">Picked Up For Delivery</SelectItem>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="delivered_to_buyer">Delivered To Buyer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Location Name</label>
              <Input
                placeholder="e.g. Ludhiana Cold Storage Facility"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Latitude</label>
                <Input
                  type="number"
                  step="any"
                  placeholder="30.9010560"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="rounded-xl font-mono"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Longitude</label>
                <Input
                  type="number"
                  step="any"
                  placeholder="75.8572310"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="rounded-xl font-mono"
                />
              </div>
            </div>

            <Button 
              variant="outline" 
              className="w-full rounded-xl border-2" 
              onClick={handleGetCurrentLocation}
            >
              <Navigation className="w-4 h-4 mr-2" />
              Use Current GPS Location
            </Button>

            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Notes (Optional)</label>
              <Input
                placeholder="Any additional details..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <Button 
              className="w-full rounded-xl bg-[#3FAF5E] hover:bg-[#3FAF5E]/90 text-white h-12"
              onClick={handleUpdateLocation}
              disabled={loading}
            >
              <Send className="w-4 h-4 mr-2" />
              {loading ? "Updating..." : "Update Shipment"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white rounded-3xl">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-foreground mb-4">Location Preview</h3>
            <div className="h-72 bg-gradient-to-br from-[#3FAF5E]/5 to-[#3B82F6]/5 rounded-2xl flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%233FAF5E' fill-opacity='0.3'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
              }}></div>
              {latitude && longitude ? (
                <div className="text-center z-10">
                  <div className="w-12 h-12 rounded-full bg-[#3FAF5E] flex items-center justify-center mx-auto mb-3 shadow-lg animate-bounce">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  <p className="font-mono text-sm">{latitude}, {longitude}</p>
                  {location && <p className="text-sm text-muted-foreground mt-1">{location}</p>}
                </div>
              ) : (
                <div className="text-center z-10">
                  <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Enter coordinates or use GPS to preview location</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
