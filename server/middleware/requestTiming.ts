import { Request, Response, NextFunction } from 'express';
import { globalMetricsEmitter } from './dbTiming';

export function requestTimingMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  // On response finish, calculate latency and emit
  res.on('finish', () => {
    const latency = Date.now() - startTime;
    globalMetricsEmitter.emit('request-complete', latency);
  });
  
  next();
}
