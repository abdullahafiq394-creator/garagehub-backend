/**
 * Domain-specific errors for GarageHub system
 * Used for QR code verification, order management, and delivery flows
 */

export class OrderNotFoundError extends Error {
  constructor(orderId: string) {
    super(`Order not found: ${orderId}`);
    this.name = 'OrderNotFoundError';
  }
}

export class QRNotFoundError extends Error {
  constructor(orderId: string) {
    super(`QR code not found for order: ${orderId}`);
    this.name = 'QRNotFoundError';
  }
}

export class QRExpiredError extends Error {
  constructor(orderId: string, expiresAt: Date) {
    super(`QR code expired for order: ${orderId} at ${expiresAt.toISOString()}`);
    this.name = 'QRExpiredError';
  }
}

export class QRAlreadyScannedError extends Error {
  constructor(orderId: string, scannedAt: Date) {
    super(`QR code already scanned for order: ${orderId} at ${scannedAt.toISOString()}`);
    this.name = 'QRAlreadyScannedError';
  }
}

// Discriminated union for QR-related errors
export type QRError = QRNotFoundError | QRExpiredError | QRAlreadyScannedError;
