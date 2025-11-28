import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Plus, Search, Edit, Trash2, Phone, DollarSign, Calendar, Clock, UserCheck, TrendingUp, FileText, Download } from "lucide-react";
import { DashboardEmptyState } from "./DashboardEmptyState";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { WorkshopStaff, StaffAttendance, StaffCommission } from "@shared/schema";
import { format } from "date-fns";

interface StaffTabProps {
  workshopId: string;
}

// Form validation schemas
const staffFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  phone: z.string().min(1, "Phone is required").max(20),
  role: z.string().min(1, "Role is required").max(100),
  basicSalary: z.string().min(1, "Salary is required"),
  isActive: z.boolean().default(true),
});

const attendanceFormSchema = z.object({
  staffId: z.string().min(1, "Staff member is required"),
  date: z.string().min(1, "Date is required"),
  clockIn: z.string().optional(),
  clockOut: z.string().optional(),
  notes: z.string().optional(),
});

const commissionFormSchema = z.object({
  staffId: z.string().min(1, "Staff member is required"),
  jobId: z.string().optional(),
  commissionAmount: z.string().min(1, "Amount is required"),
  date: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

type StaffFormData = z.infer<typeof staffFormSchema>;
type AttendanceFormData = z.infer<typeof attendanceFormSchema>;
type CommissionFormData = z.infer<typeof commissionFormSchema>;

export default function StaffTab({ workshopId }: StaffTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<WorkshopStaff | null>(null);
  const [isAddStaffDialogOpen, setIsAddStaffDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<WorkshopStaff | null>(null);
  const [deletingStaff, setDeletingStaff] = useState<WorkshopStaff | null>(null);
  const [isAddAttendanceDialogOpen, setIsAddAttendanceDialogOpen] = useState(false);
  const [isAddCommissionDialogOpen, setIsAddCommissionDialogOpen] = useState(false);
  const { toast } = useToast();

  // Fetch data
  const { data: staff, isLoading: staffLoading } = useQuery<WorkshopStaff[]>({
    queryKey: ["/api/workshop-dashboard/staff"],
  });

  const { data: attendance } = useQuery<StaffAttendance[]>({
    queryKey: ["/api/workshop-dashboard/attendance"],
  });

  const { data: commissions } = useQuery<StaffCommission[]>({
    queryKey: ["/api/workshop-dashboard/commissions"],
  });

  // Staff mutations
  const createStaffMutation = useMutation({
    mutationFn: async (data: StaffFormData) => {
      const payload = {
        ...data,
        workshopId,
      };
      return apiRequest("POST", "/api/workshop-dashboard/staff", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workshop-dashboard/staff"] });
      toast({ title: "Staff member added successfully" });
      setIsAddStaffDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add staff", description: error.message, variant: "destructive" });
    },
  });

  const updateStaffMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: StaffFormData }) => {
      return apiRequest("PATCH", `/api/workshop-dashboard/staff/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workshop-dashboard/staff"] });
      toast({ title: "Staff member updated successfully" });
      setEditingStaff(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update staff", description: error.message, variant: "destructive" });
    },
  });

  const deleteStaffMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/workshop-dashboard/staff/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workshop-dashboard/staff"] });
      toast({ title: "Staff member deleted successfully" });
      setDeletingStaff(null);
      setSelectedStaff(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete staff", description: error.message, variant: "destructive" });
    },
  });

  // Attendance mutation
  const createAttendanceMutation = useMutation({
    mutationFn: async (data: AttendanceFormData) => {
      const payload = {
        ...data,
        date: new Date(data.date).toISOString(),
      };
      return apiRequest("POST", "/api/workshop-dashboard/attendance", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workshop-dashboard/attendance"] });
      toast({ title: "Attendance recorded successfully" });
      setIsAddAttendanceDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to record attendance", description: error.message, variant: "destructive" });
    },
  });

  // Commission mutation
  const createCommissionMutation = useMutation({
    mutationFn: async (data: CommissionFormData) => {
      const payload = {
        ...data,
        date: new Date(data.date).toISOString(),
      };
      return apiRequest("POST", "/api/workshop-dashboard/commissions", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workshop-dashboard/commissions"] });
      toast({ title: "Commission added successfully" });
      setIsAddCommissionDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add commission", description: error.message, variant: "destructive" });
    },
  });

  // Filter staff by search query
  const filteredStaff = staff?.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.phone && s.phone.includes(searchQuery)) ||
      s.role.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const activeStaff = filteredStaff.filter(s => s.isActive);
  const inactiveStaff = filteredStaff.filter(s => !s.isActive);

  return (
    <div className="space-y-6 mt-16 md:mt-0">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 space-y-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 flex-shrink-0" />
              <CardTitle className="truncate">Staff & Payroll Management</CardTitle>
            </div>
            <CardDescription className="mt-2">
              Manage staff, track attendance, and monitor commissions
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto flex-shrink-0">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setIsAddAttendanceDialogOpen(true)}
              data-testid="button-add-attendance"
            >
              <Clock className="h-4 w-4 mr-2" />
              Record Attendance
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setIsAddCommissionDialogOpen(true)}
              data-testid="button-add-commission"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Add Commission
            </Button>
            <Button className="w-full sm:w-auto" onClick={() => setIsAddStaffDialogOpen(true)} data-testid="button-add-staff">
              <Plus className="h-4 w-4 mr-2" />
              Add Staff
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-staff"
            />
          </div>
        </CardContent>
      </Card>

      {/* Staff List */}
      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="active" data-testid="tab-active-staff">
                Active Staff ({activeStaff.length})
              </TabsTrigger>
              <TabsTrigger value="inactive" data-testid="tab-inactive-staff">
                Inactive Staff ({inactiveStaff.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="active" className="mt-6">
              <StaffList
                staff={activeStaff}
                isLoading={staffLoading}
                hasSearchFilter={!!searchQuery}
                totalStaffCount={staff?.length || 0}
                onSelect={setSelectedStaff}
                onEdit={setEditingStaff}
                onDelete={setDeletingStaff}
                selectedStaffId={selectedStaff?.id}
              />
            </TabsContent>
            <TabsContent value="inactive" className="mt-6">
              <StaffList
                staff={inactiveStaff}
                isLoading={staffLoading}
                hasSearchFilter={!!searchQuery}
                totalStaffCount={staff?.length || 0}
                onSelect={setSelectedStaff}
                onEdit={setEditingStaff}
                onDelete={setDeletingStaff}
                selectedStaffId={selectedStaff?.id}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Staff Details */}
      {selectedStaff && (
        <StaffDetails
          staff={selectedStaff}
          attendance={attendance}
          commissions={commissions}
        />
      )}

      {/* Add Staff Dialog */}
      <Dialog open={isAddStaffDialogOpen} onOpenChange={setIsAddStaffDialogOpen}>
        <DialogContent className="max-w-2xl">
          <StaffForm
            onSubmit={(data) => createStaffMutation.mutate(data)}
            isSubmitting={createStaffMutation.isPending}
            onCancel={() => setIsAddStaffDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Staff Dialog */}
      {editingStaff && (
        <Dialog open={true} onOpenChange={() => setEditingStaff(null)}>
          <DialogContent className="max-w-2xl">
            <StaffForm
              staff={editingStaff}
              onSubmit={(data) => updateStaffMutation.mutate({ id: editingStaff.id, data })}
              isSubmitting={updateStaffMutation.isPending}
              onCancel={() => setEditingStaff(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingStaff && (
        <AlertDialog open={true} onOpenChange={() => setDeletingStaff(null)}>
          <AlertDialogContent data-testid="dialog-delete-staff-confirmation">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Staff Member</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{deletingStaff.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteStaffMutation.mutate(deletingStaff.id)}
                className="bg-destructive text-destructive-foreground hover-elevate"
                data-testid="button-confirm-delete"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Add Attendance Dialog */}
      <Dialog open={isAddAttendanceDialogOpen} onOpenChange={setIsAddAttendanceDialogOpen}>
        <DialogContent>
          <AttendanceForm
            staff={staff || []}
            onSubmit={(data) => createAttendanceMutation.mutate(data)}
            isSubmitting={createAttendanceMutation.isPending}
            onCancel={() => setIsAddAttendanceDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Add Commission Dialog */}
      <Dialog open={isAddCommissionDialogOpen} onOpenChange={setIsAddCommissionDialogOpen}>
        <DialogContent>
          <CommissionForm
            staff={staff || []}
            onSubmit={(data) => createCommissionMutation.mutate(data)}
            isSubmitting={createCommissionMutation.isPending}
            onCancel={() => setIsAddCommissionDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Staff List Component
interface StaffListProps {
  staff: WorkshopStaff[];
  isLoading: boolean;
  hasSearchFilter: boolean;
  totalStaffCount: number;
  onSelect: (staff: WorkshopStaff) => void;
  onEdit: (staff: WorkshopStaff) => void;
  onDelete: (staff: WorkshopStaff) => void;
  selectedStaffId?: string;
}

function StaffList({ staff, isLoading, hasSearchFilter, totalStaffCount, onSelect, onEdit, onDelete, selectedStaffId }: StaffListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (staff.length === 0) {
    const title = hasSearchFilter || totalStaffCount > 0 
      ? "No staff found" 
      : "No staff yet";
    const description = hasSearchFilter || totalStaffCount > 0
      ? "Try adjusting your search criteria" 
      : "Add your first staff member to get started";
    
    return (
      <DashboardEmptyState
        icon={Users}
        title={title}
        description={description}
        testIdPrefix="staff"
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Salary</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {staff.map((s) => (
            <TableRow
              key={s.id}
              data-testid={`staff-row-${s.id}`}
              className={selectedStaffId === s.id ? "bg-muted" : "cursor-pointer hover-elevate"}
              onClick={() => onSelect(s)}
            >
              <TableCell className="font-medium">{s.name}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3 text-muted-foreground" />
                  {s.phone}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{s.role}</Badge>
              </TableCell>
              <TableCell className="font-mono">RM {Number(s.basicSalary).toFixed(2)}</TableCell>
              <TableCell>{s.createdAt ? format(new Date(s.createdAt), "MMM dd, yyyy") : "N/A"}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(s);
                    }}
                    data-testid={`button-edit-${s.id}`}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(s);
                    }}
                    data-testid={`button-delete-${s.id}`}
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
  );
}

// Staff Details Component
interface StaffDetailsProps {
  staff: WorkshopStaff;
  attendance?: StaffAttendance[];
  commissions?: StaffCommission[];
}

function StaffDetails({ staff, attendance, commissions }: StaffDetailsProps) {
  const staffAttendance = attendance?.filter(a => a.staffId === staff.id).sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  ) || [];

  const staffCommissions = commissions?.filter(c => c.staffId === staff.id).sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  ) || [];

  const totalCommissions = staffCommissions.reduce((sum, c) => sum + Number(c.commissionAmount), 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{staff.name}</CardTitle>
            <CardDescription className="mt-1">
              {staff.role} {staff.createdAt && `• Created ${format(new Date(staff.createdAt), "MMM dd, yyyy")}`}
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Monthly Salary</div>
            <div className="text-2xl font-bold font-mono text-foreground">RM {Number(staff.basicSalary).toFixed(2)}</div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="attendance" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="attendance" data-testid="tab-staff-attendance">
              <UserCheck className="h-4 w-4 mr-2" />
              Attendance ({staffAttendance.length})
            </TabsTrigger>
            <TabsTrigger value="commissions" data-testid="tab-staff-commissions">
              <TrendingUp className="h-4 w-4 mr-2" />
              Commissions (RM {totalCommissions.toFixed(2)})
            </TabsTrigger>
            <TabsTrigger value="payslips" data-testid="tab-staff-payslips">
              <FileText className="h-4 w-4 mr-2" />
              Payslips
            </TabsTrigger>
          </TabsList>
          <TabsContent value="attendance" className="mt-6 space-y-4">
            {staffAttendance.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No attendance records found
              </div>
            ) : (
              staffAttendance.map((a) => (
                <Card key={a.id} data-testid={`attendance-${a.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">
                          {format(new Date(a.date), "MMM dd, yyyy")}
                        </CardTitle>
                        {a.notes && (
                          <CardDescription className="mt-1">{a.notes}</CardDescription>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <div className="flex gap-4">
                      {a.clockIn && (
                        <div>
                          <span className="text-muted-foreground">Clock In:</span>
                          <span className="ml-2 font-mono">{format(new Date(a.clockIn), "HH:mm")}</span>
                        </div>
                      )}
                      {a.clockOut && (
                        <div>
                          <span className="text-muted-foreground">Clock Out:</span>
                          <span className="ml-2 font-mono">{format(new Date(a.clockOut), "HH:mm")}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
          <TabsContent value="commissions" className="mt-6 space-y-4">
            {staffCommissions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No commission records found
              </div>
            ) : (
              staffCommissions.map((c) => (
                <Card key={c.id} data-testid={`commission-${c.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">
                          RM {Number(c.commissionAmount).toFixed(2)}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {format(new Date(c.date), "MMM dd, yyyy")}
                          {c.jobId && ` • Job ${c.jobId.slice(0, 8)}`}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  {c.notes && (
                    <CardContent className="text-sm text-muted-foreground">
                      {c.notes}
                    </CardContent>
                  )}
                </Card>
              ))
            )}
          </TabsContent>
          <TabsContent value="payslips" className="mt-6 space-y-4">
            <PayslipsTabContent
              staff={staff}
              attendance={staffAttendance}
              commissions={staffCommissions}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Payslips Tab Component
interface PayslipsTabContentProps {
  staff: WorkshopStaff;
  attendance: StaffAttendance[];
  commissions: StaffCommission[];
}

function PayslipsTabContent({ staff, attendance, commissions }: PayslipsTabContentProps) {
  const { toast } = useToast();
  
  // Generate monthly payslips data
  const generateMonthlyPayslips = () => {
    const monthlyData: Record<string, {
      month: string;
      baseSalary: number;
      commissions: number;
      daysPresent: number;
      total: number;
    }> = {};

    // Process commissions
    commissions.forEach(c => {
      const monthKey = format(new Date(c.date), "yyyy-MM");
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: format(new Date(c.date), "MMMM yyyy"),
          baseSalary: Number(staff.basicSalary),
          commissions: 0,
          daysPresent: 0,
          total: 0,
        };
      }
      monthlyData[monthKey].commissions += Number(c.commissionAmount);
    });

    // Process attendance
    attendance.forEach(a => {
      const monthKey = format(new Date(a.date), "yyyy-MM");
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: format(new Date(a.date), "MMMM yyyy"),
          baseSalary: Number(staff.basicSalary),
          commissions: 0,
          daysPresent: 0,
          total: 0,
        };
      }
      // Count attendance days based on presence of clockIn or clockOut
      if (a.clockIn || a.clockOut) {
        monthlyData[monthKey].daysPresent++;
      }
    });

    // Calculate totals
    Object.keys(monthlyData).forEach(key => {
      monthlyData[key].total = monthlyData[key].baseSalary + monthlyData[key].commissions;
    });

    // Sort by month descending
    return Object.entries(monthlyData)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, data]) => ({ monthKey: key, ...data }));
  };

  const payslips = generateMonthlyPayslips();

  const handleDownloadPayslip = (monthKey: string, month: string) => {
    toast({
      title: "PDF Generation Coming Soon",
      description: `Payslip for ${month} will be available in Task 14`,
    });
  };

  if (payslips.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No payroll data available yet</p>
        <p className="text-sm mt-2">Record attendance and commissions to generate payslips</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {payslips.map((payslip) => (
        <Card key={payslip.monthKey} data-testid={`payslip-${payslip.monthKey}`}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">{payslip.month}</CardTitle>
                <CardDescription className="mt-1">
                  {staff.name} • {staff.role}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadPayslip(payslip.monthKey, payslip.month)}
                data-testid={`button-download-${payslip.monthKey}`}
              >
                <Download className="h-3 w-3 mr-2" />
                Download
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Earnings */}
            <div className="space-y-2">
              <div className="text-sm font-semibold text-muted-foreground">Earnings</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Base Salary</div>
                  <div className="font-mono font-semibold">RM {payslip.baseSalary.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Commissions</div>
                  <div className="font-mono font-semibold text-green-600">
                    + RM {payslip.commissions.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Attendance */}
            <div className="space-y-2">
              <div className="text-sm font-semibold text-muted-foreground">Attendance</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Days Present</div>
                  <div className="font-semibold">{payslip.daysPresent} days</div>
                </div>
              </div>
            </div>

            {/* Total */}
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold text-foreground">Total Earnings</div>
                <div className="text-2xl font-bold font-mono text-foreground">RM {payslip.total.toFixed(2)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Staff Form Component
interface StaffFormProps {
  staff?: WorkshopStaff;
  onSubmit: (data: StaffFormData) => void;
  isSubmitting: boolean;
  onCancel: () => void;
}

function StaffForm({ staff, onSubmit, isSubmitting, onCancel }: StaffFormProps) {
  const form = useForm<StaffFormData>({
    resolver: zodResolver(staffFormSchema),
    defaultValues: {
      name: staff?.name || "",
      phone: staff?.phone || "",
      role: staff?.role || "",
      basicSalary: staff?.basicSalary || "",
      isActive: staff?.isActive !== undefined ? staff.isActive : true,
    },
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>{staff ? "Edit Staff Member" : "Add New Staff Member"}</DialogTitle>
        <DialogDescription>
          {staff ? "Update staff member information" : "Add a new staff member to your team"}
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
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} data-testid="input-staff-name" />
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
                    <Input placeholder="+60123456789" {...field} data-testid="input-staff-phone" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <FormControl>
                    <Input placeholder="Mechanic, Manager, etc." {...field} data-testid="input-staff-role" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="basicSalary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monthly Salary (RM)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="3000.00" {...field} data-testid="input-staff-salary" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0 pt-8">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      data-testid="input-staff-active"
                      className="h-4 w-4"
                    />
                  </FormControl>
                  <FormLabel className="!mt-0">Active Staff</FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel-form">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} data-testid="button-submit-staff">
              {isSubmitting ? "Saving..." : staff ? "Update Staff" : "Add Staff"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}

// Attendance Form Component
interface AttendanceFormProps {
  staff: WorkshopStaff[];
  onSubmit: (data: AttendanceFormData) => void;
  isSubmitting: boolean;
  onCancel: () => void;
}

function AttendanceForm({ staff, onSubmit, isSubmitting, onCancel }: AttendanceFormProps) {
  const form = useForm<AttendanceFormData>({
    resolver: zodResolver(attendanceFormSchema),
    defaultValues: {
      staffId: "",
      date: format(new Date(), "yyyy-MM-dd"),
      clockIn: "",
      clockOut: "",
      notes: "",
    },
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Record Attendance</DialogTitle>
        <DialogDescription>Mark staff attendance for today or any date</DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="staffId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Staff Member</FormLabel>
                <FormControl>
                  <select {...field} className="w-full p-2 border rounded-md" data-testid="select-staff">
                    <option value="">Select staff member...</option>
                    {staff.filter(s => s.isActive).map(s => (
                      <option key={s.id} value={s.id}>{s.name} - {s.role}</option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} data-testid="input-attendance-date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="clockIn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Clock In Time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} data-testid="input-clock-in" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="clockOut"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Clock Out Time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} data-testid="input-clock-out" />
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
                <FormLabel>Notes (optional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="Any additional notes..." {...field} data-testid="input-attendance-notes" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel-attendance">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} data-testid="button-submit-attendance">
              {isSubmitting ? "Saving..." : "Record Attendance"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}

// Commission Form Component
interface CommissionFormProps {
  staff: WorkshopStaff[];
  onSubmit: (data: CommissionFormData) => void;
  isSubmitting: boolean;
  onCancel: () => void;
}

function CommissionForm({ staff, onSubmit, isSubmitting, onCancel }: CommissionFormProps) {
  const form = useForm<CommissionFormData>({
    resolver: zodResolver(commissionFormSchema),
    defaultValues: {
      staffId: "",
      jobId: "",
      commissionAmount: "",
      date: format(new Date(), "yyyy-MM-dd"),
      notes: "",
    },
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add Commission</DialogTitle>
        <DialogDescription>Record a commission payment for a staff member</DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="staffId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Staff Member</FormLabel>
                <FormControl>
                  <select {...field} className="w-full p-2 border rounded-md" data-testid="select-commission-staff">
                    <option value="">Select staff member...</option>
                    {staff.filter(s => s.isActive).map(s => (
                      <option key={s.id} value={s.id}>{s.name} - {s.role}</option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="commissionAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Commission Amount (RM)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="100.00" {...field} data-testid="input-commission-amount" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} data-testid="input-commission-date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="jobId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Job ID (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="Job reference..." {...field} data-testid="input-commission-job" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (optional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="Commission details..." {...field} data-testid="input-commission-notes" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel-commission">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} data-testid="button-submit-commission">
              {isSubmitting ? "Saving..." : "Add Commission"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
