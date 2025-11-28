import { AsyncLocalStorage } from 'async_hooks';
import { Request, Response, NextFunction } from 'express';

interface RequestContext {
  recordDbQuery: (sql: string, ms: number) => void;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export function requestContextMiddleware(req: Request, res: Response, next: NextFunction) {
  const context: RequestContext = {
    recordDbQuery: req.recordDbQuery
  };
  
  requestContext.run(context, () => {
    next();
  });
}

export function getRequestContext(): RequestContext | undefined {
  return requestContext.getStore();
}
