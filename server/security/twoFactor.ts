import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';

/**
 * Generate 2FA secret for user
 */
export function generateTOTPSecret(userEmail: string): {
  secret: string;
  qrCodeUrl: string;
} {
  const secret = speakeasy.generateSecret({
    name: `GarageHub (${userEmail})`,
    issuer: 'GarageHub',
    length: 32
  });

  return {
    secret: secret.base32,
    qrCodeUrl: secret.otpauth_url || ''
  };
}

/**
 * Generate QR code image (base64) for 2FA setup
 */
export async function generateQRCode(otpauthUrl: string): Promise<string> {
  try {
    return await QRCode.toDataURL(otpauthUrl);
  } catch (error) {
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Verify TOTP code
 */
export function verifyTOTP(secret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2 // Allow 2 time-steps before/after for clock skew
  });
}

/**
 * Generate backup codes for 2FA recovery
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4, 8)}`);
  }
  
  return codes;
}

/**
 * Hash backup code for storage
 */
export function hashBackupCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

/**
 * Verify backup code
 */
export function verifyBackupCode(code: string, hashedCodes: string[]): boolean {
  const hashedInput = hashBackupCode(code);
  return hashedCodes.includes(hashedInput);
}
