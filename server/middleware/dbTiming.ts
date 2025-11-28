import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';

export const globalMetricsEmitter = new EventEmitter();

interface DbQueryRecord {
  sql: string;
  ms: number;
  time: number;
}

declare global {
  namespace Express {
    interface Request {
      _dbQueryTimes: DbQueryRecord[];
      recordDbQuery: (sql: string, ms: number) => void;
    }
  }
}

function dateString(): string {
  return new Date().toISOString().split('T')[0];
}

function ensureLogsDir() {
  const logsDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
}

export function dbTimingMiddleware(req: Request, res: Response, next: NextFunction) {
  req._dbQueryTimes = [];
  
  // Helper to record DB query timing
  req.recordDbQuery = (sql: string, ms: number) => {
    const record: DbQueryRecord = {
      sql,
      ms,
      time: Date.now()
    };
    
    req._dbQueryTimes.push(record);
    
    // Log slow queries (>100ms)
    if (ms > 100) {
      ensureLogsDir();
      const logPath = path.join(process.cwd(), 'logs', `db-slow-queries-${dateString()}.log`);
      const logEntry = JSON.stringify({
        sql,
        ms,
        req: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
      }) + '\n';
      
      fs.appendFileSync(logPath, logEntry);
    }
  };
  
  // On response finish, emit metrics
  res.on('finish', () => {
    if (req._dbQueryTimes.length > 0) {
      const totalDbTime = req._dbQueryTimes.reduce((sum, q) => sum + q.ms, 0);
      const payload = {
        path: req.path,
        method: req.method,
        queries: req._dbQueryTimes,
        totalQueries: req._dbQueryTimes.length,
        totalDbTime,
        timestamp: Date.now()
      };
      
      globalMetricsEmitter.emit('request-db-metrics', payload);
    }
  });
  
  next();
}
