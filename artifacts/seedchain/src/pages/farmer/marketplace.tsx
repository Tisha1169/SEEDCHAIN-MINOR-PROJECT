import { useAuth } from "@/hooks/use-auth";
import { useListBatches } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function FarmerMarketplace() {
  const { user } = useAuth();
  
  const { data: batches, isLoading } = useListBatches(
    { farmerId: user?.id, status: 'harvested' },
    { query: { enabled: !!user?.id, queryKey: ['batches', user?.id, 'harvested'] } }
  );

  // In a real app, there would be a separate marketplace_listings table
  // Here we just show harvested batches that could be listed

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Marketplace</h1>
          <p className="text-muted-foreground">List your harvested crops for sale.</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="font-semibold">Batch Code</TableHead>
                <TableHead className="font-semibold">Variety</TableHead>
                <TableHead className="font-semibold">Quantity Available</TableHead>
                <TableHead className="font-semibold">Quality</TableHead>
                <TableHead className="font-semibold text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                </TableRow>
              ) : batches?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No harvested batches available to list.</TableCell>
                </TableRow>
              ) : (
                batches?.map((batch) => (
                  <TableRow key={batch.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium">{batch.batchCode}</TableCell>
                    <TableCell>{batch.variety}</TableCell>
                    <TableCell>{batch.quantityKg.toLocaleString()} kg</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-green-100 text-green-700 border-none">
                        Grade {batch.qualityGrade || 'A'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" className="rounded-xl border-2">List on Market</Button>
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
