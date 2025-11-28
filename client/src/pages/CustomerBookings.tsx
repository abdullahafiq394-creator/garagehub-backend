import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, CheckCircle, XCircle, CalendarClock, Car } from "lucide-react";
import { useBookings, useAcceptBookingProposal, useRejectBookingProposal } from "@/hooks/api/useBookings";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function CustomerBookings() {
  const { toast } = useToast();
  const { data: bookings, isLoading } = useBookings();
  const acceptProposalMutation = useAcceptBookingProposal();
  const rejectProposalMutation = useRejectBookingProposal();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Bookings</h1>
          <p className="text-muted-foreground mt-2">View and manage your service bookings</p>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const pendingBookings = bookings?.filter(b => b.status === 'pending') || [];
  const approvedBookings = bookings?.filter(b => b.status === 'approved') || [];
  const proposedBookings = bookings?.filter(b => b.status === 'workshop_proposed') || [];
  const completedBookings = bookings?.filter(b => b.status === 'completed') || [];
  const cancelledBookings = bookings?.filter(b => b.status === 'cancelled' || b.status === 'rejected') || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Bookings</h1>
        <p className="text-muted-foreground mt-2">
          View and manage all your service bookings
        </p>
      </div>

      {!bookings || bookings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No bookings yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start by booking a service at a workshop near you
            </p>
            <Button asChild data-testid="button-book-now">
              <a href="/customer/dashboard">Book Now</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {proposedBookings.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <CalendarClock className="h-5 w-5 text-orange-500" />
                Requires Your Response ({proposedBookings.length})
              </h2>
              {proposedBookings.map(booking => {
                const handleAccept = async () => {
                  try {
                    await acceptProposalMutation.mutateAsync(booking.id);
                    toast({
                      title: "Proposal Accepted",
                      description: "You have accepted the workshop's proposed date",
                    });
                  } catch (error) {
                    toast({
                      variant: "destructive",
                      title: "Accept Failed",
                      description: "Failed to accept proposed date",
                    });
                  }
                };

                const handleReject = async () => {
                  try {
                    await rejectProposalMutation.mutateAsync(booking.id);
                    toast({
                      title: "Proposal Rejected",
                      description: "You have rejected the workshop's proposed date",
                    });
                  } catch (error) {
                    toast({
                      variant: "destructive",
                      title: "Reject Failed",
                      description: "Failed to reject proposed date",
                    });
                  }
                };

                return (
                  <div
                    key={booking.id}
                    className="p-4 rounded-md border hover-elevate"
                    data-testid={`booking-${booking.id}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="space-y-1 flex-1">
                        <p className="font-medium flex items-center gap-2">
                          <Car className="h-4 w-4" />
                          {booking.vehicleModel} • {booking.vehiclePlate}
                        </p>
                        <p className="text-sm text-muted-foreground">{booking.serviceType}</p>
                        {booking.description && (
                          <p className="text-sm">{booking.description}</p>
                        )}
                        {booking.preferredDate && (
                          <p className="text-xs text-muted-foreground">
                            Preferred: {new Date(booking.preferredDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <StatusBadge status={booking.status} />
                    </div>

                    {booking.proposedDate && booking.status === 'workshop_proposed' && (
                      <div className="mt-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
                        <div className="flex items-start gap-2 mb-2">
                          <CalendarClock className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-primary">Workshop Proposed New Date</p>
                            <p className="text-sm font-semibold text-foreground mt-1">
                              {format(new Date(booking.proposedDate), "dd MMMM yyyy, HH:mm")}
                            </p>
                            {booking.proposalReason && (
                              <p className="text-xs text-muted-foreground mt-2">
                                <span className="font-medium">Reason:</span> {booking.proposalReason}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={handleAccept}
                            disabled={acceptProposalMutation.isPending}
                            data-testid={`button-accept-${booking.id}`}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {acceptProposalMutation.isPending ? "Accepting..." : "Accept"}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="flex-1"
                            onClick={handleReject}
                            disabled={rejectProposalMutation.isPending}
                            data-testid={`button-reject-${booking.id}`}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            {rejectProposalMutation.isPending ? "Rejecting..." : "Reject"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {(pendingBookings.length > 0 || approvedBookings.length > 0) && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Active Bookings ({pendingBookings.length + approvedBookings.length})</h2>
              {[...pendingBookings, ...approvedBookings].map(booking => (
                <div
                  key={booking.id}
                  className="p-4 rounded-md border hover-elevate"
                  data-testid={`booking-${booking.id}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="space-y-1 flex-1">
                      <p className="font-medium flex items-center gap-2">
                        <Car className="h-4 w-4" />
                        {booking.vehicleModel} • {booking.vehiclePlate}
                      </p>
                      <p className="text-sm text-muted-foreground">{booking.serviceType}</p>
                      {booking.description && (
                        <p className="text-sm">{booking.description}</p>
                      )}
                      {booking.preferredDate && (
                        <p className="text-xs text-muted-foreground">
                          Preferred: {new Date(booking.preferredDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={booking.status} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {completedBookings.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Completed ({completedBookings.length})</h2>
              {completedBookings.map(booking => (
                <div
                  key={booking.id}
                  className="p-4 rounded-md border opacity-75"
                  data-testid={`booking-${booking.id}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="space-y-1 flex-1">
                      <p className="font-medium flex items-center gap-2">
                        <Car className="h-4 w-4" />
                        {booking.vehicleModel} • {booking.vehiclePlate}
                      </p>
                      <p className="text-sm text-muted-foreground">{booking.serviceType}</p>
                      {booking.preferredDate && (
                        <p className="text-xs text-muted-foreground">
                          Completed: {new Date(booking.preferredDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={booking.status} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {cancelledBookings.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-muted-foreground">
                Cancelled ({cancelledBookings.length})
              </h2>
              {cancelledBookings.map(booking => (
                <div
                  key={booking.id}
                  className="p-4 rounded-md border opacity-50"
                  data-testid={`booking-${booking.id}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="space-y-1 flex-1">
                      <p className="font-medium flex items-center gap-2">
                        <Car className="h-4 w-4" />
                        {booking.vehicleModel} • {booking.vehiclePlate}
                      </p>
                      <p className="text-sm text-muted-foreground">{booking.serviceType}</p>
                    </div>
                    <StatusBadge status={booking.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
