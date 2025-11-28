import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOrders, useUpdateOrderStatus } from "@/hooks/api/useOrders";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Package, Clock, CheckCircle, XCircle, Truck, MapPin } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function RunnerJobs() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<string>("active");
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [newStatus, setNewStatus] = useState<string>("");

  // Fetch all orders
  const { data: allOrders, isLoading } = useOrders(null);

  // Available jobs (no runner assigned yet)
  const availableJobs = allOrders?.filter(o => 
    !o.runnerId && 
    ['accepted', 'preparing'].includes(o.status)
  ) || [];

  // Active deliveries (assigned to this runner)
  const activeDeliveries = allOrders?.filter(o => 
    o.runnerId === user?.id &&
    ['assigned_runner', 'picked_up', 'delivering'].includes(o.status)
  ) || [];

  // Completed deliveries (assigned to this runner)
  const completedDeliveries = allOrders?.filter(o => 
    o.runnerId === user?.id &&
    ['delivered', 'cancelled'].includes(o.status)
  ) || [];

  // Mutations
  const updateStatus = useUpdateOrderStatus();

  const acceptJobMutation = useMutation({
    mutationFn: async (orderId: string) => {
      console.log('[RunnerJobs] Accepting job:', orderId, 'for runner:', user?.id);
      try {
        const result = await apiRequest(`/api/orders/${orderId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            runnerId: user?.id,
            status: 'assigned_runner'
          }),
        });
        console.log('[RunnerJobs] Accept job result:', result);
        return result;
      } catch (err: any) {
        console.error('[RunnerJobs] Accept job error details:', {
          message: err.message,
          stack: err.stack,
          error: err
        });
        throw err;
      }
    },
    onSuccess: () => {
      console.log('[RunnerJobs] Job accepted successfully');
      queryClient.invalidateQueries({ queryKey: ['/api/orders', null] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders/available'] });
      toast({
        title: t("runner.jobs.toasts.jobAccepted"),
        description: t("runner.jobs.toasts.jobAcceptedDesc"),
      });
    },
    onError: (error: any) => {
      console.error('[RunnerJobs] Failed to accept job:', error);
      const errorMessage = error?.message || t("runner.jobs.toasts.jobAcceptFailed");
      toast({
        variant: "destructive",
        title: t("runner.jobs.toasts.updateFailed"),
        description: t("runner.jobs.toasts.jobAcceptFailed"),
      });
    },
  });

  const openStatusDialog = (order: any) => {
    console.log('[RunnerJobs] Opening status dialog for order:', order.id);
    setSelectedOrder(order);
    setNewStatus(order.status);
    setStatusDialogOpen(true);
  };

  const handleUpdateStatus = async () => {
    console.log('[RunnerJobs] handleUpdateStatus called', { selectedOrder: selectedOrder?.id, newStatus });
    
    if (!selectedOrder || !newStatus) {
      console.log('[RunnerJobs] Early return - missing data', { selectedOrder: !!selectedOrder, newStatus });
      toast({
        variant: "destructive",
        title: t("runner.jobs.toasts.error"),
        description: t("runner.jobs.toasts.selectStatusError"),
      });
      return;
    }

    console.log('[RunnerJobs] Calling mutation with:', { id: selectedOrder.id, status: newStatus });
    try {
      await updateStatus.mutateAsync({ id: selectedOrder.id, status: newStatus });
      console.log('[RunnerJobs] Mutation successful');
      toast({
        title: t("runner.jobs.toasts.statusUpdated"),
        description: `${t("runner.jobs.toasts.statusUpdatedDesc")} ${newStatus}`,
      });
      setStatusDialogOpen(false);
    } catch (error) {
      console.error('[RunnerJobs] Mutation failed:', error);
      toast({
        variant: "destructive",
        title: t("runner.jobs.toasts.updateFailed"),
        description: t("runner.jobs.toasts.updateFailedDesc"),
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned_runner': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'picked_up': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'delivering': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'delivered': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'cancelled': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'assigned_runner': return <Clock className="h-4 w-4" />;
      case 'picked_up': return <Package className="h-4 w-4" />;
      case 'delivering': return <Truck className="h-4 w-4" />;
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="p-2 space-y-2">
        <Skeleton className="h-6 w-48" />
        <div className="grid gap-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 space-y-2">
      <div className="mb-1">
        <h1 className="text-xl font-bold" data-testid="text-page-title">{t("runner.jobs.title")}</h1>
        <p className="text-foreground text-xs">{t("runner.jobs.subtitle")}</p>
      </div>

      <Tabs value={viewMode} onValueChange={setViewMode} data-testid="tabs-view-mode">
        <TabsList>
          <TabsTrigger value="active" data-testid="tab-active">
            {t("runner.jobs.tabs.active")} ({activeDeliveries.length})
          </TabsTrigger>
          <TabsTrigger value="available" data-testid="tab-available">
            {t("runner.jobs.tabs.available")} ({availableJobs.length})
          </TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed">
            {t("runner.jobs.tabs.completed")}
          </TabsTrigger>
        </TabsList>

        {/* Active Deliveries Tab */}
        <TabsContent value="active" className="mt-3 space-y-2">
          <Card>
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-base">{t("runner.jobs.activeTab.title")}</CardTitle>
              <CardDescription className="text-foreground text-xs">{t("runner.jobs.activeTab.desc")}</CardDescription>
            </CardHeader>
          </Card>

          {activeDeliveries.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Truck className="h-10 w-10 text-foreground mb-3" />
                <p className="text-foreground text-sm" data-testid="text-empty-active">
                  {t("runner.jobs.activeTab.empty")}
                </p>
              </CardContent>
            </Card>
          ) : (
            activeDeliveries.map((order: any) => (
              <Card key={order.id} data-testid={`card-order-${order.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-lg" data-testid={`text-order-id-${order.id}`}>
                          DEL-{order.id.slice(0, 3).toUpperCase()}
                        </CardTitle>
                        <Badge className={getStatusColor(order.status)} data-testid={`badge-status-${order.id}`}>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(order.status)}
                            {order.status === 'assigned_runner' ? 'Assigned Runner' : order.status.replace('_', ' ')}
                          </span>
                        </Badge>
                      </div>
                      <div className="text-sm space-y-1">
                        <p className="text-foreground font-medium">
                          {t("runner.jobs.card.from")}: {order.supplier?.name || 'Supplier'}
                        </p>
                        <p className="text-foreground font-medium">
                          {t("runner.jobs.card.to")}: {order.workshop?.name || 'Workshop'}
                        </p>
                        <p className="text-foreground text-xs text-xs flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {order.distance || '5.2'} km
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => openStatusDialog(order)}
                      disabled={updateStatus.isPending}
                      data-testid={`button-update-status-${order.id}`}
                    >
                      {t("runner.jobs.card.updateStatus")}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <p className="text-foreground text-xs mb-1">{t("runner.jobs.card.items")}</p>
                      <p className="font-semibold text-foreground" data-testid={`text-items-${order.id}`}>
                        {order.items?.length || 0} {t("runner.jobs.card.itemsCount")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-foreground text-xs mb-1">{t("runner.jobs.card.earnings")}</p>
                      <p className="font-bold text-lg text-primary" data-testid={`text-amount-${order.id}`}>
                        RM {parseFloat(order.deliveryFee || '20.00').toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Available Jobs Tab */}
        <TabsContent value="available" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("runner.jobs.availableTab.title")}</CardTitle>
              <CardDescription className="text-foreground text-xs">{t("runner.jobs.availableTab.desc")}</CardDescription>
            </CardHeader>
          </Card>

          {availableJobs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="h-12 w-12 text-foreground mb-4" />
                <p className="text-foreground text-xs" data-testid="text-empty-available">
                  {t("runner.jobs.availableTab.empty")}
                </p>
              </CardContent>
            </Card>
          ) : (
            availableJobs.map((order: any) => (
              <Card key={order.id} data-testid={`card-job-${order.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-lg" data-testid={`text-job-id-${order.id}`}>
                        DEL-{order.id.slice(0, 3).toUpperCase()}
                      </CardTitle>
                      <div className="text-sm space-y-1">
                        <p className="text-foreground font-medium">
                          {t("runner.jobs.card.from")}: {order.supplier?.name || 'Spare Parts Central'}
                        </p>
                        <p className="text-foreground font-medium">
                          {t("runner.jobs.card.to")}: {order.workshop?.name || 'Mega Auto Service'}
                        </p>
                        <p className="text-foreground text-xs text-xs flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {order.distance || '3.2'} km
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => {
                        console.log('🔴 BUTTON CLICKED! Order ID:', order.id);
                        acceptJobMutation.mutate(order.id);
                      }}
                      disabled={acceptJobMutation.isPending}
                      data-testid={`button-accept-job-${order.id}`}
                      className="shrink-0"
                      size="default"
                    >
                      {acceptJobMutation.isPending ? t("runner.jobs.availableTab.accepting") : t("runner.jobs.availableTab.acceptJob")}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <p className="text-foreground text-xs mb-1">{t("runner.jobs.card.items")}</p>
                      <p className="font-semibold text-foreground">
                        {order.items?.length || 0} {t("runner.jobs.card.itemsCount")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-foreground text-xs mb-1">{t("runner.jobs.availableTab.youllEarn")}</p>
                      <p className="font-bold text-lg text-primary" data-testid={`text-fee-${order.id}`}>
                        RM {parseFloat(order.deliveryFee || '20.00').toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Completed Tab */}
        <TabsContent value="completed" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("runner.jobs.completedTab.title")}</CardTitle>
              <CardDescription className="text-foreground text-xs">{t("runner.jobs.completedTab.desc")}</CardDescription>
            </CardHeader>
          </Card>

          {completedDeliveries.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle className="h-12 w-12 text-foreground mb-4" />
                <p className="text-foreground text-xs" data-testid="text-empty-completed">
                  {t("runner.jobs.completedTab.empty")}
                </p>
              </CardContent>
            </Card>
          ) : (
            completedDeliveries.map((order: any) => (
              <Card key={order.id} data-testid={`card-completed-${order.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-lg">
                          DEL-{order.id.slice(0, 3).toUpperCase()}
                        </CardTitle>
                        <Badge className={getStatusColor(order.status)}>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(order.status)}
                            {order.status}
                          </span>
                        </Badge>
                      </div>
                      <p className="text-foreground text-xs text-sm">
                        {order.createdAt ? format(new Date(order.createdAt), 'MMM dd, yyyy HH:mm') : 'N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-foreground text-xs text-xs mb-1">{t("runner.jobs.completedTab.earned")}</p>
                      <p className="font-bold text-lg text-foreground">
                        RM {parseFloat(order.deliveryFee || '20.00').toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Status Update Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent data-testid="dialog-update-status">
          <DialogHeader>
            <DialogTitle>{t("runner.jobs.statusDialog.title")}</DialogTitle>
            <DialogDescription>
              {t("runner.jobs.statusDialog.desc")}{selectedOrder?.id.slice(0, 8)}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger data-testid="select-new-status">
                <SelectValue placeholder={t("runner.jobs.statusDialog.selectStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="assigned_runner">{t("runner.jobs.statuses.assignedRunner")}</SelectItem>
                <SelectItem value="picked_up">{t("runner.jobs.statuses.pickedUp")}</SelectItem>
                <SelectItem value="delivering">{t("runner.jobs.statuses.delivering")}</SelectItem>
                <SelectItem value="delivered">{t("runner.jobs.statuses.delivered")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)} data-testid="button-cancel-update">
              {t("runner.jobs.statusDialog.cancel")}
            </Button>
            <Button 
              onClick={handleUpdateStatus} 
              disabled={updateStatus.isPending}
              data-testid="button-confirm-update"
            >
              {updateStatus.isPending ? t("runner.jobs.card.updating") : t("runner.jobs.statusDialog.update")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
