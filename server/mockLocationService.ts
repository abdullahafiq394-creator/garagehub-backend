/**
 * Mock Location Service
 * Generates realistic runner locations for testing without real GPS
 */

interface Coordinates {
  lat: number;
  lng: number;
}

interface MockRunner {
  id: string;
  name: string;
  currentLocation: Coordinates;
  isActive: boolean;
  assignedOrderId?: string;
}

class MockLocationService {
  private mockRunners: Map<string, MockRunner> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;

  // Default center points for major cities (can be customized)
  private cityCenter: Coordinates = { lat: 40.7128, lng: -74.0060 }; // NYC

  constructor() {
    this.initializeMockRunners();
  }

  /**
   * Initialize mock runners with random locations
   */
  private initializeMockRunners() {
    const runnerNames = [
      'John Runner',
      'Sarah Express',
      'Mike Delivery',
      'Lisa Fast',
      'Tom Quick'
    ];

    runnerNames.forEach((name, index) => {
      const runnerId = `mock-runner-${index + 1}`;
      this.mockRunners.set(runnerId, {
        id: runnerId,
        name,
        currentLocation: this.generateRandomLocation(this.cityCenter, 10),
        isActive: true,
      });
    });
  }

  /**
   * Generate random location around a center point
   */
  private generateRandomLocation(center: Coordinates, radiusKm: number): Coordinates {
    const radiusInDegrees = radiusKm / 111.32;
    
    const u = Math.random();
    const v = Math.random();
    const w = radiusInDegrees * Math.sqrt(u);
    const t = 2 * Math.PI * v;
    const x = w * Math.cos(t);
    const y = w * Math.sin(t);

    return {
      lat: center.lat + y,
      lng: center.lng + x / Math.cos((center.lat * Math.PI) / 180)
    };
  }

  /**
   * Calculate distance using Haversine formula (in km)
   */
  calculateDistance(point1: Coordinates, point2: Coordinates): number {
    const R = 6371;
    const dLat = this.toRad(point2.lat - point1.lat);
    const dLng = this.toRad(point2.lng - point1.lng);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(point1.lat)) * Math.cos(this.toRad(point2.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Find nearest available runner to a location
   */
  findNearestRunner(location: Coordinates, maxDistanceKm: number = 10): MockRunner | null {
    let nearestRunner: MockRunner | null = null;
    let minDistance = maxDistanceKm;

    const runners = Array.from(this.mockRunners.values());
    for (const runner of runners) {
      if (runner.isActive && !runner.assignedOrderId) {
        const distance = this.calculateDistance(location, runner.currentLocation);
        if (distance < minDistance) {
          minDistance = distance;
          nearestRunner = runner;
        }
      }
    }

    return nearestRunner;
  }

  /**
   * Assign runner to an order
   */
  assignRunner(runnerId: string, orderId: string): boolean {
    const runner = this.mockRunners.get(runnerId);
    if (runner && runner.isActive && !runner.assignedOrderId) {
      runner.assignedOrderId = orderId;
      return true;
    }
    return false;
  }

  /**
   * Unassign runner from order (when delivery complete)
   */
  unassignRunner(runnerId: string): void {
    const runner = this.mockRunners.get(runnerId);
    if (runner) {
      runner.assignedOrderId = undefined;
    }
  }

  /**
   * Get runner current location
   */
  getRunnerLocation(runnerId: string): Coordinates | null {
    const runner = this.mockRunners.get(runnerId);
    return runner ? runner.currentLocation : null;
  }

  /**
   * Update runner location (simulate movement)
   */
  updateRunnerLocation(runnerId: string, destination: Coordinates): void {
    const runner = this.mockRunners.get(runnerId);
    if (!runner) return;

    // Move runner closer to destination (simulate realistic movement)
    const currentLoc = runner.currentLocation;
    const distance = this.calculateDistance(currentLoc, destination);

    if (distance < 0.1) {
      // Close enough, set to exact destination
      runner.currentLocation = destination;
    } else {
      // Move 10% of the way towards destination
      const progress = 0.1;
      runner.currentLocation = {
        lat: currentLoc.lat + (destination.lat - currentLoc.lat) * progress,
        lng: currentLoc.lng + (destination.lng - currentLoc.lng) * progress,
      };
    }
  }

  /**
   * Simulate random movement for all active runners
   */
  simulateRandomMovement(): void {
    const runners = Array.from(this.mockRunners.values());
    for (const runner of runners) {
      if (runner.isActive) {
        // Small random movement (0.001 degrees ≈ 100 meters)
        runner.currentLocation = {
          lat: runner.currentLocation.lat + (Math.random() - 0.5) * 0.002,
          lng: runner.currentLocation.lng + (Math.random() - 0.5) * 0.002,
        };
      }
    }
  }

  /**
   * Get all runners
   */
  getAllRunners(): MockRunner[] {
    return Array.from(this.mockRunners.values());
  }

  /**
   * Get available runners (not assigned)
   */
  getAvailableRunners(): MockRunner[] {
    return Array.from(this.mockRunners.values()).filter(
      r => r.isActive && !r.assignedOrderId
    );
  }

  /**
   * Start auto-update service (simulates GPS updates every 10 seconds)
   */
  startAutoUpdate(callback: (runners: MockRunner[]) => void): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(() => {
      this.simulateRandomMovement();
      callback(Array.from(this.mockRunners.values()));
    }, 10000); // 10 seconds

    console.log('[MockLocationService] Auto-update started (10s interval)');
  }

  /**
   * Stop auto-update service
   */
  stopAutoUpdate(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      console.log('[MockLocationService] Auto-update stopped');
    }
  }

  /**
   * Set city center for mock data generation
   */
  setCityCenter(center: Coordinates): void {
    this.cityCenter = center;
    // Reinitialize runners around new center
    this.initializeMockRunners();
  }
}

export const mockLocationService = new MockLocationService();
