import { useListBatches } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function AdminBatches() {
  const { data: batches, isLoading } = useListBatches({}, {
    query: { queryKey: ['batches', 'all'] }
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      planted: "bg-blue-100 text-blue-700",
      growing: "bg-green-100 text-green-700",
      harvested: "bg-yellow-100 text-yellow-700",
      in_storage: "bg-purple-100 text-purple-700",
      sold: "bg-gray-100 text-gray-700"
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Global Batch Tracking</h1>
          <p className="text-muted-foreground">Monitor all seed batches across the entire network.</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="font-semibold">Batch Code</TableHead>
                <TableHead className="font-semibold">Farmer</TableHead>
                <TableHead className="font-semibold">Variety</TableHead>
                <TableHead className="font-semibold">Quantity</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                </TableRow>
              ) : batches?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No batches found.</TableCell>
                </TableRow>
              ) : (
                batches?.map((batch) => (
                  <TableRow key={batch.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium">{batch.batchCode}</TableCell>
                    <TableCell>{batch.farmerName}</TableCell>
                    <TableCell>{batch.variety}</TableCell>
                    <TableCell>{batch.quantityKg.toLocaleString()} kg</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`${getStatusColor(batch.status)} capitalize border-none`}>
                        {batch.status.replace('_', ' ')}
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
