/// <reference types="google.maps" />
import { useEffect, useRef, useState, useCallback } from 'react';
import { MapService, type Coordinates } from '@/lib/mapService';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';

interface MarkerData {
  id: string;
  position: Coordinates;
  label: string;
  type: 'workshop' | 'supplier' | 'runner';
  isLive?: boolean;
}

interface GoogleMapProps {
  center?: Coordinates;
  zoom?: number;
  markers?: MarkerData[];
  routePoints?: Coordinates[];
  height?: string;
  apiKey?: string;
  onMarkerClick?: (marker: MarkerData) => void;
}

declare global {
  interface Window {
    google: typeof google;
    initGoogleMap?: () => void;
  }
}

const markerColors = {
  workshop: '#3B82F6',
  supplier: '#F97316',
  runner: '#22C55E',
};

const markerIcons = {
  workshop: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
  supplier: 'M21 16.5c0-.38-.21-.71-.53-.88l-3.47-1.88V7c0-.55-.45-1-1-1H8c-.55 0-1 .45-1 1v6.74L3.53 15.62c-.32.17-.53.5-.53.88v2c0 .28.22.5.5.5h17c.28 0 .5-.22.5-.5v-2z',
  runner: 'M18 18.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5zm1.5-9H17V12h4.46L19.5 9.5zM6 18.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5zM20 8l3 4v5h-2c0 1.66-1.34 3-3 3s-3-1.34-3-3H9c0 1.66-1.34 3-3 3s-3-1.34-3-3H1V6c0-1.11.89-2 2-2h14v4h3z',
};

let googleMapsScriptLoaded = false;
let googleMapsScriptLoading = false;
const loadCallbacks: (() => void)[] = [];

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (googleMapsScriptLoaded && window.google?.maps) {
      resolve();
      return;
    }

    if (googleMapsScriptLoading) {
      loadCallbacks.push(() => resolve());
      return;
    }

    googleMapsScriptLoading = true;

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      googleMapsScriptLoaded = true;
      googleMapsScriptLoading = false;
      resolve();
      loadCallbacks.forEach(cb => cb());
      loadCallbacks.length = 0;
    };

    script.onerror = () => {
      googleMapsScriptLoading = false;
      reject(new Error('Failed to load Google Maps script'));
    };

    document.head.appendChild(script);
  });
}

export function GoogleMap({
  center,
  zoom = 12,
  markers = [],
  routePoints = [],
  height = '400px',
  apiKey,
  onMarkerClick
}: GoogleMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const effectiveApiKey = apiKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const createCustomMarker = useCallback((type: 'workshop' | 'supplier' | 'runner') => {
    const color = markerColors[type];
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="14" fill="${color}" stroke="white" stroke-width="2"/>
        <g transform="translate(8, 8) scale(0.67)" fill="white">
          <path d="${markerIcons[type]}"/>
        </g>
      </svg>
    `;
    return {
      url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
      scaledSize: new google.maps.Size(32, 32),
      anchor: new google.maps.Point(16, 16),
    };
  }, []);

  useEffect(() => {
    if (!effectiveApiKey) {
      setError('Google Maps API key not configured. Please add VITE_GOOGLE_MAPS_API_KEY to your environment variables.');
      setIsLoading(false);
      return;
    }

    if (!mapContainerRef.current) return;

    const initMap = async () => {
      try {
        await loadGoogleMapsScript(effectiveApiKey);

        if (!mapContainerRef.current || mapRef.current) return;

        const mapCenter = center || MapService.getMalaysiaCenter();

        mapRef.current = new google.maps.Map(mapContainerRef.current, {
          center: { lat: mapCenter.lat, lng: mapCenter.lng },
          zoom: zoom,
          mapTypeControl: true,
          mapTypeControlOptions: {
            style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
            position: google.maps.ControlPosition.TOP_RIGHT,
          },
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }],
            },
          ],
        });

        setIsLoading(false);
      } catch (err) {
        setError('Failed to load Google Maps. Please check your API key.');
        setIsLoading(false);
      }
    };

    initMap();

    return () => {
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
    };
  }, [effectiveApiKey]);

  useEffect(() => {
    if (!mapRef.current || !center) return;
    mapRef.current.setCenter({ lat: center.lat, lng: center.lng });
    mapRef.current.setZoom(zoom);
  }, [center, zoom]);

  useEffect(() => {
    if (!mapRef.current || isLoading) return;

    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    markers.forEach((markerData) => {
      const marker = new google.maps.Marker({
        position: { lat: markerData.position.lat, lng: markerData.position.lng },
        map: mapRef.current!,
        title: markerData.label,
        icon: createCustomMarker(markerData.type),
        animation: markerData.isLive ? google.maps.Animation.BOUNCE : undefined,
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; min-width: 150px;">
            <strong style="font-size: 14px;">${markerData.label}</strong><br/>
            <span style="color: #666; font-size: 12px;">${markerData.type.charAt(0).toUpperCase() + markerData.type.slice(1)}</span><br/>
            <span style="color: #888; font-size: 11px;">${markerData.position.lat.toFixed(6)}, ${markerData.position.lng.toFixed(6)}</span>
            ${markerData.isLive ? '<br/><span style="color: #22C55E; font-size: 11px;">● Live</span>' : ''}
          </div>
        `,
      });

      marker.addListener('click', () => {
        infoWindow.open(mapRef.current, marker);
        if (onMarkerClick) {
          onMarkerClick(markerData);
        }
      });

      markersRef.current.push(marker);
    });

    if (markers.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      markers.forEach(m => {
        bounds.extend({ lat: m.position.lat, lng: m.position.lng });
      });
      mapRef.current.fitBounds(bounds, 50);
    }
  }, [markers, isLoading, createCustomMarker, onMarkerClick]);

  useEffect(() => {
    if (!mapRef.current || isLoading) return;

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    if (routePoints.length >= 2) {
      polylineRef.current = new google.maps.Polyline({
        path: routePoints.map(p => ({ lat: p.lat, lng: p.lng })),
        geodesic: true,
        strokeColor: '#3B82F6',
        strokeOpacity: 0.7,
        strokeWeight: 4,
      });
      polylineRef.current.setMap(mapRef.current);
    }
  }, [routePoints, isLoading]);

  if (error) {
    return (
      <div className="relative rounded-lg overflow-hidden border" style={{ height }}>
        <Alert className="m-4" variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="relative rounded-lg overflow-hidden border" data-testid="container-google-map">
      {isLoading && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10"
          style={{ height }}
        >
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading Google Maps...</span>
        </div>
      )}
      <div 
        ref={mapContainerRef} 
        style={{ height, width: '100%' }}
        data-testid="google-map-canvas"
      />
    </div>
  );
}
