import { useAuth } from "@/hooks/use-auth";
import { useListStorageRecords } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function StorageInventory() {
  const { user } = useAuth();
  
  const { data: records, isLoading } = useListStorageRecords(
    { operatorId: user?.id },
    { query: { enabled: !!user?.id, queryKey: ['storageRecords', user?.id] } }
  );

  const inventory = records?.filter(r => r.status === 'stored') || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Current Inventory</h1>
          <p className="text-muted-foreground">Manage batches currently in your facility.</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="font-semibold">Batch Code</TableHead>
                <TableHead className="font-semibold">Facility</TableHead>
                <TableHead className="font-semibold">Slot/Location</TableHead>
                <TableHead className="font-semibold">Quantity</TableHead>
                <TableHead className="font-semibold">Temp</TableHead>
                <TableHead className="font-semibold">Received</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                </TableRow>
              ) : inventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No inventory found.</TableCell>
                </TableRow>
              ) : (
                inventory.map((record) => (
                  <TableRow key={record.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium">{record.batchCode}</TableCell>
                    <TableCell>{record.facilityName}</TableCell>
                    <TableCell>{record.slotId || 'N/A'}</TableCell>
                    <TableCell>{record.quantityKg.toLocaleString()} kg</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {record.temperatureCelsius}°C
                      </Badge>
                    </TableCell>
                    <TableCell>{record.receivedAt ? new Date(record.receivedAt).toLocaleDateString() : 'N/A'}</TableCell>
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
