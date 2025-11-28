import { db } from "../db";
import { supplierCodeSequences } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

/**
 * ProductCodeService - Generates sequential garagehubCode for products per supplier
 * Shopee-style marketplace requirement: Each supplier has independent code sequences (#001, #002, etc.)
 */
export class ProductCodeService {
  /**
   * Get next sequence number for a supplier (atomic with row-level locking)
   * @param supplierId - Supplier UUID
   * @param tx - Optional Drizzle transaction (for composing multi-step writes)
   * @returns Next sequence number (1, 2, 3, ...)
   */
  static async getNextSeqForSupplier(
    supplierId: string,
    tx?: NodePgDatabase | any
  ): Promise<number> {
    const database = tx || db;

    // Atomic upsert: INSERT...ON CONFLICT DO UPDATE RETURNING (handles both first insert and concurrent updates)
    // This ensures no race conditions even when multiple transactions try to initialize the same supplier's sequence
    const result = await database
      .insert(supplierCodeSequences)
      .values({
        supplierId,
        lastCode: 1, // First product gets #001
      })
      .onConflictDoUpdate({
        target: supplierCodeSequences.supplierId,
        set: {
          lastCode: sql`${supplierCodeSequences.lastCode} + 1`, // Increment existing
        },
      })
      .returning();

    // Return the UPDATED lastCode value (which is the new sequence number)
    return result[0].lastCode;
  }

  /**
   * Format sequence number as garagehubCode
   * @param seq - Sequence number (1, 2, 3, ...)
   * @param width - Padding width (default: 3 for #001, #002, etc.)
   * @returns Formatted code like '#001', '#002', '#999'
   */
  static formatShortCode(seq: number, width: number = 3): string {
    // Handle overflow gracefully (if seq > 999, widen padding dynamically)
    const actualWidth = Math.max(width, seq.toString().length);
    return `#${seq.toString().padStart(actualWidth, '0')}`;
  }

  /**
   * Generate next garagehubCode for a supplier (combines getNextSeq + format)
   * @param supplierId - Supplier UUID
   * @param tx - Optional Drizzle transaction
   * @returns Formatted code like '#001'
   */
  static async generateCodeForSupplier(
    supplierId: string,
    tx?: NodePgDatabase | any
  ): Promise<string> {
    const seq = await this.getNextSeqForSupplier(supplierId, tx);
    return this.formatShortCode(seq);
  }
}

// Export singleton instance for convenience
export const productCodeService = ProductCodeService;
