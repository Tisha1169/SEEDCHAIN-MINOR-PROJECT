import { useListStorageRecords } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function AdminStorage() {
  const { data: records, isLoading } = useListStorageRecords({}, {
    query: { queryKey: ['storageRecords', 'all'] }
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Global Storage Monitoring</h1>
          <p className="text-muted-foreground">View all storage records and facilities.</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="font-semibold">Batch Code</TableHead>
                <TableHead className="font-semibold">Facility</TableHead>
                <TableHead className="font-semibold">Operator</TableHead>
                <TableHead className="font-semibold">Quantity</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                </TableRow>
              ) : records?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No records found.</TableCell>
                </TableRow>
              ) : (
                records?.map((record) => (
                  <TableRow key={record.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium">{record.batchCode}</TableCell>
                    <TableCell>{record.facilityName}</TableCell>
                    <TableCell>{record.operatorName}</TableCell>
                    <TableCell>{record.quantityKg.toLocaleString()} kg</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize border-none bg-blue-100 text-blue-700">
                        {record.status}
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
