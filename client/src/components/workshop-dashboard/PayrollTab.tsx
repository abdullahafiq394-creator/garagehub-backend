import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Users, DollarSign, FileText, Plus, Calendar, Download } from "lucide-react";
import { format } from "date-fns";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useInvoiceDownload } from "@/hooks/use-invoice-download";

interface PayrollTabProps {
  workshopId: string;
}

interface Staff {
  id: string;
  name: string;
  role: string;
  basicSalary: string;
}

interface Payroll {
  id: string;
  staffId: string;
  staffName: string;
  baseSalary: string;
  commission: string;
  totalPaid: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  payDate: string;
  remarks: string | null;
}

const createPayrollSchema = z.object({
  staffId: z.string().min(1, "Staff member is required"),
  baseSalary: z.string().min(1, "Base salary is required"),
  commission: z.string().min(1, "Commission is required (use 0 if none)"),
  payPeriodStart: z.string().min(1, "Pay period start is required"),
  payPeriodEnd: z.string().min(1, "Pay period end is required"),
  payDate: z.string().min(1, "Pay date is required"),
  remarks: z.string().optional(),
});

type CreatePayrollForm = z.infer<typeof createPayrollSchema>;

export default function PayrollTab({ workshopId }: PayrollTabProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const { toast } = useToast();
  const downloadInvoice = useInvoiceDownload();

  // Fetch staff
  const { data: staff = [], isLoading: staffLoading } = useQuery<Staff[]>({
    queryKey: ['/api/workshop-dashboard/staff'],
  });

  // Fetch all payroll records
  const { data: payrollRecords = [], isLoading: payrollLoading } = useQuery<Payroll[]>({
    queryKey: ['/api/payroll'],
  });

  // Fetch staff-specific payroll (when selected)
  const { data: staffPayroll = [] } = useQuery<Payroll[]>({
    queryKey: ['/api/payroll/staff', selectedStaffId],
    enabled: !!selectedStaffId,
  });

  // Create payroll mutation
  const form = useForm<CreatePayrollForm>({
    resolver: zodResolver(createPayrollSchema),
    defaultValues: {
      staffId: "",
      baseSalary: "",
      commission: "0",
      payPeriodStart: "",
      payPeriodEnd: "",
      payDate: format(new Date(), 'yyyy-MM-dd'),
      remarks: "",
    },
  });

  const createPayrollMutation = useMutation({
    mutationFn: async (data: CreatePayrollForm) => {
      const totalPaid = (parseFloat(data.baseSalary) + parseFloat(data.commission)).toFixed(2);
      return apiRequest('/api/payroll', {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          workshopId,
          totalPaid,
          payPeriodStart: new Date(data.payPeriodStart).toISOString(),
          payPeriodEnd: new Date(data.payPeriodEnd).toISOString(),
          payDate: new Date(data.payDate).toISOString(),
        }),
      });
    },
    onSuccess: () => {
      // Invalidate both global payroll list and staff-specific cache
      queryClient.invalidateQueries({ queryKey: ['/api/payroll'] });
      if (selectedStaffId) {
        queryClient.invalidateQueries({ queryKey: ['/api/payroll/staff', selectedStaffId] });
      }
      toast({
        title: "Success",
        description: "Payroll entry created successfully",
      });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create payroll entry",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: CreatePayrollForm) => {
    createPayrollMutation.mutate(data);
  };

  // Auto-fill base salary when staff is selected
  const handleStaffChange = (staffId: string) => {
    const selectedStaff = staff.find(s => s.id === staffId);
    if (selectedStaff) {
      form.setValue('baseSalary', selectedStaff.basicSalary || '0');
    }
  };

  const isLoading = staffLoading || payrollLoading;
  const displayedPayroll = selectedStaffId ? staffPayroll : payrollRecords;

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex flex-col items-center text-center gap-4">
        <div className="w-full">
          <h2 className="text-2xl font-bold tracking-tight text-foreground" data-testid="heading-payroll">Payroll Management</h2>
          <p className="text-muted-foreground mt-2">
            Manage staff salaries, commissions, and payslips
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto" data-testid="button-create-payroll">
              <Plus className="h-4 w-4 mr-2" />
              Create Payroll
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl" data-testid="dialog-create-payroll">
            <DialogHeader>
              <DialogTitle>Create Payroll Entry</DialogTitle>
              <DialogDescription>
                Generate a new payroll record for a staff member
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="staffId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Staff Member</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleStaffChange(value);
                        }} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-staff">
                            <SelectValue placeholder="Select staff member" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {staff.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name} ({s.role}) - RM {s.basicSalary}/month
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="baseSalary"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base Salary (RM)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="0.00" 
                            {...field} 
                            data-testid="input-base-salary"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="commission"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Commission (RM)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="0.00" 
                            {...field} 
                            data-testid="input-commission"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="payPeriodStart"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pay Period Start</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            data-testid="input-pay-period-start"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="payPeriodEnd"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pay Period End</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            data-testid="input-pay-period-end"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="payDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          data-testid="input-pay-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="remarks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Remarks (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Additional notes about this payroll entry..." 
                          {...field} 
                          data-testid="input-remarks"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
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
                    disabled={createPayrollMutation.isPending}
                    data-testid="button-submit-payroll"
                  >
                    {createPayrollMutation.isPending ? "Creating..." : "Create Payroll"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Staff Filter */}
      <Card className="card-glow" data-testid="card-staff-filter">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 glow-text">
            <Users className="h-5 w-5" />
            Filter by Staff
          </CardTitle>
          <CardDescription>View payroll records for a specific staff member</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Select value={selectedStaffId || "all"} onValueChange={(value) => setSelectedStaffId(value === "all" ? null : value)}>
              <SelectTrigger data-testid="select-filter-staff">
                <SelectValue placeholder="All staff members" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All staff members</SelectItem>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} ({s.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedStaffId && (
              <Button 
                variant="outline" 
                onClick={() => setSelectedStaffId(null)}
                data-testid="button-clear-filter"
              >
                Clear Filter
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payroll Records */}
      <Card className="card-glow" data-testid="card-payroll-records">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 glow-text">
            <FileText className="h-5 w-5" />
            Payroll Records
          </CardTitle>
          <CardDescription>
            {selectedStaffId 
              ? `Showing records for ${staff.find(s => s.id === selectedStaffId)?.name}`
              : "All payroll records"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : displayedPayroll.length > 0 ? (
            <div className="space-y-3">
              {displayedPayroll.map((record) => (
                <div
                  key={record.id}
                  className="p-4 rounded-lg border hover-elevate"
                  data-testid={`payroll-record-${record.id}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <p className="font-medium">{record.staffName || 'Staff Member'}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(record.payPeriodStart), 'MMM dd, yyyy')} - {format(new Date(record.payPeriodEnd), 'MMM dd, yyyy')}
                      </p>
                      {record.remarks && (
                        <p className="text-sm text-muted-foreground italic">{record.remarks}</p>
                      )}
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-2xl font-bold text-green-600" data-testid={`total-paid-${record.id}`}>
                        RM {parseFloat(record.totalPaid).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Salary: RM {parseFloat(record.baseSalary).toFixed(2)} + Commission: RM {parseFloat(record.commission).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Paid: {format(new Date(record.payDate), 'MMM dd, yyyy')}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => {
                          downloadInvoice.mutate({
                            endpoint: `/api/invoices/payroll/${record.id}`,
                            filename: `payroll-slip-${(record.staffName ?? record.staffId ?? 'staff').replace(/\s+/g, '-')}-${record.id}.pdf`,
                          });
                        }}
                        disabled={downloadInvoice.isPending}
                        data-testid={`button-invoice-${record.id}`}
                      >
                        <Download className="h-3 w-3 mr-1" />
                        {downloadInvoice.isPending ? "Generating..." : "Payslip"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {selectedStaffId 
                ? "No payroll records found for this staff member"
                : "No payroll records found"}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
