import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { logSecurityEvent } from './logger';

// Store for tracking failed login attempts per IP
const loginAttempts = new Map<string, { count: number; firstAttempt: number; banned: boolean }>();

// Clean up old entries every hour
setInterval(() => {
  const now = Date.now();
  const tenMinutes = 10 * 60 * 1000;
  
  const entries = Array.from(loginAttempts.entries());
  for (const [ip, data] of entries) {
    if (now - data.firstAttempt > tenMinutes && !data.banned) {
      loginAttempts.delete(ip);
    }
  }
}, 60 * 60 * 1000);

/**
 * Check if IP is banned
 */
export function isIPBanned(ip: string): boolean {
  const attempt = loginAttempts.get(ip);
  if (!attempt) return false;
  
  const now = Date.now();
  const tenMinutes = 10 * 60 * 1000;
  
  // Reset ban after 10 minutes
  if (attempt.banned && now - attempt.firstAttempt > tenMinutes) {
    loginAttempts.delete(ip);
    return false;
  }
  
  return attempt.banned;
}

/**
 * Record failed login attempt
 */
export function recordFailedLogin(ip: string): boolean {
  const now = Date.now();
  const tenMinutes = 10 * 60 * 1000;
  const attempt = loginAttempts.get(ip);
  
  if (!attempt) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now, banned: false });
    return false;
  }
  
  // Reset if more than 10 minutes since first attempt
  if (now - attempt.firstAttempt > tenMinutes) {
    loginAttempts.set(ip, { count: 1, firstAttempt: now, banned: false });
    return false;
  }
  
  // Increment attempt count
  attempt.count++;
  
  // Ban after 5 failed attempts
  if (attempt.count >= 5) {
    attempt.banned = true;
    logSecurityEvent('IP_BANNED', null, ip, { reason: 'Too many failed login attempts', attempts: attempt.count });
    return true;
  }
  
  return false;
}

/**
 * Reset failed login attempts for IP (e.g., after successful login)
 */
export function resetFailedLogins(ip: string): void {
  loginAttempts.delete(ip);
}

/**
 * Rate limiter for authentication endpoints (strict)
 * Note: Much higher limit in development/test environment to allow integration testing
 * Production: 5 requests per 15 minutes
 * Dev/Test: 200 requests per 15 minutes
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 200, // Very high limit for dev/test
  message: 'Too many authentication attempts from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    logSecurityEvent('RATE_LIMIT_EXCEEDED', null, ip, { 
      path: req.path,
      limit: 'auth'
    });
    res.status(429).json({ 
      message: 'Too many authentication attempts from this IP, please try again later',
      retryAfter: '15 minutes'
    });
  }
});

/**
 * Rate limiter for general API endpoints
 * Production: 100 requests per 15 minutes
 * Dev/Test: 500 requests per 15 minutes
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 500, // Higher limit for dev/test
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for order creation endpoints
 * Production: 20 requests per hour
 * Dev/Test: 100 requests per hour
 */
export const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: process.env.NODE_ENV === 'production' ? 20 : 100, // Higher limit for dev/test
  message: 'Too many order requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    logSecurityEvent('RATE_LIMIT_EXCEEDED', null, ip, { 
      path: req.path,
      limit: 'order'
    });
    res.status(429).json({ 
      message: 'Too many order requests from this IP, please try again later',
      retryAfter: '1 hour'
    });
  }
});

/**
 * Rate limiter for file uploads
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 uploads per hour
  message: 'Too many file uploads from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});
