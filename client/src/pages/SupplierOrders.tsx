import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, Clock, CheckCircle2, XCircle, MapPin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";
import { formatCurrency } from "@/lib/utils";

type Order = {
  id: string;
  orderNumber: string;
  workshopId: string;
  supplierId: string;
  totalAmount: number;
  status: string;
  orderDate: string;
  deliveryType?: string;
  pickupId?: string;
  workshop?: {
    name: string;
    city?: string;
    state?: string;
  };
  items?: Array<{
    partName: string;
    quantity: number;
    price: number;
  }>;
};

export default function SupplierOrders() {
  const [, navigate] = useLocation();

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/supplier/orders"],
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "confirmed":
      case "completed":
        return <CheckCircle2 className="w-4 h-4" />;
      case "cancelled":
        return <XCircle className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
      case "confirmed":
        return "bg-blue-500/20 text-blue-500 border-blue-500/30";
      case "completed":
        return "bg-green-500/20 text-green-500 border-green-500/30";
      case "cancelled":
        return "bg-red-500/20 text-red-500 border-red-500/30";
      default:
        return "bg-muted";
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-4 space-y-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-pulse text-muted-foreground">Loading orders...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6 pb-24 md:pb-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-orbitron">Incoming Orders</h1>
        <p className="text-muted-foreground mt-2">
          Manage orders from workshops
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Orders</CardDescription>
            <CardTitle className="text-3xl font-mono">{orders.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pending</CardDescription>
            <CardTitle className="text-3xl font-mono text-yellow-500">
              {orders.filter(o => o.status === 'pending').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-3xl font-mono text-green-500">
              {orders.filter(o => o.status === 'completed').length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Orders Yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              When workshops place orders for your products, they'll appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id} className="hover-elevate active-elevate-2">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg font-mono">
                        #{order.orderNumber}
                      </CardTitle>
                      <Badge 
                        variant="outline" 
                        className={getStatusColor(order.status)}
                      >
                        <span className="flex items-center gap-1">
                          {getStatusIcon(order.status)}
                          {order.status}
                        </span>
                      </Badge>
                    </div>
                    <CardDescription className="flex items-center gap-2">
                      <span className="font-semibold">{order.workshop?.name || "Unknown Workshop"}</span>
                      {order.workshop?.city && order.workshop?.state && (
                        <span className="flex items-center gap-1 text-xs">
                          <MapPin className="w-3 h-3" />
                          {order.workshop.city}, {order.workshop.state}
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold font-mono text-primary">
                      RM {formatCurrency(order.totalAmount)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {order.orderDate ? formatDistanceToNow(new Date(order.orderDate), { addSuffix: true }) : 'N/A'}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.items && order.items.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Order Items:</div>
                    <div className="space-y-1">
                      {order.items.slice(0, 3).map((item, idx) => (
                        <div 
                          key={idx}
                          className="flex items-center justify-between text-sm p-2 rounded bg-muted/50"
                        >
                          <span className="flex-1">{item.partName}</span>
                          <span className="text-muted-foreground">x{item.quantity}</span>
                          <span className="font-mono ml-4">RM {formatCurrency(item.price)}</span>
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <div className="text-xs text-muted-foreground text-center">
                          +{order.items.length - 3} more items
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {(order.deliveryType || order.pickupId) && (
                  <div className="space-y-1 border-t pt-3">
                    {order.deliveryType && (
                      <div className="text-sm flex items-center justify-between">
                        <span className="text-muted-foreground">Delivery Type:</span>
                        <Badge variant="outline" data-testid={`badge-delivery-${order.id}`}>
                          {order.deliveryType === 'runner' ? 'Runner Delivery' : 'Pickup'}
                        </Badge>
                      </div>
                    )}
                    {order.pickupId && (
                      <div className="text-sm flex items-center justify-between">
                        <span className="text-muted-foreground">Pickup ID:</span>
                        <span className="font-mono font-semibold" data-testid={`text-pickup-id-${order.id}`}>{order.pickupId}</span>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => navigate(`/supplier/orders/${order.id}`)}
                    data-testid={`button-view-order-${order.id}`}
                  >
                    View Details
                  </Button>
                  {order.status === 'pending' && (
                    <>
                      <Button 
                        variant="outline" 
                        size="sm"
                        data-testid={`button-accept-order-${order.id}`}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Accept
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        data-testid={`button-reject-order-${order.id}`}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
