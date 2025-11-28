import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { WorkshopJob, WorkshopCustomer, WorkshopStaff, WorkBay } from "@shared/schema";
import { Link } from "wouter";

// Form validation schema
const jobFormSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  serviceType: z.string().min(1, "Service type is required").max(255),
  description: z.string().optional(),
  estimatedCost: z.string().optional(),
  mechanicId: z.string().optional(),
  bayId: z.string().optional(),
});

type JobFormData = z.infer<typeof jobFormSchema>;

export default function Jobs() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: jobs, isLoading } = useQuery<WorkshopJob[]>({
    queryKey: ["/api/workshop-dashboard/jobs"],
  });

  const { data: customers } = useQuery<WorkshopCustomer[]>({
    queryKey: ["/api/workshop-dashboard/customers"],
  });

  const { data: staff } = useQuery<WorkshopStaff[]>({
    queryKey: ["/api/workshop-dashboard/staff"],
  });

  const { data: bays } = useQuery<WorkBay[]>({
    queryKey: ["/api/workshop-dashboard/bays"],
  });

  const { data: workshop } = useQuery<{ id: string }>({
    queryKey: ["/api/workshops/mine"],
  });

  // Form setup
  const form = useForm<JobFormData>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: {
      customerId: "",
      serviceType: "",
      description: "",
      estimatedCost: "",
      mechanicId: "",
      bayId: "",
    },
  });

  // Create job mutation
  const createJobMutation = useMutation({
    mutationFn: async (data: JobFormData) => {
      const payload = {
        ...data,
        workshopId: workshop?.id,
        estimatedCost: data.estimatedCost || null,
        mechanicId: data.mechanicId || null,
        bayId: data.bayId || null,
      };
      return apiRequest("/api/workshop-dashboard/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workshop-dashboard/jobs"] });
      toast({ title: "Job created successfully" });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create job", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: JobFormData) => {
    // Guard: Prevent submission if workshop not found
    if (!workshop?.id) {
      toast({
        title: "Workshop Not Found",
        description: "Unable to create job. Please ensure you have a workshop profile.",
        variant: "destructive",
      });
      return;
    }
    createJobMutation.mutate(data);
  };

  // Disable button if no workshop
  const canCreateJob = !!workshop?.id;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Service Jobs</h1>
          <p className="text-muted-foreground mt-2">
            Manage customer service jobs and repairs
          </p>
        </div>
        <Button 
          onClick={() => setIsCreateDialogOpen(true)} 
          disabled={!canCreateJob}
          data-testid="button-new-job"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Job
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Jobs</CardTitle>
          <CardDescription>Track and manage service jobs</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-4 rounded-md border">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-4 w-48 mb-1" />
                  <Skeleton className="h-3 w-40" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {jobs?.map((job) => (
                <div
                  key={job.id}
                  className="p-4 rounded-md border hover-elevate"
                  data-testid={`job-${job.id}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium font-mono">#{job.id.slice(0, 8)}</p>
                        <StatusBadge status={job.status} />
                      </div>
                      <p className="font-medium">Customer ID: {job.customerId ? job.customerId.slice(0, 8) : 'N/A'}</p>
                      <p className="text-sm text-muted-foreground">
                        {job.vehicleModel} • {job.plateNo}
                      </p>
                    </div>
                    <Link href={`/jobs/${job.id}`}>
                      <Button size="sm" variant="outline" data-testid={`button-view-${job.id}`}>
                        View Details
                      </Button>
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Service</p>
                      <p className="text-sm font-medium">{job.serviceType}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Scheduled</p>
                      <p className="text-sm font-medium">
                        {job.startTime ? new Date(job.startTime).toLocaleDateString() : 'Not scheduled'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {job.status === "completed" ? "Actual Cost" : "Estimated Cost"}
                      </p>
                      <p className="text-sm font-mono font-semibold">
                        {job.status === "completed" && job.actualCost
                          ? `RM ${job.actualCost}`
                          : job.estimatedCost
                          ? `RM ${job.estimatedCost}`
                          : 'TBD'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {(!jobs || jobs.length === 0) && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">
                    {canCreateJob ? "No jobs yet" : "Workshop profile required to create jobs"}
                  </p>
                  <Button 
                    onClick={() => setIsCreateDialogOpen(true)} 
                    disabled={!canCreateJob}
                    data-testid="button-create-first-job"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Job
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Job Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Create New Job</DialogTitle>
            <DialogDescription>
              Create a new service job for a customer
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
              <div className="space-y-4 overflow-y-auto pr-2 flex-1">
              {/* Customer Selection */}
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-customer">
                          <SelectValue placeholder="Select a customer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers?.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name} {customer.phone ? `(${customer.phone})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Service Type */}
              <FormField
                control={form.control}
                name="serviceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Type *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Oil Change, Brake Repair" {...field} data-testid="input-service-type" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the work to be done..." 
                        {...field} 
                        data-testid="textarea-description"
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Estimated Cost */}
              <FormField
                control={form.control}
                name="estimatedCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Cost (RM)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="0.00" 
                        {...field} 
                        data-testid="input-estimated-cost"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Mechanic Selection */}
              <FormField
                control={form.control}
                name="mechanicId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign Mechanic (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-mechanic">
                          <SelectValue placeholder="Select a mechanic" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {staff?.filter(s => s.role?.toLowerCase().includes('mechanic')).map((mechanic) => (
                          <SelectItem key={mechanic.id} value={mechanic.id}>
                            {mechanic.name} - {mechanic.role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Bay Selection */}
              <FormField
                control={form.control}
                name="bayId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign Bay (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-bay">
                          <SelectValue placeholder="Select a bay" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {bays?.map((bay) => (
                          <SelectItem key={bay.id} value={bay.id}>
                            {bay.bayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              </div>

              <DialogFooter className="pt-4 border-t mt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createJobMutation.isPending}
                  data-testid="button-submit-job"
                >
                  {createJobMutation.isPending ? "Creating..." : "Create Job"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
