import jwt, { type SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import type { User } from '@shared/schema';

// Generate RSA key pair for JWT signing (RS256)
// In production, these should be stored securely and loaded from environment
const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

// Token configuration
export const JWT_CONFIG = {
  ACCESS_TOKEN_EXPIRY: '15m',  // 15 minutes (enterprise security requirement)
  REFRESH_TOKEN_EXPIRY: '7d',   // 7 days
  ALGORITHM: 'RS256' as const,
  ISSUER: 'GarageHub',
  AUDIENCE: 'GarageHub-Users'
};

export interface TokenPayload {
  userId: string;
  role: User['role'];
  email: string;
  type: 'access' | 'refresh';
}

/**
 * Generate access token (15 min expiry, RS256)
 */
export function generateAccessToken(user: Pick<User, 'id' | 'role' | 'email'>): string {
  const payload: TokenPayload = {
    userId: user.id,
    role: user.role,
    email: user.email!,
    type: 'access'
  };

  const options: SignOptions = {
    algorithm: JWT_CONFIG.ALGORITHM,
    expiresIn: JWT_CONFIG.ACCESS_TOKEN_EXPIRY as any,
    issuer: JWT_CONFIG.ISSUER,
    audience: JWT_CONFIG.AUDIENCE
  };

  return jwt.sign(payload, privateKey, options);
}

/**
 * Generate refresh token (7 days expiry, RS256)
 */
export function generateRefreshToken(user: Pick<User, 'id' | 'role' | 'email'>): string {
  const payload: TokenPayload = {
    userId: user.id,
    role: user.role,
    email: user.email!,
    type: 'refresh'
  };

  const options: SignOptions = {
    algorithm: JWT_CONFIG.ALGORITHM,
    expiresIn: JWT_CONFIG.REFRESH_TOKEN_EXPIRY as any,
    issuer: JWT_CONFIG.ISSUER,
    audience: JWT_CONFIG.AUDIENCE
  };

  return jwt.sign(payload, privateKey, options);
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, publicKey, {
      algorithms: [JWT_CONFIG.ALGORITHM],
      issuer: JWT_CONFIG.ISSUER,
      audience: JWT_CONFIG.AUDIENCE
    }) as TokenPayload;

    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Generate both access and refresh tokens
 */
export function generateTokenPair(user: Pick<User, 'id' | 'role' | 'email'>) {
  return {
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user)
  };
}

/**
 * Get public key for token verification (can be shared)
 */
export function getPublicKey(): string {
  return publicKey;
}
