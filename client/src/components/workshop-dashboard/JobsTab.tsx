import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Wrench, Plus, Search, Edit, Trash2, Play, CheckCircle, Clock, Car, User, DollarSign, AlertCircle, FileText, Eye } from "lucide-react";
import { DashboardEmptyState } from "./DashboardEmptyState";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useInvoiceDownload } from "@/hooks/use-invoice-download";
import type { WorkshopJob, WorkshopCustomer, WorkshopStaff, WorkBay } from "@shared/schema";
import { format } from "date-fns";
import { StatusBadge } from "@/components/StatusBadge";

interface JobsTabProps {
  workshopId: string;
}

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

export default function JobsTab({ workshopId }: JobsTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<WorkshopJob | null>(null);
  const [deletingJob, setDeletingJob] = useState<WorkshopJob | null>(null);
  const [selectedJob, setSelectedJob] = useState<WorkshopJob | null>(null);
  const { toast } = useToast();
  const downloadInvoice = useInvoiceDownload();

  // Fetch data
  const { data: jobs, isLoading: jobsLoading } = useQuery<WorkshopJob[]>({
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

  // Create job mutation
  const createJobMutation = useMutation({
    mutationFn: async (data: JobFormData) => {
      const payload = {
        ...data,
        workshopId,
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
      setIsAddDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create job", description: error.message, variant: "destructive" });
    },
  });

  // Update job mutation
  const updateJobMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<JobFormData> }) => {
      return apiRequest(`/api/workshop-dashboard/jobs/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workshop-dashboard/jobs"] });
      toast({ title: "Job updated successfully" });
      setEditingJob(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update job", description: error.message, variant: "destructive" });
    },
  });

  // Delete job mutation
  const deleteJobMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/workshop-dashboard/jobs/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workshop-dashboard/jobs"] });
      toast({ title: "Job deleted successfully" });
      setDeletingJob(null);
      setSelectedJob(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete job", description: error.message, variant: "destructive" });
    },
  });

  // Start job mutation
  const startJobMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/workshop-dashboard/jobs/${id}/start`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workshop-dashboard/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/workshop-dashboard/bays"] });
      toast({ title: "Job started successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to start job", description: error.message, variant: "destructive" });
    },
  });

  // Complete job mutation
  const completeJobMutation = useMutation({
    mutationFn: async ({ id, actualCost }: { id: string; actualCost: string }) => {
      return apiRequest(`/api/workshop-dashboard/jobs/${id}/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ actualCost }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workshop-dashboard/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/workshop-dashboard/bays"] });
      toast({ title: "Job completed successfully" });
      setSelectedJob(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to complete job", description: error.message, variant: "destructive" });
    },
  });

  // Assign mechanic mutation
  const assignMechanicMutation = useMutation({
    mutationFn: async ({ jobId, mechanicId }: { jobId: string; mechanicId: string | null }) => {
      return apiRequest(`/api/workshop-dashboard/jobs/${jobId}/assign`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mechanicId }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workshop-dashboard/jobs"] });
      toast({ title: "Mechanic assigned successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to assign mechanic", description: error.message, variant: "destructive" });
    },
  });

  // Filter jobs by search query
  const filteredJobs = jobs?.filter(
    (job) =>
      job.serviceType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.description && job.description.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || [];

  // Group jobs by status
  const pendingJobs = filteredJobs.filter(j => j.status === "pending");
  const inProgressJobs = filteredJobs.filter(j => j.status === "in_progress");
  const completedJobs = filteredJobs.filter(j => j.status === "completed");

  const getCustomerName = (customerId: string | null) => {
    if (!customerId) return "No Customer";
    return customers?.find(c => c.id === customerId)?.name || "Unknown";
  };

  const getStaffName = (staffId?: string | null) => {
    if (!staffId) return "Unassigned";
    return staff?.find(s => s.id === staffId)?.name || "Unknown";
  };

  const getBayName = (bayId?: string | null) => {
    if (!bayId) return "No Bay";
    return bays?.find(b => b.id === bayId)?.bayName || "Unknown";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-col items-center text-center gap-4 space-y-0">
          <div className="w-full flex flex-col items-center gap-3">
            <Wrench className="h-8 w-8" />
            <div className="text-center">
              <CardTitle className="text-foreground">Job & Service Tracking</CardTitle>
              <CardDescription className="mt-2">
                Create jobs, track service progress, and manage work orders
              </CardDescription>
            </div>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} className="w-full sm:w-auto flex-shrink-0" data-testid="button-add-job">
            <Plus className="h-4 w-4 mr-2" />
            Create Job
          </Button>
        </CardHeader>
      </Card>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by service type or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-jobs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Jobs by Status */}
      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending" data-testid="tab-pending-jobs">
                Pending ({pendingJobs.length})
              </TabsTrigger>
              <TabsTrigger value="in_progress" data-testid="tab-inprogress-jobs">
                In Progress ({inProgressJobs.length})
              </TabsTrigger>
              <TabsTrigger value="completed" data-testid="tab-completed-jobs">
                Completed ({completedJobs.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="pending" className="mt-6">
              <JobList
                jobs={pendingJobs}
                isLoading={jobsLoading}
                hasSearchFilter={!!searchQuery}
                totalJobsCount={jobs?.length || 0}
                getCustomerName={getCustomerName}
                getStaffName={getStaffName}
                getBayName={getBayName}
                onSelect={setSelectedJob}
                onEdit={setEditingJob}
                onDelete={setDeletingJob}
                onStart={startJobMutation.mutate}
                selectedJobId={selectedJob?.id}
                downloadInvoice={downloadInvoice}
              />
            </TabsContent>
            <TabsContent value="in_progress" className="mt-6">
              <JobList
                jobs={inProgressJobs}
                isLoading={jobsLoading}
                hasSearchFilter={!!searchQuery}
                totalJobsCount={jobs?.length || 0}
                getCustomerName={getCustomerName}
                getStaffName={getStaffName}
                getBayName={getBayName}
                onSelect={setSelectedJob}
                onEdit={setEditingJob}
                onDelete={setDeletingJob}
                selectedJobId={selectedJob?.id}
                downloadInvoice={downloadInvoice}
              />
            </TabsContent>
            <TabsContent value="completed" className="mt-6">
              <JobList
                jobs={completedJobs}
                isLoading={jobsLoading}
                hasSearchFilter={!!searchQuery}
                totalJobsCount={jobs?.length || 0}
                getCustomerName={getCustomerName}
                getStaffName={getStaffName}
                getBayName={getBayName}
                onSelect={setSelectedJob}
                selectedJobId={selectedJob?.id}
                downloadInvoice={downloadInvoice}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Job Details */}
      {selectedJob && (
        <JobDetails
          job={selectedJob}
          customerName={getCustomerName(selectedJob.customerId)}
          staffName={getStaffName(selectedJob.mechanicId)}
          bayName={getBayName(selectedJob.bayId)}
          staff={staff || []}
          onComplete={(actualCost) => completeJobMutation.mutate({ id: selectedJob.id, actualCost })}
          onAssignMechanic={(mechanicId) => assignMechanicMutation.mutate({ jobId: selectedJob.id, mechanicId })}
          isCompleting={completeJobMutation.isPending}
          isAssigning={assignMechanicMutation.isPending}
        />
      )}

      {/* Add Job Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <JobForm
            customers={customers || []}
            staff={staff || []}
            bays={bays || []}
            onSubmit={(data) => createJobMutation.mutate(data)}
            isSubmitting={createJobMutation.isPending}
            onCancel={() => setIsAddDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Job Dialog */}
      {editingJob && (
        <Dialog open={true} onOpenChange={() => setEditingJob(null)}>
          <DialogContent className="max-w-2xl">
            <JobForm
              job={editingJob}
              customers={customers || []}
              staff={staff || []}
              bays={bays || []}
              onSubmit={(data) => updateJobMutation.mutate({ id: editingJob.id, data })}
              isSubmitting={updateJobMutation.isPending}
              onCancel={() => setEditingJob(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingJob && (
        <AlertDialog open={true} onOpenChange={() => setDeletingJob(null)}>
          <AlertDialogContent data-testid="dialog-delete-job-confirmation">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Job</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this job? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteJobMutation.mutate(deletingJob.id)}
                className="bg-destructive text-destructive-foreground hover-elevate"
                data-testid="button-confirm-delete"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

// Job List Component
interface JobListProps {
  jobs: WorkshopJob[];
  isLoading: boolean;
  hasSearchFilter: boolean;
  totalJobsCount: number;
  getCustomerName: (id: string | null) => string;
  getStaffName: (id?: string | null) => string;
  getBayName: (id?: string | null) => string;
  onSelect: (job: WorkshopJob) => void;
  onEdit?: (job: WorkshopJob) => void;
  onDelete?: (job: WorkshopJob) => void;
  onStart?: (id: string) => void;
  selectedJobId?: string;
  downloadInvoice: ReturnType<typeof useInvoiceDownload>;
}

function JobList({ jobs, isLoading, hasSearchFilter, totalJobsCount, getCustomerName, getStaffName, getBayName, onSelect, onEdit, onDelete, onStart, selectedJobId, downloadInvoice }: JobListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (jobs.length === 0) {
    const title = hasSearchFilter || totalJobsCount > 0 
      ? "No jobs found" 
      : "No jobs yet";
    const description = hasSearchFilter || totalJobsCount > 0
      ? "Try adjusting your search criteria or filter" 
      : "Create your first job to get started";
    
    return (
      <DashboardEmptyState
        icon={Wrench}
        title={title}
        description={description}
        testIdPrefix="jobs"
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Service Type</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Mechanic</TableHead>
            <TableHead>Bay</TableHead>
            <TableHead>Est. Cost</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => (
            <TableRow
              key={job.id}
              data-testid={`job-row-${job.id}`}
              className={selectedJobId === job.id ? "bg-muted" : "cursor-pointer hover-elevate"}
              onClick={() => onSelect(job)}
            >
              <TableCell className="font-medium">{job.serviceType}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Car className="h-3 w-3 text-muted-foreground" />
                  {getCustomerName(job.customerId)}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <User className="h-3 w-3 text-muted-foreground" />
                  {getStaffName(job.mechanicId)}
                </div>
              </TableCell>
              <TableCell>{getBayName(job.bayId)}</TableCell>
              <TableCell className="font-mono">
                {job.estimatedCost ? `RM ${Number(job.estimatedCost).toFixed(2)}` : "—"}
              </TableCell>
              <TableCell>
                <StatusBadge status={job.status} />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Link href={`/jobs/${job.id}`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => e.stopPropagation()}
                      data-testid={`button-view-${job.id}`}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </Link>
                  {job.status === "pending" && onStart && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStart(job.id);
                      }}
                      data-testid={`button-start-${job.id}`}
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Start
                    </Button>
                  )}
                  {onEdit && job.status === "pending" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(job);
                      }}
                      data-testid={`button-edit-${job.id}`}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  )}
                  {onDelete && job.status === "pending" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(job);
                      }}
                      data-testid={`button-delete-${job.id}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                  {job.status === "completed" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadInvoice.mutate({
                          endpoint: `/api/invoices/job/${job.id}`,
                          filename: `job-invoice-${job.jobId || job.id}.pdf`,
                        });
                      }}
                      disabled={downloadInvoice.isPending}
                      data-testid={`button-invoice-${job.id}`}
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      {downloadInvoice.isPending ? "Generating..." : "Invoice"}
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// Job Details Component
interface JobDetailsProps {
  job: WorkshopJob;
  customerName: string;
  staffName: string;
  bayName: string;
  staff: WorkshopStaff[];
  onComplete?: (actualCost: string) => void;
  onAssignMechanic?: (mechanicId: string | null) => void;
  isCompleting?: boolean;
  isAssigning?: boolean;
}

function JobDetails({ job, customerName, staffName, bayName, staff, onComplete, onAssignMechanic, isCompleting, isAssigning }: JobDetailsProps) {
  const [actualCost, setActualCost] = useState(job.actualCost || job.estimatedCost || "");
  // Convert null mechanicId to "unassigned" sentinel for Select component
  const [selectedMechanicId, setSelectedMechanicId] = useState<string>(job.mechanicId || "unassigned");
  
  // Sync selectedMechanicId when job changes
  useEffect(() => {
    setSelectedMechanicId(job.mechanicId || "unassigned");
  }, [job.id, job.mechanicId]);
  
  // Helper to check if mechanic selection has changed
  const hasSelectionChanged = () => {
    const currentMechanicId = job.mechanicId || "unassigned";
    return selectedMechanicId !== currentMechanicId;
  };

  const getDuration = () => {
    if (!job.startTime || !job.endTime) return null;
    const start = new Date(job.startTime);
    const end = new Date(job.endTime);
    const minutes = Math.floor((end.getTime() - start.getTime()) / 1000 / 60);
    return `${minutes} minutes`;
  };

  const getElapsedTime = () => {
    if (!job.startTime || job.endTime) return null;
    const start = new Date(job.startTime);
    const now = new Date();
    const minutes = Math.floor((now.getTime() - start.getTime()) / 1000 / 60);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{job.serviceType}</CardTitle>
            <CardDescription className="mt-1">
              {customerName} • Created {job.createdAt && format(new Date(job.createdAt), "MMM dd, yyyy")}
            </CardDescription>
          </div>
          <StatusBadge status={job.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Description */}
        {job.description && (
          <div>
            <div className="text-sm font-semibold text-muted-foreground mb-2">Description</div>
            <p className="text-sm">{job.description}</p>
          </div>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Mechanic</div>
            <div className="font-semibold">{staffName}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Bay</div>
            <div className="font-semibold">{bayName}</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Estimated Cost</div>
            <div className="font-mono font-semibold">
              {job.estimatedCost ? `RM ${Number(job.estimatedCost).toFixed(2)}` : "—"}
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">Actual Cost</div>
            <div className="font-mono font-semibold">
              {job.actualCost ? `RM ${Number(job.actualCost).toFixed(2)}` : "—"}
            </div>
          </div>
        </div>

        {/* Assign Mechanic */}
        {job.status !== "completed" && onAssignMechanic && (
          <div className="border-t pt-6">
            <div className="text-sm font-semibold text-muted-foreground mb-4">Assign Mechanic</div>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm text-muted-foreground">Select Mechanic</label>
                <Select
                  value={selectedMechanicId}
                  onValueChange={setSelectedMechanicId}
                  disabled={isAssigning}
                >
                  <SelectTrigger data-testid="select-mechanic">
                    <SelectValue placeholder="Select mechanic" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {staff
                      .filter(s => s.role === 'mechanic')
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => {
                  if (!onAssignMechanic) return;
                  // Convert "unassigned" sentinel back to null for backend
                  const mechanicId = selectedMechanicId === "unassigned" ? null : selectedMechanicId;
                  onAssignMechanic(mechanicId);
                }}
                disabled={isAssigning || !hasSelectionChanged()}
                data-testid="button-assign-mechanic"
              >
                <User className="h-4 w-4 mr-2" />
                {isAssigning ? "Assigning..." : "Assign"}
              </Button>
            </div>
          </div>
        )}

        {/* Time Tracking */}
        {(job.startTime || job.endTime || job.duration) && (
          <div>
            <div className="text-sm font-semibold text-muted-foreground mb-2">Time Tracking</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {job.startTime && (
                <div>
                  <div className="text-sm text-muted-foreground">Started</div>
                  <div className="font-semibold">{format(new Date(job.startTime), "MMM dd, h:mm a")}</div>
                </div>
              )}
              {job.endTime && (
                <div>
                  <div className="text-sm text-muted-foreground">Completed</div>
                  <div className="font-semibold">{format(new Date(job.endTime), "MMM dd, h:mm a")}</div>
                </div>
              )}
              {job.status === "in_progress" && getElapsedTime() && (
                <div>
                  <div className="text-sm text-muted-foreground">Elapsed Time</div>
                  <div className="font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary animate-pulse" />
                    {getElapsedTime()}
                  </div>
                </div>
              )}
              {getDuration() && (
                <div>
                  <div className="text-sm text-muted-foreground">Total Duration</div>
                  <div className="font-semibold">{getDuration()}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Complete Job */}
        {job.status === "in_progress" && onComplete && (
          <div className="border-t pt-6">
            <div className="text-sm font-semibold text-muted-foreground mb-4">Complete Job</div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm text-muted-foreground">Actual Cost (RM)</label>
                <Input
                  type="number"
                  step="0.01"
                  value={actualCost}
                  onChange={(e) => setActualCost(e.target.value)}
                  placeholder="Enter final cost"
                  data-testid="input-actual-cost"
                />
              </div>
              <Button
                onClick={() => onComplete(actualCost)}
                disabled={isCompleting || !actualCost}
                className="self-end"
                data-testid="button-complete-job"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {isCompleting ? "Completing..." : "Complete Job"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Job Form Component
interface JobFormProps {
  job?: WorkshopJob;
  customers: WorkshopCustomer[];
  staff: WorkshopStaff[];
  bays: WorkBay[];
  onSubmit: (data: JobFormData) => void;
  isSubmitting: boolean;
  onCancel: () => void;
}

function JobForm({ job, customers, staff, bays, onSubmit, isSubmitting, onCancel }: JobFormProps) {
  const form = useForm<JobFormData>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: {
      customerId: job?.customerId || "",
      serviceType: job?.serviceType || "",
      description: job?.description || "",
      estimatedCost: job?.estimatedCost || "",
      mechanicId: job?.mechanicId || "",
      bayId: job?.bayId || "",
    },
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>{job ? "Edit Job" : "Create New Job"}</DialogTitle>
        <DialogDescription>
          {job ? "Update job details" : "Create a new service job"}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="customerId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="text-center text-sm" data-testid="select-customer">
                      <SelectValue placeholder="Select customer..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="max-h-[200px]">
                    {customers.map(c => (
                      <SelectItem key={c.id} value={c.id} className="text-center text-sm">
                        {c.name} - {c.plateNo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="serviceType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Service Type</FormLabel>
                <FormControl>
                  <Input placeholder="Oil Change, Brake Repair, etc." {...field} data-testid="input-service-type" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description (optional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="Detailed description of the service..." {...field} data-testid="input-description" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="estimatedCost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estimated Cost (RM)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} data-testid="input-estimated-cost" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="mechanicId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign Mechanic (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger className="text-center text-sm" data-testid="select-mechanic">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[200px]">
                      {staff.filter(s => s.isActive).map(s => (
                        <SelectItem key={s.id} value={s.id} className="text-center text-sm">
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bayId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign Bay (Optional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger className="text-center text-sm" data-testid="select-bay">
                        <SelectValue placeholder="No bay" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[200px]">
                      {bays.filter(b => b.status === "available").map(b => (
                        <SelectItem key={b.id} value={b.id} className="text-center text-sm">
                          {b.bayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel-form">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} data-testid="button-submit-job">
              {isSubmitting ? "Saving..." : job ? "Update Job" : "Create Job"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
