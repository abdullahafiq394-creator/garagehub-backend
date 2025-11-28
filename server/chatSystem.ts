import type { Server as SocketIOServer } from "socket.io";
import type { IStorage } from "./storage";
import type { InsertChatMessage } from "@shared/schema";

/**
 * Chat System Module
 * Handles real-time chat functionality between Workshop, Supplier, and Runner
 */
export class ChatSystem {
  private io: SocketIOServer;
  private storage: IStorage;

  constructor(io: SocketIOServer, storage: IStorage) {
    this.io = io;
    this.storage = storage;
  }

  /**
   * Initialize chat event handlers
   */
  initializeHandlers() {
    this.io.on("connection", (socket) => {
      // Get authenticated user from socket session
      const session = (socket.request as any).session;
      const user = session?.passport?.user;
      
      if (!user) {
        console.log(`[ChatSystem] Unauthenticated connection attempt: ${socket.id}`);
        socket.disconnect();
        return;
      }

      const userId = user.claims?.sub;
      console.log(`[ChatSystem] User ${userId} connected: ${socket.id}`);

      // Join order chat room
      socket.on("chat.join", async (data: { orderId: string; userId?: string }) => {
        try {
          // Verify authorization
          const canAccess = await this.storage.canAccessOrderChat(data.orderId, userId);
          if (!canAccess) {
            console.log(`[ChatSystem] Unauthorized join attempt by ${userId} for order ${data.orderId}`);
            socket.emit("chat.error", { message: "Unauthorized access to chat" });
            return;
          }

          const roomName = `order_chat_${data.orderId}`;
          socket.join(roomName);
          console.log(`[ChatSystem] User ${userId} joined room: ${roomName}`);

          // Send chat history
          const messages = await this.storage.getChatMessages(data.orderId);
          socket.emit("chat.history", { orderId: data.orderId, messages });
        } catch (error) {
          console.error("[ChatSystem] Error joining chat:", error);
          socket.emit("chat.error", { message: "Failed to join chat" });
        }
      });

      // Leave order chat room
      socket.on("chat.leave", (data: { orderId: string; userId: string }) => {
        const roomName = `order_chat_${data.orderId}`;
        socket.leave(roomName);
        console.log(`[ChatSystem] User ${data.userId} left room: ${roomName}`);
      });

      // Send message
      socket.on("chat.message", async (data: {
        orderId: string;
        senderId?: string;
        receiverId?: string;
        message: string;
        imageUrl?: string;
      }) => {
        try {
          // Verify authorization
          const canAccess = await this.storage.canAccessOrderChat(data.orderId, userId);
          if (!canAccess) {
            console.log(`[ChatSystem] Unauthorized message attempt by ${userId} for order ${data.orderId}`);
            socket.emit("chat.error", { message: "Unauthorized access to chat" });
            return;
          }

          // Save message to database (use authenticated userId, not client-provided)
          const newMessage: InsertChatMessage = {
            orderId: data.orderId,
            senderId: userId, // Use server-side authenticated userId
            receiverId: data.receiverId,
            message: data.message,
            imageUrl: data.imageUrl,
            isRead: false,
          };

          const savedMessage = await this.storage.createChatMessage(newMessage);

          // Broadcast to room
          const roomName = `order_chat_${data.orderId}`;
          this.io.to(roomName).emit("chat.new_message", savedMessage);

          console.log(`[ChatSystem] Message sent in room ${roomName}`);
        } catch (error) {
          console.error("[ChatSystem] Error sending message:", error);
          socket.emit("chat.error", { message: "Failed to send message" });
        }
      });

      // Mark messages as read
      socket.on("chat.mark_read", async (data: { orderId: string; userId?: string }) => {
        try {
          // Verify authorization
          const canAccess = await this.storage.canAccessOrderChat(data.orderId, userId);
          if (!canAccess) {
            console.log(`[ChatSystem] Unauthorized mark-read attempt by ${userId} for order ${data.orderId}`);
            return;
          }

          await this.storage.markChatMessagesAsRead(data.orderId, userId);
          console.log(`[ChatSystem] Marked messages as read for user ${userId} in order ${data.orderId}`);
        } catch (error) {
          console.error("[ChatSystem] Error marking messages as read:", error);
        }
      });

      // Typing indicator
      socket.on("chat.typing", async (data: { orderId: string; userId?: string; userName?: string }) => {
        try {
          // Verify authorization
          const canAccess = await this.storage.canAccessOrderChat(data.orderId, userId);
          if (!canAccess) {
            console.log(`[ChatSystem] Unauthorized typing attempt by ${userId} for order ${data.orderId}`);
            return;
          }

          const roomName = `order_chat_${data.orderId}`;
          socket.to(roomName).emit("chat.user_typing", {
            userId: userId, // Use server-side authenticated userId
            userName: data.userName || 'User',
          });
        } catch (error) {
          console.error("[ChatSystem] Error broadcasting typing indicator:", error);
        }
      });

      socket.on("disconnect", () => {
        console.log(`[ChatSystem] User disconnected: ${socket.id}`);
      });
    });
  }

  /**
   * Send notification when new message arrives
   */
  async notifyNewMessage(orderId: string, senderId: string, receiverId?: string) {
    const roomName = `order_chat_${orderId}`;
    this.io.to(roomName).emit("chat.notification", {
      orderId,
      senderId,
      receiverId,
    });
  }
}
