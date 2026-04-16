import { useAuth } from "@/hooks/use-auth";
import { useListMarketplace, useCreateOrder } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Search, MapPin, Sprout, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function BuyerMarketplace() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: listings, isLoading } = useListMarketplace({
    query: { queryKey: ['marketplace'] }
  });

  const createOrder = useCreateOrder();

  const handlePurchase = (batchId: number, quantity: number, price: number) => {
    if (!user?.id) return;
    
    createOrder.mutate({
      data: {
        buyerId: user.id,
        batchId,
        quantityKg: quantity,
        pricePerKg: price
      }
    }, {
      onSuccess: () => {
        toast({ title: "Order Placed", description: "Your order has been submitted successfully." });
        queryClient.invalidateQueries({ queryKey: ['marketplace'] });
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Marketplace</h1>
          <p className="text-muted-foreground">Browse and purchase high-quality potato seed batches.</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9 bg-white border-none shadow-sm rounded-xl h-12" placeholder="Search varieties, locations..." />
      </div>

      {isLoading ? (
        <p>Loading marketplace...</p>
      ) : listings?.length === 0 ? (
        <div className="bg-white p-8 rounded-3xl text-center text-muted-foreground shadow-sm">
          No batches available in the marketplace currently.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings?.map((listing) => (
            <Card key={listing.batchId} className="border-none shadow-sm bg-white hover-lift overflow-hidden">
              <div className="h-32 bg-muted relative">
                <img src="https://images.unsplash.com/photo-1595841696650-6f1025dc9bd0?auto=format&fit=crop&w=400&q=80" alt="Potatoes" className="w-full h-full object-cover" />
                <Badge variant="secondary" className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm border-none">
                  Grade {listing.qualityGrade}
                </Badge>
              </div>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{listing.variety}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                      <Sprout className="w-3 h-3" /> {listing.farmerName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">${listing.pricePerKg}/kg</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" /> {listing.location || 'Unknown Location'}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="w-4 h-4" /> {listing.quantityKg.toLocaleString()} kg available
                </div>
                <div className="text-xs text-muted-foreground">
                  Harvested: {listing.harvestDate ? new Date(listing.harvestDate).toLocaleDateString() : 'N/A'}
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full rounded-xl bg-primary hover:bg-primary/90"
                  onClick={() => handlePurchase(listing.batchId, listing.quantityKg, listing.pricePerKg)}
                  disabled={createOrder.isPending}
                >
                  Purchase Batch
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
