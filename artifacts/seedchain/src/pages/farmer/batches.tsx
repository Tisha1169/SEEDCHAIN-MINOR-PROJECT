import { useAuth } from "@/hooks/use-auth";
import { useListBatches, useCreateBatch } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const createBatchSchema = z.object({
  variety: z.string().min(2, "Variety is required"),
  plantingDate: z.string().min(1, "Planting date is required"),
  expectedHarvestDate: z.string().optional(),
  quantityKg: z.coerce.number().min(1, "Quantity must be greater than 0"),
});

export default function FarmerBatches() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const { data: batches, isLoading } = useListBatches(
    { farmerId: user?.id },
    { query: { enabled: !!user?.id, queryKey: ['batches', user?.id] } }
  );

  const createBatch = useCreateBatch();

  const form = useForm<z.infer<typeof createBatchSchema>>({
    resolver: zodResolver(createBatchSchema),
    defaultValues: {
      variety: "",
      plantingDate: new Date().toISOString().split('T')[0],
      quantityKg: 0,
    }
  });

  const onSubmit = (data: z.infer<typeof createBatchSchema>) => {
    if (!user?.id) return;
    
    createBatch.mutate({
      data: {
        ...data,
        farmerId: user.id
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['batches', user.id] });
        setIsDialogOpen(false);
        form.reset();
        toast({ title: "Success", description: "Batch created successfully" });
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to create batch", variant: "destructive" });
      }
    });
  };

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
          <h1 className="text-3xl font-bold text-foreground">Seed Batches</h1>
          <p className="text-muted-foreground">Manage and track your potato seed batches.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl bg-primary hover:bg-primary/90 text-white">
              <Plus className="w-4 h-4 mr-2" />
              New Batch
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-3xl">
            <DialogHeader>
              <DialogTitle>Register New Seed Batch</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="variety"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Potato Variety</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Russet Burbank" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="plantingDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Planting Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="quantityKg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expected Yield (Kg)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full rounded-xl bg-primary" disabled={createBatch.isPending}>
                  {createBatch.isPending ? "Saving..." : "Save Batch"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input className="pl-9 bg-muted/50 border-none rounded-xl" placeholder="Search batches..." />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="font-semibold">Batch Code</TableHead>
                <TableHead className="font-semibold">Variety</TableHead>
                <TableHead className="font-semibold">Planting Date</TableHead>
                <TableHead className="font-semibold">Quantity</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading batches...</TableCell>
                </TableRow>
              ) : batches?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No batches found. Create one to get started.</TableCell>
                </TableRow>
              ) : (
                batches?.map((batch) => (
                  <TableRow key={batch.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium">{batch.batchCode}</TableCell>
                    <TableCell>{batch.variety}</TableCell>
                    <TableCell>{new Date(batch.plantingDate).toLocaleDateString()}</TableCell>
                    <TableCell>{batch.quantityKg.toLocaleString()} kg</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`${getStatusColor(batch.status)} hover:${getStatusColor(batch.status)} capitalize border-none`}>
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
