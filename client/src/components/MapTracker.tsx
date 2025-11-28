import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapService, type Coordinates } from '@/lib/mapService';
import { useSocket } from '@/hooks/useSocket';
import { Package, Home, Truck, MapPin, Navigation } from 'lucide-react';
import { UniversalMap } from './UniversalMap';

interface MapTrackerProps {
  orderId?: string;
  workshop?: Coordinates & { name?: string };
  supplier?: Coordinates & { name?: string };
  runner?: Coordinates & { name?: string; id?: string };
  autoCenter?: boolean;
  height?: string;
}

export function MapTracker({
  orderId,
  workshop,
  supplier,
  runner,
  autoCenter = true,
  height = "400px"
}: MapTrackerProps) {
  const [runnerLocation, setRunnerLocation] = useState<Coordinates | null>(
    runner ? { lat: runner.lat, lng: runner.lng } : null
  );
  const [routePoints, setRoutePoints] = useState<Coordinates[]>([]);
  const [estimatedTime, setEstimatedTime] = useState<number>(0);
  const [distance, setDistance] = useState<number>(0);
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket || !runner?.id) return;

    const handleLocationUpdate = (data: { runnerId: string; lat: number; lng: number }) => {
      if (data.runnerId === runner.id) {
        const newLocation = { lat: data.lat, lng: data.lng };
        setRunnerLocation(newLocation);
        
        if (workshop) {
          const dist = MapService.calculateDistance(newLocation, workshop);
          setDistance(dist);
          setEstimatedTime(MapService.estimateDuration(dist));
        }
      }
    };

    socket.on('runner_location_update', handleLocationUpdate);

    return () => {
      socket.off('runner_location_update', handleLocationUpdate);
    };
  }, [socket, runner?.id, workshop]);

  useEffect(() => {
    if (runnerLocation && workshop) {
      const route = MapService.generateRoutePoints(runnerLocation, workshop);
      setRoutePoints(route);
      
      const dist = MapService.calculateDistance(runnerLocation, workshop);
      setDistance(dist);
      setEstimatedTime(MapService.estimateDuration(dist));
    }
  }, [runnerLocation, workshop]);

  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${Math.round(minutes)} min`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const formatDistance = (km: number): string => {
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km.toFixed(1)} km`;
  };

  const getMapMarkers = () => {
    const markers: Array<{
      id: string;
      position: Coordinates;
      label: string;
      type: 'workshop' | 'supplier' | 'runner';
      isLive?: boolean;
    }> = [];

    if (workshop) {
      markers.push({
        id: 'workshop',
        position: { lat: workshop.lat, lng: workshop.lng },
        label: workshop.name || 'Workshop',
        type: 'workshop'
      });
    }

    if (supplier) {
      markers.push({
        id: 'supplier',
        position: { lat: supplier.lat, lng: supplier.lng },
        label: supplier.name || 'Supplier',
        type: 'supplier'
      });
    }

    if (runnerLocation && runner) {
      markers.push({
        id: 'runner',
        position: runnerLocation,
        label: runner.name || 'Runner',
        type: 'runner',
        isLive: true
      });
    }

    return markers;
  };

  const getMapCenter = (): Coordinates | undefined => {
    if (runnerLocation) return runnerLocation;
    if (workshop) return { lat: workshop.lat, lng: workshop.lng };
    if (supplier) return { lat: supplier.lat, lng: supplier.lng };
    return undefined;
  };

  return (
    <Card className="w-full" data-testid="container-map-tracker">
      <CardHeader>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Delivery Tracking
          </CardTitle>
          {distance > 0 && (
            <div className="flex items-center gap-4 text-sm">
              <Badge variant="outline" className="gap-1">
                <Navigation className="h-3 w-3" />
                {formatDistance(distance)}
              </Badge>
              {estimatedTime > 0 && (
                <Badge variant="outline">
                  ETA: {formatTime(estimatedTime)}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <UniversalMap
          center={getMapCenter()}
          zoom={14}
          markers={getMapMarkers()}
          routePoints={routePoints}
          height={height}
          showProviderToggle={true}
        />

        <div className="grid md:grid-cols-3 gap-4">
          {workshop && (
            <div className="p-4 border rounded-md space-y-2" data-testid="location-workshop">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <Home className="h-4 w-4" />
                <span className="font-semibold text-sm">Workshop</span>
              </div>
              <div className="text-sm font-medium">{workshop.name || "Workshop Location"}</div>
              <div className="text-xs text-muted-foreground font-mono">
                {workshop.lat.toFixed(6)}, {workshop.lng.toFixed(6)}
              </div>
            </div>
          )}

          {supplier && (
            <div className="p-4 border rounded-md space-y-2" data-testid="location-supplier">
              <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                <Package className="h-4 w-4" />
                <span className="font-semibold text-sm">Supplier</span>
              </div>
              <div className="text-sm font-medium">{supplier.name || "Supplier Location"}</div>
              <div className="text-xs text-muted-foreground font-mono">
                {supplier.lat.toFixed(6)}, {supplier.lng.toFixed(6)}
              </div>
            </div>
          )}

          {runner && runnerLocation && (
            <div className="p-4 border rounded-md space-y-2" data-testid="location-runner">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <Truck className="h-4 w-4" />
                <span className="font-semibold text-sm">Runner</span>
                <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              </div>
              <div className="text-sm font-medium">{runner.name || "Runner"}</div>
              <div className="text-xs text-muted-foreground font-mono">
                {runnerLocation.lat.toFixed(6)}, {runnerLocation.lng.toFixed(6)}
              </div>
            </div>
          )}
        </div>

        {routePoints.length > 0 && (
          <div className="p-4 bg-muted/30 rounded-md space-y-2" data-testid="route-info">
            <div className="text-sm font-medium">Route Information</div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Total Distance</div>
                <div className="font-semibold">{formatDistance(distance)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Est. Time</div>
                <div className="font-semibold">{formatTime(estimatedTime)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Route Points</div>
                <div className="font-semibold">{routePoints.length}</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
