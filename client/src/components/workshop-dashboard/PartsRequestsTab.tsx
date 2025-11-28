import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, CheckCircle, XCircle, Truck, User, Wrench, AlertCircle } from "lucide-react";
import { DashboardEmptyState } from "./DashboardEmptyState";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface PartsRequestsTabProps {
  workshopId: string;
}

interface PartRequestItem {
  id: string;
  requestId: string;
  itemName: string;
  quantity: number;
  notes?: string | null;
}

interface PartsRequest {
  id: string;
  jobId: string;
  workshopId: string;
  requestedBy: string;
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled';
  notes?: string | null;
  createdAt: string;
  items: PartRequestItem[];
}

export default function PartsRequestsTab({ workshopId }: PartsRequestsTabProps) {
  const [selectedRequest, setSelectedRequest] = useState<PartsRequest | null>(null);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const { toast } = useToast();

  // Fetch parts requests
  const { data: requests, isLoading } = useQuery<PartsRequest[]>({
    queryKey: ["/api/workshop-dashboard/parts-requests"],
  });

  // Update parts request status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' | 'fulfilled' }) => {
      return apiRequest(`/api/workshop-dashboard/parts-requests/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workshop-dashboard/parts-requests"] });
      toast({ title: "Parts request updated successfully" });
      setIsApproveDialogOpen(false);
      setIsRejectDialogOpen(false);
      setSelectedRequest(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update parts request", description: error.message, variant: "destructive" });
    },
  });

  // Group requests by status
  const pendingRequests = requests?.filter(r => r.status === "pending") || [];
  const approvedRequests = requests?.filter(r => r.status === "approved") || [];
  const rejectedRequests = requests?.filter(r => r.status === "rejected") || [];
  const fulfilledRequests = requests?.filter(r => r.status === "fulfilled") || [];

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'secondary';
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'fulfilled': return 'default';
      default: return 'secondary';
    }
  };

  const handleApprove = (request: PartsRequest) => {
    setSelectedRequest(request);
    setIsApproveDialogOpen(true);
  };

  const handleReject = (request: PartsRequest) => {
    setSelectedRequest(request);
    setIsRejectDialogOpen(true);
  };

  const handleFulfill = (request: PartsRequest) => {
    updateStatusMutation.mutate({ id: request.id, status: 'fulfilled' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-col items-center text-center gap-4 space-y-0">
          <div className="w-full flex flex-col items-center gap-3">
            <Package className="h-8 w-8" />
            <div className="text-center">
              <CardTitle className="text-foreground">Parts Requests</CardTitle>
              <CardDescription className="mt-2">
                Manage mechanic parts requests - approve, reject, or mark as fulfilled
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Parts Requests by Status */}
      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="pending" data-testid="tab-pending-requests">
                Pending ({pendingRequests.length})
              </TabsTrigger>
              <TabsTrigger value="approved" data-testid="tab-approved-requests">
                Approved ({approvedRequests.length})
              </TabsTrigger>
              <TabsTrigger value="fulfilled" data-testid="tab-fulfilled-requests">
                Fulfilled ({fulfilledRequests.length})
              </TabsTrigger>
              <TabsTrigger value="rejected" data-testid="tab-rejected-requests">
                Rejected ({rejectedRequests.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="mt-6">
              <RequestsList
                requests={pendingRequests}
                isLoading={isLoading}
                onApprove={handleApprove}
                onReject={handleReject}
                getStatusBadgeVariant={getStatusBadgeVariant}
              />
            </TabsContent>

            <TabsContent value="approved" className="mt-6">
              <RequestsList
                requests={approvedRequests}
                isLoading={isLoading}
                onFulfill={handleFulfill}
                getStatusBadgeVariant={getStatusBadgeVariant}
              />
            </TabsContent>

            <TabsContent value="fulfilled" className="mt-6">
              <RequestsList
                requests={fulfilledRequests}
                isLoading={isLoading}
                getStatusBadgeVariant={getStatusBadgeVariant}
              />
            </TabsContent>

            <TabsContent value="rejected" className="mt-6">
              <RequestsList
                requests={rejectedRequests}
                isLoading={isLoading}
                getStatusBadgeVariant={getStatusBadgeVariant}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Parts Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this parts request? The mechanic will be notified.
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold text-muted-foreground mb-2">Items Requested</div>
                <div className="space-y-2">
                  {selectedRequest.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm border rounded-md p-2">
                      <span>{item.itemName}</span>
                      <Badge variant="secondary">Qty: {item.quantity}</Badge>
                    </div>
                  ))}
                </div>
              </div>
              {selectedRequest.notes && (
                <div>
                  <div className="text-sm font-semibold text-muted-foreground mb-2">Notes</div>
                  <p className="text-sm">{selectedRequest.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)} data-testid="button-cancel-approve">
              Cancel
            </Button>
            <Button
              onClick={() => selectedRequest && updateStatusMutation.mutate({ id: selectedRequest.id, status: 'approved' })}
              disabled={updateStatusMutation.isPending}
              data-testid="button-confirm-approve"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {updateStatusMutation.isPending ? "Approving..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Parts Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject this parts request? The mechanic will be notified.
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div>
                <div className="text-sm font-semibold text-muted-foreground mb-2">Items Requested</div>
                <div className="space-y-2">
                  {selectedRequest.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm border rounded-md p-2">
                      <span>{item.itemName}</span>
                      <Badge variant="secondary">Qty: {item.quantity}</Badge>
                    </div>
                  ))}
                </div>
              </div>
              {selectedRequest.notes && (
                <div>
                  <div className="text-sm font-semibold text-muted-foreground mb-2">Notes</div>
                  <p className="text-sm">{selectedRequest.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)} data-testid="button-cancel-reject">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedRequest && updateStatusMutation.mutate({ id: selectedRequest.id, status: 'rejected' })}
              disabled={updateStatusMutation.isPending}
              data-testid="button-confirm-reject"
            >
              <XCircle className="h-4 w-4 mr-2" />
              {updateStatusMutation.isPending ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Requests List Component
interface RequestsListProps {
  requests: PartsRequest[];
  isLoading: boolean;
  onApprove?: (request: PartsRequest) => void;
  onReject?: (request: PartsRequest) => void;
  onFulfill?: (request: PartsRequest) => void;
  getStatusBadgeVariant: (status: string) => any;
}

function RequestsList({ requests, isLoading, onApprove, onReject, onFulfill, getStatusBadgeVariant }: RequestsListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-md" />
        ))}
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <DashboardEmptyState
        icon={Package}
        title="No Parts Requests"
        description="No parts requests in this category"
      />
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <Card key={request.id} data-testid={`parts-request-${request.id}`}>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-base">Parts Request #{request.id.substring(0, 8)}</CardTitle>
                <CardDescription>
                  Requested {format(new Date(request.createdAt), "MMM dd, yyyy h:mm a")}
                </CardDescription>
              </div>
              <Badge variant={getStatusBadgeVariant(request.status)}>
                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Items List */}
            <div>
              <div className="text-sm font-semibold text-muted-foreground mb-2">Items ({request.items.length})</div>
              <div className="space-y-2">
                {request.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm border rounded-md p-2 bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Package className="h-3 w-3 text-muted-foreground" />
                      <span>{item.itemName}</span>
                    </div>
                    <Badge variant="secondary" data-testid={`item-quantity-${item.id}`}>
                      Qty: {item.quantity}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            {request.notes && (
              <div>
                <div className="text-sm font-semibold text-muted-foreground mb-2">Notes</div>
                <p className="text-sm text-muted-foreground">{request.notes}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t">
              {onApprove && (
                <Button
                  size="sm"
                  onClick={() => onApprove(request)}
                  data-testid={`button-approve-${request.id}`}
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Approve
                </Button>
              )}
              {onReject && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onReject(request)}
                  data-testid={`button-reject-${request.id}`}
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  Reject
                </Button>
              )}
              {onFulfill && (
                <Button
                  size="sm"
                  onClick={() => onFulfill(request)}
                  data-testid={`button-fulfill-${request.id}`}
                >
                  <Truck className="h-3 w-3 mr-1" />
                  Mark as Fulfilled
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
