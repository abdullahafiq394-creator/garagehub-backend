/**
 * MapService - Abstraction layer for map providers
 * Supports OpenStreetMap (free) and Google Maps (requires API key)
 */

export type MapProvider = 'openstreetmap' | 'google';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface MapMarker {
  id: string;
  position: Coordinates;
  label: string;
  type: 'workshop' | 'supplier' | 'runner';
}

export interface MapConfig {
  provider: MapProvider;
  tileUrl?: string;
  attribution?: string;
  apiKey?: string;
}

const MALAYSIA_CENTER: Coordinates = { lat: 4.2105, lng: 101.9758 };
const MALAYSIA_BOUNDS = {
  north: 7.5,
  south: 0.8,
  east: 119.5,
  west: 99.6
};

export class MapService {
  private static provider: MapProvider = 'openstreetmap';
  private static googleApiKey: string = '';

  /**
   * Calculate distance between two points using Haversine formula
   * Returns distance in kilometers
   */
  static calculateDistance(point1: Coordinates, point2: Coordinates): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(point2.lat - point1.lat);
    const dLng = this.toRad(point2.lng - point1.lng);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(point1.lat)) * Math.cos(this.toRad(point2.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  }

  /**
   * Convert degrees to radians
   */
  private static toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Calculate estimated time of arrival (ETA) in minutes
   * Assumes average speed of 40 km/h in city
   */
  static calculateETA(distance: number): number {
    const averageSpeed = 40; // km/h
    const hours = distance / averageSpeed;
    return Math.round(hours * 60); // Convert to minutes
  }

  /**
   * Find nearest point from a list of candidates
   */
  static findNearest(
    origin: Coordinates,
    candidates: Array<{ id: string; position: Coordinates }>
  ): { id: string; position: Coordinates; distance: number } | null {
    if (candidates.length === 0) return null;

    let nearest = candidates[0];
    let minDistance = this.calculateDistance(origin, candidates[0].position);

    for (let i = 1; i < candidates.length; i++) {
      const distance = this.calculateDistance(origin, candidates[i].position);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = candidates[i];
      }
    }

    return {
      ...nearest,
      distance: minDistance
    };
  }

  /**
   * Get map provider configuration
   */
  static getMapConfig() {
    if (this.provider === 'google') {
      return {
        provider: 'google',
        apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
      };
    }
    
    return {
      provider: 'openstreetmap',
      tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    };
  }

  /**
   * Switch map provider (for future Google Maps integration)
   */
  static setProvider(provider: 'openstreetmap' | 'google') {
    this.provider = provider;
  }

  /**
   * Generate mock coordinates around a center point
   * Useful for testing without real GPS data
   */
  static generateMockLocation(center: Coordinates, radiusKm: number = 5): Coordinates {
    const radiusInDegrees = radiusKm / 111.32; // Approximate conversion
    
    const u = Math.random();
    const v = Math.random();
    const w = radiusInDegrees * Math.sqrt(u);
    const t = 2 * Math.PI * v;
    const x = w * Math.cos(t);
    const y = w * Math.sin(t);

    return {
      lat: center.lat + y,
      lng: center.lng + x / Math.cos(this.toRad(center.lat))
    };
  }

  /**
   * Estimate duration in minutes based on distance
   * Assumes average city driving speed of 40 km/h
   */
  static estimateDuration(distanceKm: number): number {
    const averageSpeed = 40; // km/h in city
    const hours = distanceKm / averageSpeed;
    return Math.round(hours * 60); // Convert to minutes
  }

  /**
   * Generate intermediate route points between two coordinates
   * Useful for displaying route on map
   */
  static generateRoutePoints(start: Coordinates, end: Coordinates, numPoints: number = 10): Coordinates[] {
    const points: Coordinates[] = [start];
    
    for (let i = 1; i < numPoints - 1; i++) {
      const ratio = i / (numPoints - 1);
      const lat = start.lat + (end.lat - start.lat) * ratio;
      const lng = start.lng + (end.lng - start.lng) * ratio;
      
      // Add slight random variation to simulate real roads
      const variation = 0.001 * (Math.random() - 0.5);
      points.push({
        lat: lat + variation,
        lng: lng + variation
      });
    }
    
    points.push(end);
    return points;
  }

  /**
   * Get Malaysia center coordinates
   */
  static getMalaysiaCenter(): Coordinates {
    return MALAYSIA_CENTER;
  }

  /**
   * Get Malaysia bounds for map restriction
   */
  static getMalaysiaBounds() {
    return MALAYSIA_BOUNDS;
  }

  /**
   * Get current map provider
   */
  static getProvider(): MapProvider {
    return this.provider;
  }

  /**
   * Set Google Maps API key
   */
  static setGoogleApiKey(apiKey: string) {
    this.googleApiKey = apiKey;
  }

  /**
   * Check if Google Maps is available (has API key)
   */
  static isGoogleMapsAvailable(): boolean {
    const envKey = typeof import.meta !== 'undefined' 
      ? import.meta.env?.VITE_GOOGLE_MAPS_API_KEY 
      : '';
    return !!(this.googleApiKey || envKey);
  }

  /**
   * Get state center coordinates for Malaysia
   */
  static getStateCenters(): Record<string, Coordinates> {
    return {
      'Johor': { lat: 1.4854, lng: 103.7618 },
      'Kedah': { lat: 6.1184, lng: 100.3685 },
      'Kelantan': { lat: 6.1254, lng: 102.2381 },
      'Melaka': { lat: 2.1896, lng: 102.2501 },
      'Negeri Sembilan': { lat: 2.7258, lng: 101.9424 },
      'Pahang': { lat: 3.8126, lng: 103.3256 },
      'Penang': { lat: 5.4164, lng: 100.3327 },
      'Perak': { lat: 4.5921, lng: 101.0901 },
      'Perlis': { lat: 6.4449, lng: 100.2048 },
      'Sabah': { lat: 5.9788, lng: 116.0753 },
      'Sarawak': { lat: 2.5044, lng: 113.0169 },
      'Selangor': { lat: 3.0738, lng: 101.5183 },
      'Terengganu': { lat: 5.3117, lng: 103.1324 },
      'Kuala Lumpur': { lat: 3.1390, lng: 101.6869 },
      'Labuan': { lat: 5.2831, lng: 115.2308 },
      'Putrajaya': { lat: 2.9264, lng: 101.6964 }
    };
  }
}
