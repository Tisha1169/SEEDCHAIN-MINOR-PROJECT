import { useAuth } from "@/hooks/use-auth";
import { useListHarvests, useListBatches, useCreateHarvest } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { CreateHarvestBodyQualityGrade } from "@workspace/api-client-react/src/generated/api.schemas";

const createHarvestSchema = z.object({
  batchId: z.coerce.number().min(1, "Please select a batch"),
  quantityKg: z.coerce.number().min(1, "Quantity must be greater than 0"),
  qualityGrade: z.enum(["A", "B", "C"] as const),
  harvestDate: z.string().min(1, "Harvest date is required"),
  notes: z.string().optional(),
});

export default function FarmerHarvests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const { data: harvests, isLoading } = useListHarvests(
    { farmerId: user?.id },
    { query: { enabled: !!user?.id, queryKey: ['harvests', user?.id] } }
  );

  const { data: activeBatches } = useListBatches(
    { farmerId: user?.id, status: 'growing' }, // Or planted
    { query: { enabled: !!user?.id, queryKey: ['activeBatches', user?.id] } }
  );

  const createHarvest = useCreateHarvest();

  const form = useForm<z.infer<typeof createHarvestSchema>>({
    resolver: zodResolver(createHarvestSchema),
    defaultValues: {
      batchId: 0,
      quantityKg: 0,
      qualityGrade: "A",
      harvestDate: new Date().toISOString().split('T')[0],
      notes: "",
    }
  });

  const onSubmit = (data: z.infer<typeof createHarvestSchema>) => {
    if (!user?.id) return;
    
    createHarvest.mutate({
      data: {
        ...data,
        farmerId: user.id
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['harvests', user.id] });
        setIsDialogOpen(false);
        form.reset();
        toast({ title: "Success", description: "Harvest recorded successfully" });
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to record harvest", variant: "destructive" });
      }
    });
  };

  const getQualityColor = (grade: string) => {
    const colors: Record<string, string> = {
      A: "bg-green-100 text-green-700",
      B: "bg-blue-100 text-blue-700",
      C: "bg-yellow-100 text-yellow-700",
    };
    return colors[grade] || "bg-gray-100 text-gray-700";
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Harvests</h1>
          <p className="text-muted-foreground">Record and review your harvest yields.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl bg-primary hover:bg-primary/90 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Record Harvest
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-3xl">
            <DialogHeader>
              <DialogTitle>Record New Harvest</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="batchId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source Batch</FormLabel>
                      <Controller
                        control={form.control}
                        name="batchId"
                        render={({ field: { onChange, value } }) => (
                          <Select onValueChange={onChange} value={value ? value.toString() : ""}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select batch" />
                            </SelectTrigger>
                            <SelectContent>
                              {activeBatches?.map(b => (
                                <SelectItem key={b.id} value={b.id.toString()}>
                                  {b.batchCode} - {b.variety}
                                </SelectItem>
                              ))}
                              {(!activeBatches || activeBatches.length === 0) && (
                                <div className="p-2 text-sm text-muted-foreground">No active batches</div>
                              )}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="harvestDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Harvest Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="quantityKg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Yield (Kg)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="qualityGrade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quality Grade</FormLabel>
                        <Controller
                          control={form.control}
                          name="qualityGrade"
                          render={({ field: { onChange, value } }) => (
                            <Select onValueChange={onChange} value={value}>
                              <SelectTrigger>
                                <SelectValue placeholder="Grade" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="A">Grade A</SelectItem>
                                <SelectItem value="B">Grade B</SelectItem>
                                <SelectItem value="C">Grade C</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Any observations..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full rounded-xl bg-primary" disabled={createHarvest.isPending}>
                  {createHarvest.isPending ? "Saving..." : "Save Harvest"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-3xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="font-semibold">Harvest Date</TableHead>
                <TableHead className="font-semibold">Batch Code</TableHead>
                <TableHead className="font-semibold">Yield</TableHead>
                <TableHead className="font-semibold">Quality</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading harvests...</TableCell>
                </TableRow>
              ) : harvests?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No harvests recorded yet.</TableCell>
                </TableRow>
              ) : (
                harvests?.map((harvest) => (
                  <TableRow key={harvest.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>{new Date(harvest.harvestDate).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{harvest.batchCode}</TableCell>
                    <TableCell>{harvest.quantityKg.toLocaleString()} kg</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`${getQualityColor(harvest.qualityGrade)} border-none`}>
                        Grade {harvest.qualityGrade}
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
