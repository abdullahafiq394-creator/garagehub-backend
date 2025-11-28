import { Server as SocketIOServer } from 'socket.io';
import { globalMetricsEmitter } from './middleware/dbTiming';
import si from 'systeminformation';

let io: SocketIOServer | null = null;
let metricsInterval: NodeJS.Timeout | null = null;

interface MetricsSnapshot {
  timestamp: number;
  requests: {
    total: number;
    perSecond: number;
  };
  latency: {
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
  db: {
    slowQueries: number;
    avgQueryTime: number;
  };
  system: {
    cpu: number;
    memory: number;
  };
  sockets: {
    connected: number;
  };
}

class MetricsCollector {
  private requestCount = 0;
  private requestLatencies: number[] = [];
  private dbQueryTimes: number[] = [];
  private slowQueryCount = 0;
  private lastSnapshot = Date.now();

  constructor() {
    // Listen for DB metrics
    globalMetricsEmitter.on('request-db-metrics', (payload: any) => {
      payload.queries.forEach((q: any) => {
        this.dbQueryTimes.push(q.ms);
        if (q.ms > 100) {
          this.slowQueryCount++;
        }
      });
    });

    // Listen for request metrics
    globalMetricsEmitter.on('request-complete', (latency: number) => {
      this.requestCount++;
      this.requestLatencies.push(latency);
    });
  }

  async getSnapshot(): Promise<MetricsSnapshot> {
    const now = Date.now();
    const timeSinceLastSnapshot = (now - this.lastSnapshot) / 1000;

    // Calculate percentiles
    const sortedLatencies = [...this.requestLatencies].sort((a, b) => a - b);
    const p50 = sortedLatencies[Math.floor(sortedLatencies.length * 0.5)] || 0;
    const p95 = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] || 0;
    const p99 = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)] || 0;
    const avgLatency = sortedLatencies.length > 0
      ? sortedLatencies.reduce((a, b) => a + b, 0) / sortedLatencies.length
      : 0;

    // Calculate avg DB query time
    const avgDbQueryTime = this.dbQueryTimes.length > 0
      ? this.dbQueryTimes.reduce((a, b) => a + b, 0) / this.dbQueryTimes.length
      : 0;

    // Get system metrics
    const [cpuLoad, mem] = await Promise.all([
      si.currentLoad(),
      si.mem()
    ]);

    const snapshot: MetricsSnapshot = {
      timestamp: now,
      requests: {
        total: this.requestCount,
        perSecond: timeSinceLastSnapshot > 0 ? this.requestCount / timeSinceLastSnapshot : 0
      },
      latency: {
        avg: avgLatency,
        p50,
        p95,
        p99
      },
      db: {
        slowQueries: this.slowQueryCount,
        avgQueryTime: avgDbQueryTime
      },
      system: {
        cpu: cpuLoad.currentLoad,
        memory: (mem.used / mem.total) * 100
      },
      sockets: {
        connected: io ? io.engine.clientsCount : 0
      }
    };

    // Reset counters for next snapshot
    this.requestCount = 0;
    this.requestLatencies = [];
    this.dbQueryTimes = [];
    this.slowQueryCount = 0;
    this.lastSnapshot = now;

    return snapshot;
  }
}

const metricsCollector = new MetricsCollector();

export function initializeMetrics(socketServer: SocketIOServer) {
  io = socketServer;

  // Emit metrics snapshot every second
  metricsInterval = setInterval(async () => {
    try {
      const snapshot = await metricsCollector.getSnapshot();
      io?.to('tests').emit('test.metrics', snapshot);
    } catch (error) {
      console.error('[Metrics] Error getting snapshot:', error);
    }
  }, 1000);

  console.log('[Metrics] Real-time metrics emitter initialized');
}

export function stopMetrics() {
  if (metricsInterval) {
    clearInterval(metricsInterval);
    metricsInterval = null;
  }
}

export function emitMetrics(obj: any) {
  io?.to('tests').emit('test.metrics', obj);
}
