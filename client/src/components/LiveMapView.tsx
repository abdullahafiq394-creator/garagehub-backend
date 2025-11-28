import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { useSocket } from '@/hooks/useSocket';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Home, Package, Truck, RefreshCw, MapPin, Map as MapIcon, List } from 'lucide-react';
import { UniversalMap } from './UniversalMap';
import { MapService, type Coordinates } from '@/lib/mapService';

const MALAYSIAN_STATES = [
  "All States",
  "Johor",
  "Kedah", 
  "Kelantan",
  "Melaka",
  "Negeri Sembilan",
  "Pahang",
  "Penang",
  "Perak",
  "Perlis",
  "Sabah",
  "Sarawak",
  "Selangor",
  "Terengganu",
  "Kuala Lumpur",
  "Labuan",
  "Putrajaya"
];

interface Workshop {
  id: string;
  name: string;
  latitude: string | null;
  longitude: string | null;
  state: string;
  city: string;
}

interface Supplier {
  id: string;
  name: string;
  latitude: string | null;
  longitude: string | null;
  state: string;
  city: string;
}

interface Runner {
  id: string;
  firstName: string;
  lastName: string;
  latitude: string | null;
  longitude: string | null;
  state: string;
  city: string;
  status?: string;
}

type ViewMode = 'map' | 'list';

