import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useOrders } from "@/hooks/api/useOrders";
import { MapTracker } from "@/components/MapTracker";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Navigation, Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function RunnerLiveMap() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Fetch all orders
  const { data: allOrders, isLoading } = useOrders(null);

  // Filter active deliveries for this runner
  const activeDeliveries = allOrders?.filter(o => 
    o.runnerId === user?.id && 
    ['assigned_runner', 'picked_up', 'delivering'].includes(o.status)
  ) || [];

  // Auto-select first active delivery
  useEffect(() => {
    if (activeDeliveries.length > 0 && !selectedOrderId) {
      setSelectedOrderId(activeDeliveries[0].id);
    }
  }, [activeDeliveries, selectedOrderId]);

  // Get current location from browser geolocation
  useEffect(() => {
    console.log('[RunnerLiveMap] Initializing geolocation');
    if (navigator.geolocation) {
      console.log('[RunnerLiveMap] Geolocation API available, requesting position');
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          console.log('[RunnerLiveMap] Position received:', position.coords);
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('[RunnerLiveMap] Geolocation error:', error.message, error.code);
          // Default to a fallback location (e.g., Kuala Lumpur)
          console.log('[RunnerLiveMap] Using fallback location: KL');
          setCurrentLocation({
            lat: 3.139,
            lng: 101.6869,
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );

      return () => {
        console.log('[RunnerLiveMap] Clearing geolocation watch');
        navigator.geolocation.clearWatch(watchId);
      };
    } else {
      // Fallback location
      console.log('[RunnerLiveMap] Geolocation API not available, using fallback: KL');
      setCurrentLocation({
        lat: 3.139,
        lng: 101.6869,
      });
    }
  }, []);

  const selectedOrder = activeDeliveries.find(o => o.id === selectedOrderId);

  if (isLoading) {
    return (
      <div className="p-2 space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  return (
    <div className="p-2 space-y-2">
      <div className="mb-1">
        <h1 className="text-xl font-bold" data-testid="text-page-title">{t("runner.liveMap.title")}</h1>
        <p className="text-foreground text-xs">{t("runner.liveMap.subtitle")}</p>
      </div>

      {activeDeliveries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <MapPin className="h-10 w-10 text-foreground mb-3" />
            <p className="text-foreground text-sm" data-testid="text-no-active-deliveries">
              {t("runner.liveMap.noActiveDeliveries")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Active Delivery Selector */}
          {activeDeliveries.length > 1 && (
            <Card>
              <CardHeader className="pb-2 pt-3">
                <CardTitle className="text-base">{t("runner.liveMap.selectDelivery")}</CardTitle>
                <CardDescription className="text-foreground text-xs">{t("runner.liveMap.selectDeliveryDesc")}</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={selectedOrderId || undefined} onValueChange={setSelectedOrderId}>
                  <SelectTrigger data-testid="select-active-delivery">
                    <SelectValue placeholder={t("runner.liveMap.selectDeliveryPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {activeDeliveries.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        Order #{order.id.slice(0, 8)} - {order.status.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}

          {/* Delivery Info */}
          {selectedOrder && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle data-testid="text-selected-order-id">
                      Order #{selectedOrder.id.slice(0, 8)}
                    </CardTitle>
                    <CardDescription data-testid="text-selected-order-amount">
                      RM {parseFloat(selectedOrder.totalAmount || '0').toFixed(2)}
                    </CardDescription>
                  </div>
                  <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20" data-testid="badge-delivery-status">
                    <span className="flex items-center gap-1">
                      <Navigation className="h-3 w-3" />
                      {selectedOrder.status.replace('_', ' ')}
                    </span>
                  </Badge>
                </div>
              </CardHeader>
            </Card>
          )}

          {/* Map Display */}
          {currentLocation && selectedOrder && (
            <MapTracker
              orderId={selectedOrder.id}
              runner={{
                lat: currentLocation.lat,
                lng: currentLocation.lng,
                name: user?.email || 'Runner',
                id: user?.id,
              }}
              autoCenter={true}
              height="600px"
            />
          )}

          {!currentLocation && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Clock className="h-10 w-10 text-foreground mb-3 animate-spin" />
                <p className="text-foreground text-sm" data-testid="text-loading-location">
                  {t("runner.liveMap.loadingLocation")}
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
