import { useState } from 'react';
import { LeafletMap } from './LeafletMap';
import { GoogleMap } from './GoogleMap';
import { MapService, type Coordinates, type MapProvider } from '@/lib/mapService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Map, Globe } from 'lucide-react';

interface MarkerData {
  id: string;
  position: Coordinates;
  label: string;
  type: 'workshop' | 'supplier' | 'runner';
  isLive?: boolean;
}

interface UniversalMapProps {
  center?: Coordinates;
  zoom?: number;
  markers?: MarkerData[];
  routePoints?: Coordinates[];
  height?: string;
  showProviderToggle?: boolean;
  defaultProvider?: MapProvider;
  onMarkerClick?: (marker: MarkerData) => void;
}

export function UniversalMap({
  center,
  zoom = 12,
  markers = [],
  routePoints = [],
  height = '400px',
  showProviderToggle = true,
  defaultProvider = 'openstreetmap',
  onMarkerClick
}: UniversalMapProps) {
  const [provider, setProvider] = useState<MapProvider>(defaultProvider);
  const googleMapsAvailable = MapService.isGoogleMapsAvailable();

  const handleProviderChange = (newProvider: MapProvider) => {
    setProvider(newProvider);
    MapService.setProvider(newProvider);
  };

  return (
    <div className="space-y-2" data-testid="container-universal-map">
      {showProviderToggle && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant={provider === 'openstreetmap' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleProviderChange('openstreetmap')}
              data-testid="button-provider-osm"
            >
              <Map className="h-4 w-4 mr-1" />
              OpenStreetMap
            </Button>
            <Button
              variant={provider === 'google' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleProviderChange('google')}
              disabled={!googleMapsAvailable}
              data-testid="button-provider-google"
            >
              <Globe className="h-4 w-4 mr-1" />
              Google Maps
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {provider === 'openstreetmap' ? 'Free - No API Key' : 'Requires API Key'}
            </Badge>
            {!googleMapsAvailable && provider !== 'google' && (
              <Badge variant="secondary" className="text-xs">
                Add VITE_GOOGLE_MAPS_API_KEY to enable Google Maps
              </Badge>
            )}
          </div>
        </div>
      )}

      {provider === 'openstreetmap' ? (
        <LeafletMap
          center={center}
          zoom={zoom}
          markers={markers}
          routePoints={routePoints}
          height={height}
          onMarkerClick={onMarkerClick}
        />
      ) : (
        <GoogleMap
          center={center}
          zoom={zoom}
          markers={markers}
          routePoints={routePoints}
          height={height}
          onMarkerClick={onMarkerClick}
        />
      )}
    </div>
  );
}
