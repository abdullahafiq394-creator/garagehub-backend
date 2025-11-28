import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { getRequestContext } from './middleware/requestContext';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create pool
const rawPool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Wrap pool.query to measure actual query execution time
const originalQuery = rawPool.query.bind(rawPool);
rawPool.query = async function(queryTextOrConfig: any, values?: any) {
  const startTime = Date.now();
  
  try {
    // Execute the actual query
    const result = await originalQuery(queryTextOrConfig, values);
    
    // Measure duration
    const duration = Date.now() - startTime;
    
    // Get query text for logging
    const queryText = typeof queryTextOrConfig === 'string' 
      ? queryTextOrConfig 
      : queryTextOrConfig?.text || 'unknown';
    
    // Try to get request context and record query timing
    const context = getRequestContext();
    if (context) {
      const truncatedQuery = queryText.length > 200 
        ? queryText.substring(0, 200) + '...'
        : queryText;
      context.recordDbQuery(truncatedQuery, duration);
    }
    
    return result;
  } catch (error) {
    // Still measure duration even on error
    const duration = Date.now() - startTime;
    const queryText = typeof queryTextOrConfig === 'string' 
      ? queryTextOrConfig 
      : queryTextOrConfig?.text || 'unknown';
    
    const context = getRequestContext();
    if (context) {
      const truncatedQuery = queryText.length > 200 
        ? queryText.substring(0, 200) + '...'
        : queryText;
      context.recordDbQuery(truncatedQuery, duration);
    }
    
    throw error;
  }
};

export const pool = rawPool;
export const db = drizzle({ client: pool, schema });
