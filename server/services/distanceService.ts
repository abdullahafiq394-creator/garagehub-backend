/**
 * Distance Calculation Service
 * Uses Haversine formula to calculate distance between two coordinates
 */

interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param point1 First coordinate point
 * @param point2 Second coordinate point
 * @returns Distance in kilometers
 */
export function calculateDistance(point1: Coordinates, point2: Coordinates): number {
  const R = 6371; // Earth's radius in kilometers
  
  const lat1 = toRadians(point1.latitude);
  const lat2 = toRadians(point2.latitude);
  const deltaLat = toRadians(point2.latitude - point1.latitude);
  const deltaLon = toRadians(point2.longitude - point1.longitude);
  
  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  const distance = R * c;
  
  // Round to 2 decimal places
  return Math.round(distance * 100) / 100;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate delivery charge based on distance and item count
 * Formula: (RM3 × total_items) + (RM0.80 × distance_km)
 * @param itemCount Total number of items
 * @param distanceKm Distance in kilometers
 * @returns Delivery charge in RM
 */
export function calculateDeliveryCharge(itemCount: number, distanceKm: number): number {
  const baseCharge = 3.00 * itemCount;
  const distanceCharge = 0.80 * distanceKm;
  const total = baseCharge + distanceCharge;
  
  // Round to 2 decimal places
  return Math.round(total * 100) / 100;
}
