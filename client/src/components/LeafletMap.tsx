import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapService, type Coordinates, type MapProvider } from '@/lib/mapService';

const workshopIcon = L.divIcon({
  className: 'custom-marker',
  html: `<div style="background: #3B82F6; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const supplierIcon = L.divIcon({
  className: 'custom-marker',
  html: `<div style="background: #F97316; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M21 16.5c0-.38-.21-.71-.53-.88l-3.47-1.88V7c0-.55-.45-1-1-1H8c-.55 0-1 .45-1 1v6.74L3.53 15.62c-.32.17-.53.5-.53.88v2c0 .28.22.5.5.5h17c.28 0 .5-.22.5-.5v-2zM12 2L4 5v3c0 5.55 3.84 10.74 8 12 4.16-1.26 8-6.45 8-12V5l-8-3z"/></svg>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const runnerIcon = L.divIcon({
  className: 'custom-marker runner-marker',
  html: `<div style="background: #22C55E; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); animation: pulse 2s infinite;">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M18 18.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5zm1.5-9H17V12h4.46L19.5 9.5zM6 18.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5zM20 8l3 4v5h-2c0 1.66-1.34 3-3 3s-3-1.34-3-3H9c0 1.66-1.34 3-3 3s-3-1.34-3-3H1V6c0-1.11.89-2 2-2h14v4h3z"/></svg>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

interface MarkerData {
  id: string;
  position: Coordinates;
  label: string;
  type: 'workshop' | 'supplier' | 'runner';
  isLive?: boolean;
}

interface LeafletMapProps {
  center?: Coordinates;
  zoom?: number;
  markers?: MarkerData[];
  routePoints?: Coordinates[];
  height?: string;
  showControls?: boolean;
  onMarkerClick?: (marker: MarkerData) => void;
}

export function LeafletMap({
  center,
  zoom = 12,
  markers = [],
  routePoints = [],
  height = '400px',
  showControls = true,
  onMarkerClick
}: LeafletMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const mapCenter = center || MapService.getMalaysiaCenter();
    
    const map = L.map(mapContainerRef.current, {
      center: [mapCenter.lat, mapCenter.lng],
      zoom: zoom,
      zoomControl: showControls,
      attributionControl: true,
    });

    // LeafletMap always uses OpenStreetMap tiles
    // Google Maps provider should use the GoogleMap component instead
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setIsMapReady(true);

    return () => {
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
      setIsMapReady(false);
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !center) return;
    mapRef.current.setView([center.lat, center.lng], zoom);
  }, [center, zoom]);

  useEffect(() => {
    if (!markersLayerRef.current || !isMapReady) return;

    markersLayerRef.current.clearLayers();

    markers.forEach((marker) => {
      let icon: L.DivIcon;
      switch (marker.type) {
        case 'workshop':
          icon = workshopIcon;
          break;
        case 'supplier':
          icon = supplierIcon;
          break;
        case 'runner':
          icon = runnerIcon;
          break;
        default:
          icon = workshopIcon;
      }

      const leafletMarker = L.marker([marker.position.lat, marker.position.lng], { icon })
        .bindPopup(`
          <div style="min-width: 150px;">
            <strong>${marker.label}</strong><br/>
            <small style="color: #666;">${marker.type.charAt(0).toUpperCase() + marker.type.slice(1)}</small><br/>
            <small style="color: #888;">${marker.position.lat.toFixed(6)}, ${marker.position.lng.toFixed(6)}</small>
            ${marker.isLive ? '<br/><span style="color: #22C55E; font-size: 11px;">&#9679; Live</span>' : ''}
          </div>
        `)
        .addTo(markersLayerRef.current!);

      if (onMarkerClick) {
        leafletMarker.on('click', () => onMarkerClick(marker));
      }
    });
  }, [markers, isMapReady, onMarkerClick]);

  useEffect(() => {
    if (!mapRef.current || !isMapReady) return;

    if (routeLayerRef.current) {
      mapRef.current.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }

    if (routePoints.length >= 2) {
      const latLngs = routePoints.map(p => [p.lat, p.lng] as L.LatLngExpression);
      routeLayerRef.current = L.polyline(latLngs, {
        color: '#3B82F6',
        weight: 4,
        opacity: 0.7,
        dashArray: '10, 10',
      }).addTo(mapRef.current);
    }
  }, [routePoints, isMapReady]);

  useEffect(() => {
    if (!mapRef.current || !isMapReady || markers.length === 0) return;

    if (markers.length > 1) {
      const bounds = L.latLngBounds(markers.map(m => [m.position.lat, m.position.lng]));
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [markers, isMapReady]);

  return (
    <div className="relative rounded-lg overflow-hidden border" data-testid="container-leaflet-map">
      <div 
        ref={mapContainerRef} 
        style={{ height, width: '100%' }}
        data-testid="leaflet-map-canvas"
      />
      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); }
          100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }
        .runner-marker > div {
          animation: pulse 2s infinite;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 8px;
        }
        .leaflet-popup-content {
          margin: 12px;
        }
      `}</style>
    </div>
  );
}
