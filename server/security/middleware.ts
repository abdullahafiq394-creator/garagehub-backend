import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import { verifyToken, type TokenPayload } from './jwtConfig';
import { isIPBanned } from './rateLimiter';
import { logPermissionDenied, logTokenValidationFailure, logSecurityEvent } from './logger';
import type { UserRole } from '../../shared/schema';

// Extend Express Request type to include JWT user
declare global {
  namespace Express {
    interface Request {
      jwtUser?: TokenPayload;
      requestId?: string;
    }
  }
}

/**
 * Helmet configuration for HTTP header security
 */
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Needed for Vite dev
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "wss:", "ws:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'deny'
  },
  noSniff: true,
  xssFilter: true,
});

/**
 * Middleware to add request ID to all requests
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  req.requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-ID', req.requestId);
  next();
}

/**
 * Middleware to check if IP is banned
 */
export function checkIPBan(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  
  if (isIPBanned(ip)) {
    logSecurityEvent('BLOCKED_REQUEST', null, ip, { 
      reason: 'IP banned due to failed login attempts',
      path: req.path
    });
    return res.status(403).json({ 
      message: 'Access denied. Your IP has been temporarily banned due to suspicious activity.',
      retryAfter: '10 minutes'
    });
  }
  
  next();
}

/**
 * Middleware to verify JWT token
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  
  if (!token) {
    logTokenValidationFailure(ip, 'No token provided');
    return res.status(401).json({ message: 'Access token required' });
  }
  
  try {
    const decoded = verifyToken(token);
    
    // Verify token type
    if (decoded.type !== 'access') {
      logTokenValidationFailure(ip, 'Invalid token type');
      return res.status(401).json({ message: 'Invalid token type' });
    }
    
    req.jwtUser = decoded;
    next();
  } catch (error) {
    logTokenValidationFailure(ip, error instanceof Error ? error.message : 'Token verification failed');
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
}

/**
 * Middleware to require specific role(s)
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.jwtUser) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    
    if (!allowedRoles.includes(req.jwtUser.role)) {
      logPermissionDenied(
        req.jwtUser.userId,
        req.path,
        req.method,
        ip
      );
      return res.status(403).json({ 
        message: 'Insufficient permissions',
        required: allowedRoles,
        current: req.jwtUser.role
      });
    }
    
    next();
  };
}

/**
 * Middleware to require admin role
 */
export const requireAdmin = requireRole('admin');

/**
 * Middleware to require workshop role
 */
export const requireWorkshop = requireRole('workshop', 'admin');

/**
 * Middleware to require supplier role
 */
export const requireSupplier = requireRole('supplier', 'admin');

/**
 * Middleware to require runner role
 */
export const requireRunner = requireRole('runner', 'admin');

/**
 * Middleware to disable X-Powered-By header
 */
export function disablePoweredBy(req: Request, res: Response, next: NextFunction) {
  res.removeHeader('X-Powered-By');
  next();
}

/**
 * Audit logging middleware
 */
export function auditLog(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const userId = req.jwtUser?.userId || null;
  
  // Log sensitive operations
  const sensitiveOperations = ['POST', 'PUT', 'DELETE', 'PATCH'];
  
  if (sensitiveOperations.includes(req.method)) {
    logSecurityEvent('API_REQUEST', userId, ip, {
      method: req.method,
      path: req.path,
      requestId: req.requestId,
      userAgent: req.headers['user-agent']
    });
  }
  
  next();
}
