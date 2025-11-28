import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Users, Plus, Search, Edit, Trash2, Calendar, Phone, Car, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { WorkshopCustomer, WorkshopJob } from "@shared/schema";
import { format, isPast } from "date-fns";
import { History } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { DashboardEmptyState } from "./DashboardEmptyState";

interface CustomersTabProps {
  workshopId: string;
}

// Form validation schema
const customerFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  phone: z.string().min(1, "Phone is required").max(20),
  plateNo: z.string().min(1, "Plate number is required").max(50),
  vehicleModel: z.string().min(1, "Vehicle model is required").max(255),
  lastService: z.string().optional(),
  nextService: z.string().optional(),
  notes: z.string().optional(),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;

export default function CustomersTab({ workshopId }: CustomersTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<WorkshopCustomer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<WorkshopCustomer | null>(null);
  const [viewingHistory, setViewingHistory] = useState<WorkshopCustomer | null>(null);
  const { toast } = useToast();

  // Fetch customers
  const { data: customers, isLoading } = useQuery<WorkshopCustomer[]>({
    queryKey: ["/api/workshop-dashboard/customers"],
  });

  // Fetch jobs for service history
  const { data: allJobs } = useQuery<WorkshopJob[]>({
    queryKey: ["/api/workshop-dashboard/jobs"],
  });

  // Create customer mutation
  const createCustomerMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const payload = {
        ...data,
        workshopId,
        lastService: data.lastService ? new Date(data.lastService).toISOString() : null,
        nextService: data.nextService ? new Date(data.nextService).toISOString() : null,
      };
      return apiRequest("/api/workshop-dashboard/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workshop-dashboard/customers"] });
      toast({ title: "Customer added successfully" });
      setIsAddDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add customer", description: error.message, variant: "destructive" });
    },
  });

  // Update customer mutation
  const updateCustomerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CustomerFormData }) => {
      const payload = {
        ...data,
        lastService: data.lastService ? new Date(data.lastService).toISOString() : null,
        nextService: data.nextService ? new Date(data.nextService).toISOString() : null,
      };
      return apiRequest(`/api/workshop-dashboard/customers/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workshop-dashboard/customers"] });
      toast({ title: "Customer updated successfully" });
      setEditingCustomer(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update customer", description: error.message, variant: "destructive" });
    },
  });

  // Delete customer mutation
  const deleteCustomerMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/workshop-dashboard/customers/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workshop-dashboard/customers"] });
      toast({ title: "Customer deleted successfully" });
      setDeletingCustomer(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete customer", description: error.message, variant: "destructive" });
    },
  });

  // Filter customers by search query
  const filteredCustomers = customers?.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.plateNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery) ||
      customer.vehicleModel.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Check if service is due
  const isServiceDue = (customer: WorkshopCustomer) => {
    if (!customer.nextService) return false;
    return isPast(new Date(customer.nextService));
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <Card>
        <CardHeader className="flex flex-col items-center text-center gap-4 space-y-0">
          <div className="w-full flex flex-col items-center gap-3">
            <Users className="h-8 w-8" />
            <div className="text-center">
              <CardTitle>Customer Management</CardTitle>
              <CardDescription className="mt-2">
                Manage customer records, track service history, and set reminders
              </CardDescription>
            </div>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto flex-shrink-0" data-testid="button-add-customer">
                <Plus className="h-4 w-4 mr-2" />
                Add Customer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <CustomerForm
                onSubmit={(data) => createCustomerMutation.mutate(data)}
                isSubmitting={createCustomerMutation.isPending}
                onCancel={() => setIsAddDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </CardHeader>
      </Card>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, plate number, phone, or vehicle model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-customers"
            />
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredCustomers.length === 0 ? (
            <DashboardEmptyState
              icon={Users}
              title={searchQuery ? "No customers found" : "No customers yet"}
              description={searchQuery ? "Try adjusting your search terms" : "Add your first customer to get started"}
              testIdPrefix="customers"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Plate No.</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Last Service</TableHead>
                    <TableHead>Next Service</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id} data-testid={`customer-row-${customer.id}`}>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {customer.phone}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">{customer.plateNo}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Car className="h-3 w-3 text-muted-foreground" />
                          {customer.vehicleModel}
                        </div>
                      </TableCell>
                      <TableCell>
                        {customer.lastService ? format(new Date(customer.lastService), "MMM dd, yyyy") : "—"}
                      </TableCell>
                      <TableCell>
                        {customer.nextService ? (
                          <div className="flex items-center gap-2">
                            {format(new Date(customer.nextService), "MMM dd, yyyy")}
                            {isServiceDue(customer) && (
                              <Badge variant="destructive" className="ml-2">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Due
                              </Badge>
                            )}
                          </div>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setViewingHistory(customer)}
                            data-testid={`button-history-${customer.id}`}
                          >
                            <History className="h-3 w-3 mr-1" />
                            History
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingCustomer(customer)}
                            data-testid={`button-edit-${customer.id}`}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeletingCustomer(customer)}
                            data-testid={`button-delete-${customer.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editingCustomer && (
        <Dialog open={true} onOpenChange={() => setEditingCustomer(null)}>
          <DialogContent className="max-w-2xl">
            <CustomerForm
              customer={editingCustomer}
              onSubmit={(data) => updateCustomerMutation.mutate({ id: editingCustomer.id, data })}
              isSubmitting={updateCustomerMutation.isPending}
              onCancel={() => setEditingCustomer(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingCustomer && (
        <AlertDialog open={true} onOpenChange={() => setDeletingCustomer(null)}>
          <AlertDialogContent data-testid="dialog-delete-confirmation">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Customer</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deletingCustomer.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteCustomerMutation.mutate(deletingCustomer.id)}
                className="bg-destructive text-destructive-foreground hover-elevate"
                data-testid="button-confirm-delete"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Service History Dialog */}
      {viewingHistory && (
        <Dialog open={true} onOpenChange={() => setViewingHistory(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Service History - {viewingHistory.name}</DialogTitle>
              <DialogDescription>
                {viewingHistory.vehicleModel} • {viewingHistory.plateNo}
              </DialogDescription>
            </DialogHeader>
            <ServiceHistoryContent customerId={viewingHistory.id} jobs={allJobs} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Service History Component
interface ServiceHistoryContentProps {
  customerId: string;
  jobs?: WorkshopJob[];
}

function ServiceHistoryContent({ customerId, jobs }: ServiceHistoryContentProps) {
  const customerJobs = jobs?.filter(job => job.customerId === customerId) || [];
  const sortedJobs = customerJobs.sort((a, b) => 
    new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );

  if (!jobs) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (sortedJobs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No service history found for this customer.
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-96 overflow-y-auto">
      {sortedJobs.map((job) => (
        <Card key={job.id} data-testid={`history-job-${job.id}`}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">{job.serviceType}</CardTitle>
                <CardDescription className="mt-1">
                  {job.createdAt && format(new Date(job.createdAt), "MMM dd, yyyy 'at' h:mm a")}
                </CardDescription>
              </div>
              <StatusBadge status={job.status} />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {job.description && (
              <p className="text-sm text-muted-foreground">{job.description}</p>
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              {job.estimatedCost && (
                <div>
                  <span className="text-muted-foreground">Estimated Cost:</span>
                  <span className="font-mono font-semibold ml-2">
                    RM {Number(job.estimatedCost).toFixed(2)}
                  </span>
                </div>
              )}
              {job.actualCost && (
                <div>
                  <span className="text-muted-foreground">Actual Cost:</span>
                  <span className="font-mono font-semibold ml-2">
                    RM {Number(job.actualCost).toFixed(2)}
                  </span>
                </div>
              )}
              {job.duration && (
                <div>
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="ml-2">{job.duration} minutes</span>
                </div>
              )}
              {job.mechanicId && (
                <div>
                  <span className="text-muted-foreground">Mechanic ID:</span>
                  <span className="font-mono ml-2">{job.mechanicId.slice(0, 8)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Customer Form Component
interface CustomerFormProps {
  customer?: WorkshopCustomer;
  onSubmit: (data: CustomerFormData) => void;
  isSubmitting: boolean;
  onCancel: () => void;
}

function CustomerForm({ customer, onSubmit, isSubmitting, onCancel }: CustomerFormProps) {
  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: customer?.name || "",
      phone: customer?.phone || "",
      plateNo: customer?.plateNo || "",
      vehicleModel: customer?.vehicleModel || "",
      lastService: customer?.lastService ? format(new Date(customer.lastService), "yyyy-MM-dd") : "",
      nextService: customer?.nextService ? format(new Date(customer.nextService), "yyyy-MM-dd") : "",
      notes: customer?.notes || "",
    },
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>{customer ? "Edit Customer" : "Add New Customer"}</DialogTitle>
        <DialogDescription>
          {customer ? "Update customer information and service details" : "Add a new customer to your workshop database"}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} data-testid="input-customer-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input placeholder="+60123456789" {...field} data-testid="input-customer-phone" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="plateNo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plate Number</FormLabel>
                  <FormControl>
                    <Input placeholder="WXY 1234" {...field} data-testid="input-customer-plate" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="vehicleModel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vehicle Model</FormLabel>
                  <FormControl>
                    <Input placeholder="Toyota Camry 2020" {...field} data-testid="input-customer-vehicle" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastService"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Service Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} data-testid="input-customer-last-service" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="nextService"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Next Service Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} data-testid="input-customer-next-service" />
                  </FormControl>
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
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Any additional notes about the customer or vehicle..."
                    {...field}
                    data-testid="input-customer-notes"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel-form">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} data-testid="button-submit-customer">
              {isSubmitting ? "Saving..." : customer ? "Update Customer" : "Add Customer"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
