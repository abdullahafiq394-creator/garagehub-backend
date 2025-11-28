import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useWorkshopBookings, useUpdateBookingStatus, useUpdateBooking, useApproveBooking, useProposeBookingDate } from "@/hooks/api/useBookings";
import { Calendar, Search, Filter, CheckCircle, XCircle, Clock, AlertCircle, Car, User, Phone, Mail, DollarSign, CalendarClock } from "lucide-react";
import type { Booking, BookingStatus } from "@shared/schema";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

interface BookingManagementTabProps {
  workshopId: string;
}

export default function BookingManagementTab({ workshopId }: BookingManagementTabProps) {
  const { toast } = useToast();
  const [selectedStatus, setSelectedStatus] = useState<BookingStatus[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showProposeDialog, setShowProposeDialog] = useState(false);

  // Fetch ALL bookings once - no filters on API level
  const { data: allBookings, isLoading } = useWorkshopBookings(workshopId, {});

  // Client-side filtering - INSTANT and SMOOTH!
  const bookings = useMemo(() => {
    if (!allBookings) return [];
    
    let filtered = allBookings;
    
    // Filter by status
    if (selectedStatus.length > 0) {
      filtered = filtered.filter(b => selectedStatus.includes(b.status));
    }
    
    // Filter by search term (instant, no API call!)
    if (searchInput.trim()) {
      const search = searchInput.toLowerCase().trim();
      filtered = filtered.filter(b =>
        b.vehiclePlate.toLowerCase().includes(search) ||
        b.vehicleModel.toLowerCase().includes(search) ||
        (b.serviceType && b.serviceType.toLowerCase().includes(search))
      );
    }
    
    return filtered;
  }, [allBookings, selectedStatus, searchInput]);

  const updateStatusMutation = useUpdateBookingStatus();
  const approveMutation = useApproveBooking();
  const proposeMutation = useProposeBookingDate();

  // Status badge styling
  const getStatusBadge = (status: BookingStatus) => {
    const badges = {
      pending: { label: "Pending", variant: "default" as const, icon: Clock },
      workshop_proposed: { label: "Workshop Proposed", variant: "default" as const, icon: CalendarClock },
      approved: { label: "Approved", variant: "default" as const, icon: CheckCircle },
      rejected: { label: "Rejected", variant: "destructive" as const, icon: XCircle },
      completed: { label: "Completed", variant: "default" as const, icon: CheckCircle },
      cancelled: { label: "Cancelled", variant: "secondary" as const, icon: AlertCircle },
    };
    return badges[status] || { label: status, variant: "secondary" as const, icon: AlertCircle };
  };

  const handleStatusChange = async (bookingId: string, newStatus: BookingStatus) => {
    try {
      await updateStatusMutation.mutateAsync({ id: bookingId, status: newStatus });
      toast({
        title: "Status Updated",
        description: `Booking status changed to ${newStatus}`,
      });
      setShowDetailDialog(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Failed to update booking status",
      });
    }
  };

  const handleApprove = async (bookingId: string) => {
    try {
      await approveMutation.mutateAsync(bookingId);
      toast({
        title: "Booking Approved",
        description: "Booking approved and work order created",
      });
      setShowDetailDialog(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Approval Failed",
        description: "Failed to approve booking",
      });
    }
  };

  const toggleStatusFilter = (status: BookingStatus) => {
    setSelectedStatus(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground">Service Bookings</h2>
        <p className="text-sm text-muted-foreground">Manage customer service appointments</p>
      </div>

      {/* Filter Bar */}
      <Card className="p-3">
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by plate number, vehicle model..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10"
              data-testid="input-search-bookings"
            />
          </div>

          {/* Status Filters */}
          <div className="flex flex-wrap gap-2">
            {(['pending', 'approved', 'completed', 'rejected', 'cancelled'] as BookingStatus[]).map(status => {
              const badge = getStatusBadge(status);
              const Icon = badge.icon;
              const isActive = selectedStatus.includes(status);
              return (
                <Button
                  key={status}
                  size="sm"
                  variant={isActive ? "default" : "outline"}
                  onClick={() => toggleStatusFilter(status)}
                  className="text-xs"
                  data-testid={`filter-${status}`}
                >
                  <Icon className="h-3 w-3 mr-1" />
                  {badge.label}
                </Button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Bookings List */}
      {!bookings || bookings.length === 0 ? (
        <Card className="p-8 text-center">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No bookings found</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => {
            const statusBadge = getStatusBadge(booking.status);
            const StatusIcon = statusBadge.icon;
            return (
              <Card
                key={booking.id}
                className="hover-elevate active-elevate-2 cursor-pointer"
                onClick={() => {
                  setSelectedBooking(booking);
                  setShowDetailDialog(true);
                }}
                data-testid={`booking-card-${booking.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Vehicle Info */}
                      <div className="flex items-center gap-2 mb-1">
                        <Car className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="font-semibold text-sm text-foreground truncate">
                          {booking.vehiclePlate}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {booking.vehicleModel}
                        </span>
                      </div>

                      {/* Service Type */}
                      <p className="text-xs text-muted-foreground mb-1">
                        {booking.serviceType}
                      </p>

                      {/* Preferred Date */}
                      {booking.preferredDate && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(booking.preferredDate), "dd MMM yyyy, HH:mm")}
                        </p>
                      )}

                      {/* Estimated Cost */}
                      {booking.estimatedCost && (
                        <p className="text-xs text-foreground font-medium mt-1 flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          RM {parseFloat(booking.estimatedCost).toFixed(2)}
                        </p>
                      )}
                    </div>

                    {/* Status Badge */}
                    <Badge variant={statusBadge.variant} className="flex-shrink-0">
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusBadge.label}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Propose Date Dialog */}
      {selectedBooking && (
        <ProposeBookingDateDialog
          open={showProposeDialog}
          onOpenChange={setShowProposeDialog}
          booking={selectedBooking}
          onSuccess={() => {
            setShowProposeDialog(false);
            setShowDetailDialog(false);
          }}
        />
      )}

      {/* Detail Dialog */}
      {selectedBooking && (
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Booking Details</DialogTitle>
              <DialogDescription>
                Customer service booking information
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Status */}
              <div>
                <label className="text-xs text-muted-foreground">Status</label>
                <div className="mt-1">
                  <Badge variant={getStatusBadge(selectedBooking.status).variant}>
                    {getStatusBadge(selectedBooking.status).label}
                  </Badge>
                </div>
              </div>

              {/* Vehicle Info */}
              <div>
                <label className="text-xs text-muted-foreground">Vehicle</label>
                <p className="text-sm font-medium text-foreground mt-1">
                  {selectedBooking.vehiclePlate} - {selectedBooking.vehicleModel}
                </p>
              </div>

              {/* Service Type */}
              <div>
                <label className="text-xs text-muted-foreground">Service Type</label>
                <p className="text-sm text-foreground mt-1">{selectedBooking.serviceType}</p>
              </div>

              {/* Description */}
              {selectedBooking.description && (
                <div>
                  <label className="text-xs text-muted-foreground">Description</label>
                  <p className="text-sm text-foreground mt-1">{selectedBooking.description}</p>
                </div>
              )}

              {/* Preferred Date */}
              {selectedBooking.preferredDate && (
                <div>
                  <label className="text-xs text-muted-foreground">Preferred Date</label>
                  <p className="text-sm text-foreground mt-1 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(selectedBooking.preferredDate), "dd MMMM yyyy, HH:mm")}
                  </p>
                </div>
              )}

              {/* Proposed Date (Workshop's suggestion) */}
              {selectedBooking.proposedDate && (
                <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <label className="text-xs font-medium text-primary">Workshop Proposed Date</label>
                  <p className="text-sm font-semibold text-foreground mt-1 flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-primary" />
                    {format(new Date(selectedBooking.proposedDate), "dd MMMM yyyy, HH:mm")}
                  </p>
                  {selectedBooking.proposalReason && (
                    <p className="text-xs text-muted-foreground mt-2">
                      <span className="font-medium">Reason:</span> {selectedBooking.proposalReason}
                    </p>
                  )}
                </div>
              )}

              {/* Estimated Cost */}
              {selectedBooking.estimatedCost && (
                <div>
                  <label className="text-xs text-muted-foreground">Estimated Cost</label>
                  <p className="text-sm font-semibold text-foreground mt-1">
                    RM {parseFloat(selectedBooking.estimatedCost).toFixed(2)}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-col">
              {selectedBooking.status === 'pending' && (
                <>
                  <Button
                    className="w-full"
                    onClick={() => handleApprove(selectedBooking.id)}
                    disabled={approveMutation.isPending}
                    data-testid="button-approve-booking"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve & Create Work Order
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowProposeDialog(true)}
                    data-testid="button-propose-date"
                  >
                    <CalendarClock className="h-4 w-4 mr-2" />
                    Propose New Date
                  </Button>
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => handleStatusChange(selectedBooking.id, 'rejected')}
                    disabled={updateStatusMutation.isPending}
                    data-testid="button-reject-booking"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </>
              )}

              {selectedBooking.status === 'approved' && (
                <Button
                  className="w-full"
                  onClick={() => handleStatusChange(selectedBooking.id, 'completed')}
                  disabled={updateStatusMutation.isPending}
                  data-testid="button-complete-booking"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Completed
                </Button>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowDetailDialog(false)}
                data-testid="button-close-dialog"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Propose Booking Date Dialog Component
const proposeDateSchema = z.object({
  proposedDate: z.string().min(1, "Proposed date is required"),
  proposalReason: z.string().max(500, "Reason must be less than 500 characters").optional(),
});

type ProposeDateFormData = z.infer<typeof proposeDateSchema>;

interface ProposeBookingDateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking;
  onSuccess: () => void;
}

function ProposeBookingDateDialog({ open, onOpenChange, booking, onSuccess }: ProposeBookingDateDialogProps) {
  const { toast } = useToast();
  const proposeMutation = useProposeBookingDate();
  
  const form = useForm<ProposeDateFormData>({
    resolver: zodResolver(proposeDateSchema),
    defaultValues: {
      proposedDate: "",
      proposalReason: "",
    },
  });

  const handleSubmit = async (data: ProposeDateFormData) => {
    try {
      // Convert to ISO string with 5-minute buffer for timezone
      const proposedDate = new Date(data.proposedDate);
      const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
      
      if (proposedDate < fiveMinutesFromNow) {
        form.setError("proposedDate", {
          message: "Proposed date must be at least 5 minutes in the future",
        });
        return;
      }

      await proposeMutation.mutateAsync({
        id: booking.id,
        proposedDate: proposedDate.toISOString(),
        proposalReason: data.proposalReason || undefined,
      });

      toast({
        title: "Date Proposed",
        description: "New date proposed to customer successfully",
      });

      form.reset();
      onSuccess();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Proposal Failed",
        description: "Failed to propose new date",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Propose New Date</DialogTitle>
          <DialogDescription>
            Suggest an alternative date and time to the customer
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Proposed Date */}
            <FormField
              control={form.control}
              name="proposedDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proposed Date & Time</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      {...field}
                      data-testid="input-proposed-date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Reason (Optional) */}
            <FormField
              control={form.control}
              name="proposalReason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Workshop fully booked at preferred time"
                      rows={3}
                      {...field}
                      data-testid="input-proposal-reason"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  onOpenChange(false);
                }}
                data-testid="button-cancel-propose"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={proposeMutation.isPending}
                data-testid="button-submit-propose"
              >
                <CalendarClock className="h-4 w-4 mr-2" />
                {proposeMutation.isPending ? "Proposing..." : "Propose Date"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