export function LiveMapView() {
  const [selectedState, setSelectedState] = useState("All States");
  const [runnerLocations, setRunnerLocations] = useState<Map<string, { lat: number; lng: number }>>(new Map());
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const { socket } = useSocket();

  const { data: allWorkshops = [], refetch: refetchWorkshops } = useQuery<Workshop[]>({
    queryKey: ['/api/admin/workshops'],
  });

  const { data: allSuppliers = [], refetch: refetchSuppliers } = useQuery<Supplier[]>({
    queryKey: ['/api/admin/suppliers'],
  });

  const { data: allRunners = [], refetch: refetchRunners } = useQuery<Runner[]>({
    queryKey: ['/api/admin/runners'],
  });

  const workshops = selectedState === "All States" 
    ? allWorkshops 
    : allWorkshops.filter(w => w.state === selectedState);

  const suppliers = selectedState === "All States"
    ? allSuppliers
    : allSuppliers.filter(s => s.state === selectedState);

  const runners = selectedState === "All States"
    ? allRunners
    : allRunners.filter(r => r.state === selectedState);

  useEffect(() => {
    if (!socket) return;

    const handleLocationUpdate = (data: { runnerId: string; lat: number; lng: number }) => {
      setRunnerLocations(prev => {
        const updated = new Map(prev);
        updated.set(data.runnerId, { lat: data.lat, lng: data.lng });
        return updated;
      });
    };

    socket.on('runner_location_update', handleLocationUpdate);

    return () => {
      socket.off('runner_location_update', handleLocationUpdate);
    };
  }, [socket]);

  const handleRefresh = () => {
    refetchWorkshops();
    refetchSuppliers();
    refetchRunners();
  };

  const getMapCenter = (): Coordinates => {
    if (selectedState !== "All States") {
      const stateCenters = MapService.getStateCenters();
      return stateCenters[selectedState] || MapService.getMalaysiaCenter();
    }
    return MapService.getMalaysiaCenter();
  };

  const getMapZoom = (): number => {
    return selectedState === "All States" ? 6 : 10;
  };

  const getMapMarkers = () => {
    const markers: Array<{
      id: string;
      position: Coordinates;
      label: string;
      type: 'workshop' | 'supplier' | 'runner';
      isLive?: boolean;
    }> = [];

    workshops.forEach(workshop => {
      if (workshop.latitude && workshop.longitude) {
        markers.push({
          id: `workshop-${workshop.id}`,
          position: { lat: parseFloat(workshop.latitude), lng: parseFloat(workshop.longitude) },
          label: workshop.name,
          type: 'workshop'
        });
      }
    });

    suppliers.forEach(supplier => {
      if (supplier.latitude && supplier.longitude) {
        markers.push({
          id: `supplier-${supplier.id}`,
          position: { lat: parseFloat(supplier.latitude), lng: parseFloat(supplier.longitude) },
          label: supplier.name,
          type: 'supplier'
        });
      }
    });

    runners.forEach(runner => {
      const liveLocation = runnerLocations.get(runner.id);
      if (liveLocation) {
        markers.push({
          id: `runner-${runner.id}`,
          position: liveLocation,
          label: `${runner.firstName} ${runner.lastName}`,
          type: 'runner',
          isLive: true
        });
      } else if (runner.latitude && runner.longitude) {
        markers.push({
          id: `runner-${runner.id}`,
          position: { lat: parseFloat(runner.latitude), lng: parseFloat(runner.longitude) },
          label: `${runner.firstName} ${runner.lastName}`,
          type: 'runner'
        });
      }
    });

    return markers;
  };

  return (
    <div className="space-y-4" data-testid="container-live-map">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          <h2 className="text-lg font-semibold" data-testid="text-title">Live Location Tracking</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={viewMode === 'map' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('map')}
              data-testid="button-view-map"
            >
              <MapIcon className="h-4 w-4 mr-1" />
              Map
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              data-testid="button-view-list"
            >
              <List className="h-4 w-4 mr-1" />
              List
            </Button>
          </div>
          <Select value={selectedState} onValueChange={setSelectedState}>
            <SelectTrigger className="w-[200px]" data-testid="select-state">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MALAYSIAN_STATES.map(state => (
                <SelectItem key={state} value={state} data-testid={`select-option-${state.toLowerCase().replace(/\s/g, '-')}`}>
                  {state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleRefresh} variant="outline" size="icon" data-testid="button-refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-blue-500" />
          <span>Workshops ({workshops.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-orange-500" />
          <span>Suppliers ({suppliers.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-green-500" />
          <span>Runners ({runners.length})</span>
        </div>
      </div>

      {viewMode === 'map' ? (
        <UniversalMap
          center={getMapCenter()}
          zoom={getMapZoom()}
          markers={getMapMarkers()}
          height="500px"
          showProviderToggle={true}
        />
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          <Card data-testid="card-workshops">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Home className="h-4 w-4 text-blue-500" />
                Workshops ({workshops.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-96 overflow-auto">
              {workshops.length === 0 ? (
                <p className="text-sm text-muted-foreground" data-testid="text-no-workshops">No workshops found</p>
              ) : (
                workshops.map((workshop) => (
                  <div key={workshop.id} className="p-3 border rounded-md space-y-1" data-testid={`item-workshop-${workshop.id}`}>
                    <div className="font-medium text-sm">{workshop.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {workshop.city}, {workshop.state}
                    </div>
                    {workshop.latitude && workshop.longitude && (
                      <div className="text-xs text-muted-foreground">
                        {parseFloat(workshop.latitude).toFixed(4)}, {parseFloat(workshop.longitude).toFixed(4)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-suppliers">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4 text-orange-500" />
                Suppliers ({suppliers.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-96 overflow-auto">
              {suppliers.length === 0 ? (
                <p className="text-sm text-muted-foreground" data-testid="text-no-suppliers">No suppliers found</p>
              ) : (
                suppliers.map((supplier) => (
                  <div key={supplier.id} className="p-3 border rounded-md space-y-1" data-testid={`item-supplier-${supplier.id}`}>
                    <div className="font-medium text-sm">{supplier.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {supplier.city}, {supplier.state}
                    </div>
                    {supplier.latitude && supplier.longitude && (
                      <div className="text-xs text-muted-foreground">
                        {parseFloat(supplier.latitude).toFixed(4)}, {parseFloat(supplier.longitude).toFixed(4)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-runners">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Truck className="h-4 w-4 text-green-500" />
                Runners ({runners.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-96 overflow-auto">
              {runners.length === 0 ? (
                <p className="text-sm text-muted-foreground" data-testid="text-no-runners">No runners found</p>
              ) : (
                runners.map((runner) => {
                  const liveLocation = runnerLocations.get(runner.id);
                  return (
                    <div key={runner.id} className="p-3 border rounded-md space-y-1" data-testid={`item-runner-${runner.id}`}>
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-sm">
                          {runner.firstName} {runner.lastName}
                        </div>
                        {runner.status && (
                          <Badge variant={runner.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                            {runner.status}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {runner.city}, {runner.state}
                      </div>
                      {liveLocation ? (
                        <div className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                          <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          Live: {liveLocation.lat.toFixed(4)}, {liveLocation.lng.toFixed(4)}
                        </div>
                      ) : runner.latitude && runner.longitude ? (
                        <div className="text-xs text-muted-foreground">
                          {parseFloat(runner.latitude).toFixed(4)}, {parseFloat(runner.longitude).toFixed(4)}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
