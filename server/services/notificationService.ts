import type { Server as SocketIOServer } from "socket.io";
import { storage } from "../storage";
import { emitNotification } from "../socket";
import type { InsertNotification } from "@shared/schema";

/**
 * Notification Service
 * Centralized service for creating and emitting notifications
 */
export class NotificationService {
  private io: SocketIOServer;

  constructor(io: SocketIOServer) {
    this.io = io;
  }

  /**
   * Create a notification and emit it via Socket.IO for real-time updates
   */
  async createAndEmit(notificationData: InsertNotification): Promise<void> {
    try {
      const notification = await storage.createNotification(notificationData);
      
      // Emit to user's notification room for real-time updates
      emitNotification(this.io, notification.userId, notification);
      
      console.log(`[Notification] Created and emitted to user ${notification.userId}: ${notification.title}`);
    } catch (error) {
      console.error("[Notification] Failed to create and emit:", error);
      throw error;
    }
  }

  /**
   * Notify about order updates
   */
  async notifyOrderUpdate(
    userId: string,
    orderId: string,
    status: string,
    message: string
  ): Promise<void> {
    await this.createAndEmit({
      userId,
      title: "Order Update",
      message,
      type: "order_update",
    });
  }

  /**
   * Notify about wallet transactions
   */
  async notifyWalletTransaction(
    userId: string,
    amount: number,
    type: "credit" | "debit",
    description: string
  ): Promise<void> {
    const title = type === "credit" ? "Payment Received" : "Payment Made";
    const message = `${description} - RM ${Math.abs(amount).toFixed(2)}`;
    
    await this.createAndEmit({
      userId,
      title,
      message,
      type: "wallet_transaction",
    });
  }

  /**
   * Notify about delivery updates
   */
  async notifyDeliveryUpdate(
    userId: string,
    orderId: string,
    status: string,
    message: string
  ): Promise<void> {
    await this.createAndEmit({
      userId,
      title: "Delivery Update",
      message,
      type: "delivery_update",
    });
  }

  /**
   * Notify about booking updates
   */
  async notifyBookingUpdate(
    userId: string,
    bookingId: string,
    status: string,
    message: string
  ): Promise<void> {
    await this.createAndEmit({
      userId,
      title: "Booking Update",
      message,
      type: "booking_update",
    });
  }

  /**
   * Notify about new chat messages
   */
  async notifyNewMessage(
    userId: string,
    senderName: string,
    preview: string
  ): Promise<void> {
    await this.createAndEmit({
      userId,
      title: `New message from ${senderName}`,
      message: preview.substring(0, 100),
      type: "chat_message",
    });
  }
}
