import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Clock, CheckCircle, XCircle, Truck, ShoppingCart } from "lucide-react";
import { useSocket } from "@/contexts/SocketContext";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import type { SupplierOrder, OrderItem, Part } from "@shared/schema";

interface OrderWithItems extends SupplierOrder {
  items?: (OrderItem & { part?: Part })[];
}

export default function WorkshopOrders() {
  const { socket } = useSocket();
  const { toast } = useToast();
  
  const { data: orders = [], isLoading } = useQuery<OrderWithItems[]>({
    queryKey: ['/api/orders'],
  });

  useEffect(() => {
    if (!socket) return;

    const handleOrderUpdate = (data: {action?: string; orderId?: string; status?: string}) => {
      console.log("[socket.io] Order updated:", data);
      
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      
      if (data.action === 'status_updated') {
        toast({
          title: "Order Updated",
          description: `Order #${data.orderId?.slice(0, 8)} status changed to ${data.status}`,
        });
      }
    };

    socket.on("supplierOrder.updated", handleOrderUpdate);

    return () => {
      socket.off("supplierOrder.updated", handleOrderUpdate);
    };
  }, [socket, toast]);

  const statusConfig: Record<string, { icon: typeof Clock; label: string; variant: "secondary" | "default" | "destructive"; color: string }> = {
    created: { icon: Clock, label: "Created", variant: "secondary" as const, color: "text-yellow-600" },
    accepted: { icon: CheckCircle, label: "Accepted", variant: "default" as const, color: "text-primary" },
    preparing: { icon: Package, label: "Preparing", variant: "default" as const, color: "text-orange-600" },
    assigned_runner: { icon: Package, label: "Assigned Runner", variant: "default" as const, color: "text-purple-600" },
    delivering: { icon: Truck, label: "Delivering", variant: "default" as const, color: "text-indigo-600" },
    delivered: { icon: CheckCircle, label: "Delivered", variant: "secondary" as const, color: "text-green-600" },
    cancelled: { icon: XCircle, label: "Cancelled", variant: "destructive" as const, color: "text-red-600" },
  };

  const activeOrders = orders.filter(o => 
    ['created', 'accepted', 'preparing', 'assigned_runner', 'delivering'].includes(o.status)
  );
  const completedOrders = orders.filter(o => o.status === 'delivered');
  const cancelledOrders = orders.filter(o => o.status === 'cancelled');

  const OrderCard = ({ order }: { order: OrderWithItems }) => {
    const config = statusConfig[order.status];
    const Icon = config.icon;

    return (
      <Card data-testid={`card-order-${order.id}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              <Icon className={`w-4 h-4 ${config.color}`} />
              Order #{order.id.slice(0, 8)}
            </CardTitle>
            <CardDescription className="mt-1">
              {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }) : 'N/A'}
            </CardDescription>
          </div>
          <Badge variant={config.variant} data-testid={`badge-status-${order.id}`}>
            {config.label}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {order.items && order.items.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-muted-foreground">Items</h4>
              {order.items.map(item => (
                <div key={item.id} className="flex items-center justify-between text-sm border-l-2 pl-3" data-testid={`order-item-${item.id}`}>
                  <span data-testid={`text-item-name-${item.id}`}>
                    {item.part?.name || 'Unknown Part'} × {item.quantity}
                  </span>
                  <span className="font-semibold" data-testid={`text-item-price-${item.id}`}>
                    RM {((item as unknown as {priceAtTime?: string}).priceAtTime ? parseFloat((item as unknown as {priceAtTime: string}).priceAtTime) * item.quantity : 0).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2 border-t pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Delivery</span>
              <Badge variant="outline" data-testid={`badge-delivery-${order.id}`}>
                {order.deliveryType === 'runner' ? 'Runner Delivery' : 'Pickup'}
              </Badge>
            </div>
            {order.pickupId && (
              <div className="text-sm">
                <span className="text-muted-foreground">Pickup ID: </span>
                <span className="font-mono font-semibold" data-testid={`text-pickup-id-${order.id}`}>{order.pickupId}</span>
              </div>
            )}
            {order.deliveryAddress && (
              <div className="text-sm">
                <span className="text-muted-foreground">Address: </span>
                <span data-testid={`text-delivery-address-${order.id}`}>{order.deliveryAddress}</span>
              </div>
            )}
            {order.notes && (
              <div className="text-sm">
                <span className="text-muted-foreground">Notes: </span>
                <span className="italic" data-testid={`text-notes-${order.id}`}>{order.notes}</span>
              </div>
            )}
            <div className="flex items-center justify-between font-semibold text-lg pt-2">
              <span>Total</span>
              <span data-testid={`text-total-${order.id}`}>RM {parseFloat(order.totalAmount).toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b p-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-orders-title">My Orders</h1>
          <p className="text-sm text-muted-foreground">Track your marketplace orders</p>
        </div>
        <Link href="/workshop/marketplace">
          <Button data-testid="button-browse-marketplace">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Browse Marketplace
          </Button>
        </Link>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-3" data-testid="tabs-order-filter">
            <TabsTrigger value="active" data-testid="tab-active">
              Active ({activeOrders.length})
            </TabsTrigger>
            <TabsTrigger value="completed" data-testid="tab-completed">
              Completed ({completedOrders.length})
            </TabsTrigger>
            <TabsTrigger value="cancelled" data-testid="tab-cancelled">
              Cancelled ({cancelledOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4 mt-4">
            {activeOrders.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="w-12 h-12 text-muted-foreground opacity-50 mb-4" />
                  <p className="text-muted-foreground mb-4" data-testid="text-no-active-orders">
                    No active orders
                  </p>
                  <Link href="/workshop/marketplace">
                    <Button data-testid="button-start-shopping">
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Start Shopping
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {activeOrders.map(order => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4 mt-4">
            {completedOrders.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle className="w-12 h-12 text-muted-foreground opacity-50 mb-4" />
                  <p className="text-muted-foreground" data-testid="text-no-completed-orders">No completed orders</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {completedOrders.map(order => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="cancelled" className="space-y-4 mt-4">
            {cancelledOrders.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <XCircle className="w-12 h-12 text-muted-foreground opacity-50 mb-4" />
                  <p className="text-muted-foreground" data-testid="text-no-cancelled-orders">No cancelled orders</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {cancelledOrders.map(order => (
                  <OrderCard key={order.id} order={order} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
