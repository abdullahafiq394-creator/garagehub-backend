import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { DollarSign, TowerControl, CheckCircle, Clock } from "lucide-react";
import { Link } from "wouter";
import { useTowingRequests, useAssignTowingRequest } from "@/hooks/api/useTowing";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

export default function TowingDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { data: allRequests, isLoading } = useTowingRequests();
  const assignMutation = useAssignTowingRequest();

  // Filter requests by status
  const activeRequestsList = allRequests?.filter(
    r => r.towingServiceId === user?.id && (r.status === 'assigned' || r.status === 'en_route')
  ) || [];

  const pendingRequestsList = allRequests?.filter(r => r.status === 'pending' && !r.towingServiceId) || [];

  const completedToday = allRequests?.filter(r => {
    if (r.status === 'completed' && r.towingServiceId === user?.id && r.updatedAt) {
      const today = new Date();
      const requestDate = new Date(r.updatedAt);
      return requestDate.toDateString() === today.toDateString();
    }
    return false;
  }).length || 0;

  // Calculate revenue from completed requests today
  const todayRevenue = allRequests?.filter(r => {
    if (r.status === 'completed' && r.towingServiceId === user?.id && r.updatedAt && r.estimatedCost) {
      const today = new Date();
      const requestDate = new Date(r.updatedAt);
      return requestDate.toDateString() === today.toDateString();
    }
    return false;
  }).reduce((sum, r) => sum + (parseFloat(r.estimatedCost || '0')), 0) || 0;

  const handleAcceptRequest = async (requestId: string) => {
    try {
      await assignMutation.mutateAsync(requestId);
      toast({
        title: t("towing.dashboard.requestAccepted"),
        description: t("towing.dashboard.assignedToRequest"),
      });
    } catch (error) {
      toast({
        title: t("towing.dashboard.error"),
        description: t("towing.dashboard.failedToAccept"),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("towing.dashboard.title")}</h1>
        <p className="text-muted-foreground mt-2">
          {t("towing.dashboard.subtitle")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-20" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <StatCard
              title={t("towing.dashboard.todaysRevenue")}
              value={`RM ${todayRevenue.toFixed(2)}`}
              icon={DollarSign}
              description={t("towing.dashboard.totalRevenueToday")}
            />
            <StatCard
              title={t("towing.dashboard.activeRequests")}
              value={activeRequestsList.length}
              icon={TowerControl}
              description={t("towing.dashboard.currentlyActive")}
            />
            <StatCard
              title={t("towing.dashboard.completedToday")}
              value={completedToday}
              icon={CheckCircle}
              description={t("towing.dashboard.completedRequests")}
            />
            <StatCard
              title={t("towing.dashboard.pendingRequests")}
              value={pendingRequestsList.length}
              icon={Clock}
              description={t("towing.dashboard.availableRequests")}
            />
          </>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle>{t("towing.dashboard.activeRequestsTitle")}</CardTitle>
              <CardDescription>{t("towing.dashboard.yourCurrentJobs")}</CardDescription>
            </div>
            <Button asChild>
              <Link href="/towing-requests" data-testid="button-view-all-requests">
                {t("towing.dashboard.viewAll")}
              </Link>
            </Button>
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
                        <p className="font-medium">{t("towing.dashboard.customerRequest")}</p>
                        <p className="text-sm text-muted-foreground">{request.vehicleModel} - {request.vehiclePlate}</p>
                        <p className="text-sm">{t("towing.dashboard.from")}: {request.pickupLocation}</p>
                        <p className="text-sm">{t("towing.dashboard.to")}: {request.dropoffLocation}</p>
                      </div>
                      <StatusBadge status={request.status} />
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <p className="text-sm font-mono font-semibold text-primary">
                        {request.estimatedCost ? `RM ${request.estimatedCost}` : t("towing.dashboard.pending")}
                      </p>
                      <Button size="sm" asChild>
                        <Link href="/towing-requests" data-testid={`button-update-${request.id}`}>
                          {t("towing.dashboard.updateStatus")}
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
                {activeRequestsList.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">{t("towing.dashboard.noActiveRequests")}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle>{t("towing.dashboard.pendingRequestsTitle")}</CardTitle>
              <CardDescription>{t("towing.dashboard.newRequestsNear")}</CardDescription>
            </div>
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
                      <p className="font-medium">{t("towing.dashboard.newRequest")}</p>
                      <p className="text-sm text-muted-foreground">{request.vehicleModel} - {request.vehiclePlate}</p>
                      <p className="text-sm">{t("towing.dashboard.location")}: {request.pickupLocation}</p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <p className="text-sm font-mono font-semibold text-primary">
                        {request.estimatedCost ? `RM ${request.estimatedCost}` : t("towing.dashboard.quotePending")}
                      </p>
                      <Button 
                        size="sm" 
                        data-testid={`button-accept-${request.id}`}
                        onClick={() => handleAcceptRequest(request.id)}
                        disabled={assignMutation.isPending}
                      >
                        {assignMutation.isPending ? t("towing.dashboard.accepting") : t("towing.dashboard.acceptRequest")}
                      </Button>
                    </div>
                  </div>
                ))}
                {pendingRequestsList.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">{t("towing.dashboard.noPendingRequests")}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Manage your towing service</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/towing-requests" data-testid="button-manage-requests">
              <TowerControl className="h-4 w-4 mr-2" />
              Manage Requests
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/notifications" data-testid="button-notifications">
              View Notifications
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
