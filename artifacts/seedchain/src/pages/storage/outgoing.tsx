import { useAuth } from "@/hooks/use-auth";
import { useListStorageRecords, useUpdateStorageRecord } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { UpdateStorageRecordBodyStatus } from "@workspace/api-client-react/src/generated/api.schemas";

export default function StorageOutgoing() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: records, isLoading } = useListStorageRecords(
    { operatorId: user?.id },
    { query: { enabled: !!user?.id, queryKey: ['storageRecords', user?.id] } }
  );

  const outgoing = records?.filter(r => r.status === 'released') || [];
  // For demo purposes, we show released ones as history. 
  // Normally there would be a process to mark 'stored' as 'released' for an order.
  
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Outgoing / Released</h1>
          <p className="text-muted-foreground">History of batches released from storage.</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="font-semibold">Batch Code</TableHead>
                <TableHead className="font-semibold">Facility</TableHead>
                <TableHead className="font-semibold">Quantity</TableHead>
                <TableHead className="font-semibold">Released Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                </TableRow>
              ) : outgoing.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No released batches found.</TableCell>
                </TableRow>
              ) : (
                outgoing.map((record) => (
                  <TableRow key={record.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium">{record.batchCode}</TableCell>
                    <TableCell>{record.facilityName}</TableCell>
                    <TableCell>{record.quantityKg.toLocaleString()} kg</TableCell>
                    <TableCell>{record.releasedAt ? new Date(record.releasedAt).toLocaleDateString() : 'N/A'}</TableCell>
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
