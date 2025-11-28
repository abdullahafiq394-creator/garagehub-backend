import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Custom format for logging
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Define which logs should be printed based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'development' ? 'debug' : 'warn';
};

// Daily rotate file transport for general logs
const fileRotateTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'application-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '7d', // Keep logs for 7 days
  format: format,
});

// Daily rotate file transport for error logs
const errorFileRotateTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  maxSize: '20m',
  maxFiles: '14d', // Keep error logs for 14 days
  format: format,
});

// Daily rotate file transport for security events
const securityFileRotateTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'security-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '30d', // Keep security logs for 30 days
  format: format,
});

// Create the logger
export const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.simple()
      ),
    }),
    fileRotateTransport,
    errorFileRotateTransport,
  ],
});

// Security logger for authentication and authorization events
export const securityLogger = winston.createLogger({
  level: 'info',
  format,
  transports: [
    securityFileRotateTransport,
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.simple()
      ),
    }),
  ],
});

/**
 * Log security event
 */
export function logSecurityEvent(
  event: string,
  userId: string | null,
  ip: string,
  details?: any
) {
  securityLogger.info({
    event,
    userId,
    ip,
    timestamp: new Date().toISOString(),
    ...details
  });
}

/**
 * Log failed login attempt
 */
export function logFailedLogin(email: string, ip: string, reason: string) {
  securityLogger.warn({
    event: 'FAILED_LOGIN',
    email,
    ip,
    reason,
    timestamp: new Date().toISOString()
  });
}

/**
 * Log successful login
 */
export function logSuccessfulLogin(userId: string, email: string, ip: string) {
  securityLogger.info({
    event: 'SUCCESSFUL_LOGIN',
    userId,
    email,
    ip,
    timestamp: new Date().toISOString()
  });
}

/**
 * Log permission denied
 */
export function logPermissionDenied(
  userId: string | null,
  resource: string,
  action: string,
  ip: string
) {
  securityLogger.warn({
    event: 'PERMISSION_DENIED',
    userId,
    resource,
    action,
    ip,
    timestamp: new Date().toISOString()
  });
}

/**
 * Log token validation failure
 */
export function logTokenValidationFailure(ip: string, reason: string) {
  securityLogger.warn({
    event: 'TOKEN_VALIDATION_FAILURE',
    ip,
    reason,
    timestamp: new Date().toISOString()
  });
}

export default logger;
