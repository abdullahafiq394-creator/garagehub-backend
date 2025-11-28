import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTowingRequests, useAssignTowingRequest, useUpdateTowingStatus } from "@/hooks/api/useTowing";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function TowingRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: allRequests, isLoading } = useTowingRequests();
  const assignMutation = useAssignTowingRequest();
  const updateStatusMutation = useUpdateTowingStatus();

  // Filter requests by status for the current towing service
  const activeRequestsList = allRequests?.filter(
    r => r.towingServiceId === user?.id && (r.status === 'assigned' || r.status === 'en_route')
  ) || [];

  const pendingRequestsList = allRequests?.filter(r => r.status === 'pending' && !r.towingServiceId) || [];

  const completedRequestsList = allRequests?.filter(
    r => r.status === 'completed' && r.towingServiceId === user?.id
  ) || [];

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await assignMutation.mutateAsync(requestId);
      toast({
        title: "Request Accepted",
        description: "You have been assigned to this towing request.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to accept request. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateStatus = async (requestId: string, newStatus: string) => {
    try {
      await updateStatusMutation.mutateAsync({ id: requestId, status: newStatus });
      toast({
        title: "Status Updated",
        description: `Request status updated to ${newStatus}.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Towing Requests</h1>
        <p className="text-muted-foreground mt-2">
          Manage towing service requests
        </p>
      </div>

      <Tabs defaultValue="active" className="space-y-6">
        <TabsList>
          <TabsTrigger value="active" data-testid="tab-active">
            Active ({activeRequestsList.length})
          </TabsTrigger>
          <TabsTrigger value="pending" data-testid="tab-pending">
            Pending ({pendingRequestsList.length})
          </TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed">
            Completed ({completedRequestsList.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Requests</CardTitle>
              <CardDescription>Your current towing jobs</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="p-4 rounded-md border">
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-40 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {activeRequestsList.map((request) => (
                    <div
                      key={request.id}
                      className="p-4 rounded-md border space-y-3"
                      data-testid={`request-${request.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <p className="font-medium font-mono">#{request.id.slice(0, 8)}</p>
                          <p className="text-sm text-muted-foreground">{request.vehicleModel} - {request.vehiclePlate}</p>
                          <p className="text-sm">Pickup: {request.pickupLocation}</p>
                          <p className="text-sm">Dropoff: {request.dropoffLocation}</p>
                        </div>
                        <StatusBadge status={request.status} />
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <p className="text-sm font-mono font-semibold text-primary">
                          {request.estimatedCost ? `RM ${request.estimatedCost}` : 'Pending'}
                        </p>
                        <Button 
                          size="sm" 
                          data-testid={`button-update-${request.id}`}
                          onClick={() => handleUpdateStatus(request.id, request.status === 'assigned' ? 'en_route' : 'completed')}
                          disabled={updateStatusMutation.isPending}
                        >
                          {request.status === 'assigned' ? 'Start Journey' : 'Mark Complete'}
                        </Button>
                      </div>
                    </div>
                  ))}
                  {activeRequestsList.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No active requests</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Requests</CardTitle>
              <CardDescription>New towing requests awaiting acceptance</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="p-4 rounded-md border">
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-40 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingRequestsList.map((request) => (
                    <div
                      key={request.id}
                      className="p-4 rounded-md border space-y-3 hover-elevate"
                      data-testid={`pending-${request.id}`}
                    >
                      <div className="space-y-1">
                        <p className="font-medium font-mono">#{request.id.slice(0, 8)}</p>
                        <p className="text-sm text-muted-foreground">{request.vehicleModel} - {request.vehiclePlate}</p>
                        <p className="text-sm">Location: {request.pickupLocation}</p>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <p className="text-sm font-mono font-semibold text-primary">
                          {request.estimatedCost ? `RM ${request.estimatedCost}` : 'Quote pending'}
                        </p>
                        <Button 
                          size="sm" 
                          data-testid={`button-accept-${request.id}`}
                          onClick={() => handleAcceptRequest(request.id)}
                          disabled={assignMutation.isPending}
                        >
                          {assignMutation.isPending ? "Accepting..." : "Accept Request"}
                        </Button>
                      </div>
                    </div>
                  ))}
                  {pendingRequestsList.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No pending requests</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Completed Requests</CardTitle>
              <CardDescription>Your towing service history</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="p-4 rounded-md border">
                      <Skeleton className="h-4 w-32 mb-2" />
                      <Skeleton className="h-3 w-40 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {completedRequestsList.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-start justify-between p-4 rounded-md border"
                      data-testid={`completed-${request.id}`}
                    >
                      <div className="space-y-1 flex-1">
                        <p className="font-medium font-mono">#{request.id.slice(0, 8)}</p>
                        <p className="text-sm text-muted-foreground">{request.vehicleModel} - {request.vehiclePlate}</p>
                        {request.updatedAt && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(request.updatedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <p className="text-sm font-mono font-semibold">{request.estimatedCost ? `RM ${request.estimatedCost}` : 'N/A'}</p>
                    </div>
                  ))}
                  {completedRequestsList.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No completed requests</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
