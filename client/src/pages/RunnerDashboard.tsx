import { useState, useEffect } from "react";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign, Truck, CheckCircle, Clock, Navigation, Timer } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useOrders, useUpdateOrderStatus } from "@/hooks/api/useOrders";
import { useDeliveryOffers, useAcceptOffer, useRejectOffer } from "@/hooks/api/useDeliveryOffers";
import { MapTracker } from "@/components/MapTracker";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

export default function RunnerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [newStatus, setNewStatus] = useState<string>("");

  // Fetch delivery offers
  const { data: allOffers, isLoading: offersLoading } = useDeliveryOffers();
  const pendingOffers = allOffers?.filter(o => o.status === 'pending') || [];

  // Fetch all orders
  const { data: allOrders, isLoading: ordersLoading } = useOrders(null);

  // Filter orders for this runner
  const assignedOrders = allOrders?.filter(o => o.runnerId === user?.id) || [];

  // Calculate statistics
  const activeDeliveries = assignedOrders.filter(
    o => ['assigned_runner', 'picked_up', 'delivering'].includes(o.status)
  );
  const completedToday = assignedOrders.filter(o => {
    if (o.status === 'delivered' && o.updatedAt) {
      const today = new Date();
      const orderDate = new Date(o.updatedAt);
      return orderDate.toDateString() === today.toDateString();
    }
    return false;
  }).length;

  // Get recent active deliveries (limit to 2 for dashboard)
  const recentActiveDeliveries = activeDeliveries.slice(0, 2);

  // State for live countdown timer
  const [, setTick] = useState(0);

  // Mutations
  const acceptOffer = useAcceptOffer();
  const rejectOffer = useRejectOffer();
  const updateStatus = useUpdateOrderStatus();

  const openStatusDialog = (order: any) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setStatusDialogOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedOrder || !newStatus) return;

    try {
      await updateStatus.mutateAsync({ id: selectedOrder.id, status: newStatus });
      toast({
        title: t("runner.dashboard.toasts.statusUpdated"),
        description: t("runner.dashboard.toasts.statusUpdatedDesc"),
      });
      setStatusDialogOpen(false);
    } catch (error: any) {
      toast({
        title: t("runner.dashboard.toasts.updateFailed"),
        description: t("runner.dashboard.toasts.updateFailedDesc"),
        variant: "destructive",
      });
    }
  };

  const handleAcceptOffer = async (offerId: string) => {
    try {
      await acceptOffer.mutateAsync(offerId);
      toast({
        title: t("runner.dashboard.toasts.offerAccepted"),
        description: t("runner.dashboard.toasts.offerAcceptedDesc"),
      });
    } catch (error: any) {
      toast({
        title: t("runner.dashboard.toasts.updateFailed"),
        description: t("runner.dashboard.toasts.updateFailedDesc"),
        variant: "destructive",
      });
    }
  };

  const handleRejectOffer = async (offerId: string) => {
    try {
      await rejectOffer.mutateAsync(offerId);
      toast({
        title: t("runner.dashboard.toasts.offerRejected"),
        description: t("runner.dashboard.toasts.offerRejectedDesc"),
      });
    } catch (error: any) {
      toast({
        title: t("runner.dashboard.toasts.updateFailed"),
        description: t("runner.dashboard.toasts.updateFailedDesc"),
        variant: "destructive",
      });
    }
  };

  const formatTimeRemaining = (expiresAt: Date) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires.getTime() - now.getTime();
    
    if (diffMs <= 0) return t("runner.dashboard.pendingSection.expired");
    
    const minutes = Math.floor(diffMs / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    
    return `${minutes}m ${seconds}s`;
  };

  // Live countdown timer - update every second
  useEffect(() => {
    if (pendingOffers.length === 0) return;
    
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [pendingOffers.length]);

  const isLoading = ordersLoading || offersLoading;

  return (
    <div className="space-y-2">
        <div className="mb-1">
          <h1 className="text-xl font-bold tracking-tight mb-0">{t("runner.dashboard.title")}</h1>
          <p className="text-foreground text-xs font-medium">
            {t("runner.dashboard.subtitle")}
          </p>
        </div>

      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
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
              title={t("runner.dashboard.stats.pendingOffers")}
              value={pendingOffers.length}
              icon={Clock}
              description={t("runner.dashboard.stats.pendingOffersDesc")}
            />
            <StatCard
              title={t("runner.dashboard.stats.activeDeliveries")}
              value={activeDeliveries.length}
              icon={Truck}
              description={t("runner.dashboard.stats.activeDeliveriesDesc")}
            />
            <StatCard
              title={t("runner.dashboard.stats.completedToday")}
              value={completedToday}
              icon={CheckCircle}
              description={t("runner.dashboard.stats.completedTodayDesc")}
            />
            <StatCard
              title={t("runner.dashboard.stats.totalCompleted")}
              value={assignedOrders.filter(o => o.status === 'delivered').length}
              icon={CheckCircle}
              description={t("runner.dashboard.stats.totalCompletedDesc")}
            />
          </>
        )}
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3">
            <div>
              <CardTitle>{t("runner.dashboard.activeSection.title")}</CardTitle>
              <CardDescription className="text-foreground">{t("runner.dashboard.activeSection.desc")}</CardDescription>
            </div>
            <Button asChild>
              <Link href="/runner/jobs" data-testid="button-view-deliveries">
                {t("runner.dashboard.activeSection.viewAll")}
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
              <div className="space-y-1.5">
                {recentActiveDeliveries.map((delivery) => (
                  <div
                    key={delivery.id}
                    className="p-2 rounded-md border space-y-1.5"
                    data-testid={`delivery-${delivery.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <p className="text-sm font-medium">{t("runner.dashboard.activeSection.order")} #{delivery.id.slice(0, 8)}</p>
                        <p className="text-sm font-medium">{t("runner.dashboard.activeSection.to")}: {delivery.deliveryAddress}</p>
                        <p className="text-sm text-foreground">{t("runner.dashboard.activeSection.amount")}: RM {delivery.totalAmount}</p>
                      </div>
                      <StatusBadge status={delivery.status} />
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <p className="text-sm font-mono font-semibold text-primary">
                        RM {delivery.totalAmount}
                      </p>
                      <Button 
                        size="sm" 
                        onClick={() => openStatusDialog(delivery)}
                        data-testid={`button-update-${delivery.id}`}
                      >
                        {t("runner.dashboard.activeSection.updateStatus")}
                      </Button>
                    </div>
                  </div>
                ))}
                {recentActiveDeliveries.length === 0 && (
                  <p className="text-center text-foreground py-2 text-sm">{t("runner.dashboard.activeSection.noDeliveries")}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3">
            <div>
              <CardTitle>{t("runner.dashboard.pendingSection.title")}</CardTitle>
              <CardDescription className="text-foreground">{t("runner.dashboard.pendingSection.desc")}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-1.5">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="p-2 rounded-md border">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-40 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-1.5">
                {pendingOffers.map((offer) => (
                  <div
                    key={offer.id}
                    className="p-2 rounded-md border space-y-1.5 bg-card"
                    data-testid={`offer-${offer.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1">
                        <p className="text-sm font-medium">{t("runner.dashboard.activeSection.order")} #{offer.orderId.slice(0, 8)}</p>
                        <div className="flex items-center gap-2">
                          <Timer className="h-3 w-3 text-foreground" />
                          <p className="text-xs text-foreground">
                            {t("runner.dashboard.pendingSection.expiresIn")} {formatTimeRemaining(offer.expiresAt)}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">
                        <Navigation className="h-3 w-3 mr-1" />
                        {t("runner.dashboard.pendingSection.title")}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Button 
                        size="sm" 
                        variant="default"
                        onClick={() => handleAcceptOffer(offer.id)}
                        disabled={acceptOffer.isPending}
                        data-testid={`button-accept-offer-${offer.id}`}
                        className="flex-1"
                      >
                        {t("runner.dashboard.pendingSection.accept")}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleRejectOffer(offer.id)}
                        disabled={rejectOffer.isPending}
                        data-testid={`button-reject-offer-${offer.id}`}
                        className="flex-1"
                      >
                        {t("runner.dashboard.pendingSection.reject")}
                      </Button>
                    </div>
                  </div>
                ))}
                {pendingOffers.length === 0 && (
                  <p className="text-center text-foreground py-2 text-sm">{t("runner.dashboard.pendingSection.noOffers")}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Live Tracking Map */}
      {activeDeliveries.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Live Tracking</h2>
          <MapTracker
            orderId={activeDeliveries[0].id}
            workshop={{ 
              lat: 40.7128, 
              lng: -74.0060, 
              name: t("runner.dashboard.markers.workshop")
            }}
            supplier={{ 
              lat: 40.7589, 
              lng: -73.9851, 
              name: t("runner.dashboard.markers.supplier")
            }}
            runner={{
              lat: 40.7300,
              lng: -73.9950,
              name: user?.firstName || t("runner.dashboard.markers.runner"),
              id: user?.id
            }}
            autoCenter={true}
            height="600px"
          />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription className="text-foreground">Manage your runner activities</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/runner/jobs" data-testid="button-view-all-deliveries">
              <Truck className="h-4 w-4 mr-2" />
              View All Deliveries
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/notifications" data-testid="button-view-notifications">
              View Notifications
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Status Update Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent data-testid="dialog-update-status">
          <DialogHeader>
            <DialogTitle>Update Delivery Status</DialogTitle>
            <DialogDescription>
              Update the status of order #{selectedOrder?.id.slice(0, 8)}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger data-testid="select-status">
                <SelectValue placeholder={t("runner.jobs.statusDialog.selectStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="assigned_runner">Assigned</SelectItem>
                <SelectItem value="picked_up">Picked Up</SelectItem>
                <SelectItem value="delivering">In Transit</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStatusDialogOpen(false)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateStatus}
              disabled={updateStatus.isPending}
              data-testid="button-confirm-update"
            >
              {updateStatus.isPending ? t("runner.jobs.card.updating") : t("runner.jobs.card.updateStatus")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
