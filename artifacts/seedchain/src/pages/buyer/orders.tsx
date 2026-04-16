import { useAuth } from "@/hooks/use-auth";
import { useListOrders } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function BuyerOrders() {
  const { user } = useAuth();
  
  const { data: orders, isLoading } = useListOrders(
    { buyerId: user?.id },
    { query: { enabled: !!user?.id, queryKey: ['orders', user?.id] } }
  );

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-gray-100 text-gray-700",
      confirmed: "bg-blue-100 text-blue-700",
      dispatched: "bg-purple-100 text-purple-700",
      delivered: "bg-green-100 text-green-700",
      cancelled: "bg-red-100 text-red-700"
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Orders</h1>
          <p className="text-muted-foreground">Track your purchased seed batches.</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="font-semibold">Order ID</TableHead>
                <TableHead className="font-semibold">Batch Code</TableHead>
                <TableHead className="font-semibold">Variety</TableHead>
                <TableHead className="font-semibold">Quantity</TableHead>
                <TableHead className="font-semibold">Total Price</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                </TableRow>
              ) : orders?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No orders placed yet.</TableCell>
                </TableRow>
              ) : (
                orders?.map((order) => (
                  <TableRow key={order.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium">#{order.id}</TableCell>
                    <TableCell>{order.batchCode}</TableCell>
                    <TableCell>{order.variety}</TableCell>
                    <TableCell>{order.quantityKg.toLocaleString()} kg</TableCell>
                    <TableCell>${order.totalPrice?.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`${getStatusColor(order.status)} capitalize border-none`}>
                        {order.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
