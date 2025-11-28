import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { helmetConfig, requestIdMiddleware, disablePoweredBy, auditLog } from "./security/middleware";
import { apiLimiter } from "./security/rateLimiter";
import { logger } from "./security/logger";
import { startCronJobs } from "./cronJobs";
import { validateLiveSandboxConfig } from "./config/validateLiveSandbox";

// Validate Live Sandbox configuration if enabled
validateLiveSandboxConfig();

const app = express();

// STEP 1: Core Security Layers

// 1.1 Disable X-Powered-By header
app.disable('x-powered-by');
app.use(disablePoweredBy);

// 1.2 Apply Helmet for HTTP header protection
app.use(helmetConfig);

// 1.3 CORS Configuration - Allow all origins for LIVE TESTING
const allowedOrigins = [
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  process.env.FRONTEND_URL || 'https://garagehub.my'
];

app.use(cors({
  origin: (origin, callback) => {
    // LIVE TESTING MODE: Allow ALL origins
    // This enables real users to test from any device/browser
    if (!origin) return callback(null, true);
    
    // In production testing, allow Replit dev URLs
    if (origin && origin.includes('.replit.dev')) {
      return callback(null, true);
    }
    
    // Allow all origins for live testing phase
    // TODO: Restrict to specific domains before final production launch
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposedHeaders: ['X-Request-ID']
}));

// 1.4 Cookie Parser (for refresh tokens)
app.use(cookieParser());

// 1.5 Request ID Middleware (for audit trail)
app.use(requestIdMiddleware);

// 1.6 Body parsers with raw body for webhooks
declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

app.use(express.json({
  limit: '10mb',
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// 1.7 API Rate Limiter (100 requests / 15 minutes)
app.use('/api', apiLimiter);

// 1.8 Audit Logging Middleware
app.use(auditLog);

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Serve uploaded files (Nov 2025: Shopee-style marketplace image uploads)
  app.use('/uploads', express.static('uploads'));

  // Global error handler
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log error with request details
    logger.error('Error occurred', {
      error: message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      requestId: req.requestId,
      ip: req.ip || req.socket.remoteAddress,
    });

    res.status(status).json({ message });
  });

  // Setup Vite in development or serve static in production
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Start server
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    logger.info(`🚀 GarageHub Server started on port ${port}`);
    logger.info('🔒 Security modules active: Helmet, CORS, Rate Limiting, Audit Logging');
    log(`serving on port ${port}`);
    
    // Start cron jobs for automated tasks
    startCronJobs();
    logger.info('⏰ Cron jobs initialized');
  });
})();
