import { useAuth } from "@/hooks/use-auth";
import { useListStorageRecords, useUpdateStorageRecord } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { UpdateStorageRecordBodyStatus } from "@workspace/api-client-react/src/generated/api.schemas";

export default function StorageIncoming() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: records, isLoading } = useListStorageRecords(
    { operatorId: user?.id },
    { query: { enabled: !!user?.id, queryKey: ['storageRecords', user?.id] } }
  );

  const incoming = records?.filter(r => r.status === 'incoming') || [];
  const updateRecord = useUpdateStorageRecord();

  const handleReceive = (id: number) => {
    updateRecord.mutate({
      id,
      data: { status: 'stored' as UpdateStorageRecordBodyStatus }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['storageRecords', user?.id] });
        toast({ title: "Success", description: "Batch marked as received and stored." });
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Incoming Shipments</h1>
          <p className="text-muted-foreground">Manage batches scheduled to arrive.</p>
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
                <TableHead className="font-semibold text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                </TableRow>
              ) : incoming.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No incoming shipments.</TableCell>
                </TableRow>
              ) : (
                incoming.map((record) => (
                  <TableRow key={record.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium">{record.batchCode}</TableCell>
                    <TableCell>{record.facilityName}</TableCell>
                    <TableCell>{record.quantityKg.toLocaleString()} kg</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        size="sm" 
                        className="rounded-xl bg-primary hover:bg-primary/90"
                        onClick={() => handleReceive(record.id)}
                        disabled={updateRecord.isPending}
                      >
                        Receive
                      </Button>
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
