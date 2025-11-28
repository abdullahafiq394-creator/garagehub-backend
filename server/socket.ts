import { Server as SocketIOServer } from "socket.io";
import type { Server } from "http";
import { ChatSystem } from "./chatSystem";
import { storage } from "./storage";
import { getSession } from "./replitAuth";

export function setupSocketIO(httpServer: Server) {
  const sessionMiddleware = getSession();
  
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Add session middleware to Socket.io
  io.engine.use(sessionMiddleware);

  // Initialize chat system
  const chatSystem = new ChatSystem(io, storage);
  chatSystem.initializeHandlers();

  // Initialize mock location service and start auto-updates
  let mockLocationService: any = null;
  import('./mockLocationService').then(module => {
    mockLocationService = module.mockLocationService;
    
    // Start broadcasting runner locations every 10 seconds
    mockLocationService.startAutoUpdate((runners: any[]) => {
      runners.forEach(runner => {
        if (runner.assignedOrderId) {
          // Broadcast to order-specific room
          io.to(`order.${runner.assignedOrderId}`).emit('runner_location_update', {
            orderId: runner.assignedOrderId,
            location: runner.currentLocation,
            runnerId: runner.id,
          });
        }
      });
    });

    console.log('[MockLocationService] Auto-update initialized with Socket.io');
  });

  io.on("connection", (socket) => {
    console.log(`[socket.io] Client connected: ${socket.id}`);

    // Auto-join user-scoped rooms based on session (not handshake.auth which is untrusted)
    const session = (socket.request as any).session;
    if (session?.passport?.user) {
      // Safe extraction: handle both Replit auth (claims.sub) and local auth (id) and legacy (string)
      const user = session.passport.user;
      const userId = typeof user === 'string' ? user : (user.claims?.sub ?? user.id);
      
      // Auto-join customer and user notification rooms
      socket.join(`customer:${userId}`);
      socket.join(`user.${userId}`);
      console.log(`[socket.io] User auto-joined rooms: customer:${userId}, user.${userId}`);
    } else {
      console.warn(`[socket.io] Unauthenticated connection attempt, user-scoped rooms not joined`);
    }

    // Join wallet room for real-time balance updates (server-enforced userId from session)
    socket.on("join_wallet_room", () => {
      const session = (socket.request as any).session;
      if (session?.passport?.user) {
        // Safe extraction: handle both Replit auth (claims.sub) and local auth (id) and legacy (string)
        const user = session.passport.user;
        const userId = typeof user === 'string' ? user : (user.claims?.sub ?? user.id);
        socket.join(`wallet:${userId}`);
        console.log(`[socket.io] User joined wallet room: wallet:${userId}`);
      } else {
        console.warn(`[socket.io] Unauthenticated wallet room join attempt`);
      }
    });

    // Leave wallet room (server-enforced userId from session)
    socket.on("leave_wallet_room", () => {
      const session = (socket.request as any).session;
      if (session?.passport?.user) {
        // Safe extraction: handle both Replit auth (claims.sub) and local auth (id) and legacy (string)
        const user = session.passport.user;
        const userId = typeof user === 'string' ? user : (user.claims?.sub ?? user.id);
        socket.leave(`wallet:${userId}`);
        console.log(`[socket.io] User left wallet room: wallet:${userId}`);
      }
    });

    // Join workshop-specific room
    socket.on("join.workshop", (workshopId: string) => {
      socket.join(`workshop.${workshopId}`);
      console.log(`[socket.io] Client joined workshop room: ${workshopId}`);
    });

    // Runner location update - room-scoped only
    socket.on("runner.location", (data: { runnerId: string; lat: number; lng: number; orderId?: string }) => {
      console.log(`[socket.io] Runner location update:`, data);
      // Emit to order-specific room only (not global broadcast)
      if (data.orderId) {
        io.to(`order.${data.orderId}`).emit("delivery.location", data);
      }
      // Emit to runner-specific room (for runner's own tracking)
      io.to(`runner.${data.runnerId}`).emit("runner.location", data);
    });

    // Join room for specific order/booking tracking
    socket.on("track.order", (orderId: string) => {
      socket.join(`order.${orderId}`);
      console.log(`[socket.io] Client joined order tracking: ${orderId}`);
    });

    // Leave order tracking room
    socket.on("untrack.order", (orderId: string) => {
      socket.leave(`order.${orderId}`);
      console.log(`[socket.io] Client left order tracking: ${orderId}`);
    });

    // Secured room join handler - only allow specific room patterns
    socket.on("join_room", (roomName: string) => {
      // SECURITY: Block access to sensitive user-scoped rooms (wallet, user, customer)
      if (roomName.startsWith("wallet:") || roomName.startsWith("user.") || roomName.startsWith("customer:")) {
        console.warn(`[socket.io] Blocked unauthorized join attempt to protected room: ${roomName}`);
        return;
      }
      
      // Allow joining workshop, shop, and order rooms
      if (roomName.startsWith("workshop.") || roomName.startsWith("shop:") || roomName.startsWith("order.")) {
        socket.join(roomName);
        console.log(`[socket.io] Client joined room: ${roomName}`);
      } else {
        console.warn(`[socket.io] Blocked join to unknown room pattern: ${roomName}`);
      }
    });

    // Secured room leave handler - only allow specific room patterns
    socket.on("leave_room", (roomName: string) => {
      // Only allow leaving rooms we allowed joining
      if (roomName.startsWith("workshop.") || roomName.startsWith("shop:") || roomName.startsWith("order.")) {
        socket.leave(roomName);
        console.log(`[socket.io] Client left room: ${roomName}`);
      }
    });

    socket.on("disconnect", () => {
      console.log(`[socket.io] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

// Emit helpers for backend to use - now require explicit room targeting
export function emitBookingUpdated(io: SocketIOServer, roomId: string, bookingId: string, data: any) {
  // Emit to specific room only (e.g., customer.${customerId} or workshop.${workshopId})
  io.to(roomId).emit("booking.updated", { bookingId, ...data });
}

export function emitWorkOrderUpdated(io: SocketIOServer, roomId: string, workOrderId: string, data: any) {
  // Emit to specific room only (e.g., workshop.${workshopId})
  io.to(roomId).emit("workorder.updated", { workOrderId, ...data });
}

export function emitSupplierOrderUpdated(io: SocketIOServer, roomId: string, orderId: string, data: any) {
  // Emit to specific room only (e.g., workshop.${workshopId} or supplier.${supplierId})
  io.to(roomId).emit("supplierOrder.updated", { orderId, ...data });
}

export function emitDeliveryUpdated(io: SocketIOServer, roomId: string, deliveryId: string, data: any) {
  // Emit to specific room only (e.g., runner.${runnerId} or workshop.${workshopId})
  io.to(roomId).emit("delivery.updated", { deliveryId, ...data });
  // Also emit to specific order room if orderId is provided
  if (data.orderId) {
    io.to(`order.${data.orderId}`).emit("delivery.location", data);
  }
}

export function emitNotification(io: SocketIOServer, userId: string, notification: any) {
  // Emit to user-specific room only
  io.to(`user.${userId}`).emit("notification", notification);
}

// Notify customer about job updates (real-time progress tracking)
export function notifyCustomer(io: SocketIOServer, jobId: string, customerUserId: string, data: any) {
  io.to(`customer:${customerUserId}`).emit("job_update", { jobId, ...data });
}

// Emit wallet balance update to user's wallet room
export function emitWalletBalanceUpdate(io: SocketIOServer, userId: string, newBalance: number) {
  io.to(`wallet:${userId}`).emit("wallet_balance_update", newBalance);
  console.log(`[socket.io] Wallet balance update emitted to wallet:${userId} - RM${newBalance.toFixed(2)}`);
}
