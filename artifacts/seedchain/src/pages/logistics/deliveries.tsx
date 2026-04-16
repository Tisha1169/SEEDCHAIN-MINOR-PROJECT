import { useAuth } from "@/hooks/use-auth";
import { useListTransportRecords, useUpdateTransportRecord } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { UpdateTransportRecordBodyStatus } from "@workspace/api-client-react/src/generated/api.schemas";

export default function LogisticsDeliveries() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: records, isLoading } = useListTransportRecords(
    { driverId: user?.id },
    { query: { enabled: !!user?.id, queryKey: ['transportRecords', user?.id] } }
  );

  const updateRecord = useUpdateTransportRecord();

  const handleUpdateStatus = (id: number, newStatus: UpdateTransportRecordBodyStatus) => {
    updateRecord.mutate({
      id,
      data: { status: newStatus }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['transportRecords', user?.id] });
        toast({ title: "Success", description: `Delivery marked as ${newStatus.replace('_', ' ')}.` });
      }
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-gray-100 text-gray-700",
      accepted: "bg-blue-100 text-blue-700",
      picked_up: "bg-purple-100 text-purple-700",
      in_transit: "bg-yellow-100 text-yellow-700",
      delivered: "bg-green-100 text-green-700"
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Deliveries</h1>
          <p className="text-muted-foreground">Manage your assigned transport jobs.</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="font-semibold">Batch Code</TableHead>
                <TableHead className="font-semibold">Origin</TableHead>
                <TableHead className="font-semibold">Destination</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                </TableRow>
              ) : records?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No deliveries assigned yet.</TableCell>
                </TableRow>
              ) : (
                records?.map((record) => (
                  <TableRow key={record.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium">{record.batchCode}</TableCell>
                    <TableCell>{record.originLocation}</TableCell>
                    <TableCell>{record.destinationLocation}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`${getStatusColor(record.status)} capitalize border-none`}>
                        {record.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {record.status === 'pending' && (
                        <Button size="sm" variant="outline" className="rounded-xl border-2" onClick={() => handleUpdateStatus(record.id, 'accepted')} disabled={updateRecord.isPending}>Accept</Button>
                      )}
                      {record.status === 'accepted' && (
                        <Button size="sm" variant="outline" className="rounded-xl border-2" onClick={() => handleUpdateStatus(record.id, 'picked_up')} disabled={updateRecord.isPending}>Mark Picked Up</Button>
                      )}
                      {record.status === 'picked_up' && (
                        <Button size="sm" variant="outline" className="rounded-xl border-2" onClick={() => handleUpdateStatus(record.id, 'in_transit')} disabled={updateRecord.isPending}>Start Transit</Button>
                      )}
                      {record.status === 'in_transit' && (
                        <Button size="sm" className="rounded-xl bg-primary" onClick={() => handleUpdateStatus(record.id, 'delivered')} disabled={updateRecord.isPending}>Mark Delivered</Button>
                      )}
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
