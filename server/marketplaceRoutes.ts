import { Router } from "express";
import multer from "multer";
import { db } from "./db";
import { suppliers, parts, chatMessages, users } from "@shared/schema";
import { eq, and, like, sql, desc, asc, or } from "drizzle-orm";
import { isAuthenticated } from "./replitAuth";
import type { Request, Response } from "express";
import { storage } from "./storage";

const router = Router();
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB limit

// Brand catalog
const BRANDS = ['Perodua', 'Proton', 'Toyota', 'Honda', 'Nissan', 'Mitsubishi', 'Mazda', 'BMW', 'Mercedes', 'VW', 'Hyundai', 'Kia'];

// Category catalog
const CATEGORIES = ['Engine', 'Gearbox', 'Body', 'Suspension', 'Electrical', 'Cooling', 'Brakes', 'Lubricant', 'Battery', 'Tyre', 'Tools', 'Accessories', 'Halfcut'];

// GET /api/marketplace/catalog/brands
router.get("/catalog/brands", (req: Request, res: Response) => {
  res.json(BRANDS);
});

// GET /api/marketplace/catalog/categories
router.get("/catalog/categories", (req: Request, res: Response) => {
  res.json(CATEGORIES);
});

// GET /api/marketplace/suppliers - List suppliers with filters
router.get("/suppliers", async (req: Request, res: Response) => {
  try {
    const { type, state, q } = req.query;
    
    let conditions = [];
    
    if (type && (type === 'OEM' || type === 'HALFCUT' || type === 'Halfcut')) {
      const supplierType = type === 'HALFCUT' ? 'Halfcut' : type as 'OEM' | 'Halfcut';
      conditions.push(eq(suppliers.supplierType, supplierType));
    }
    
    if (state && typeof state === 'string') {
      conditions.push(eq(suppliers.state, state as any));
    }
    
    if (q && typeof q === 'string') {
      conditions.push(
        or(
          like(suppliers.name, `%${q}%`),
          like(suppliers.city, `%${q}%`)
        )!
      );
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    const results = await db
      .select()
      .from(suppliers)
      .where(whereClause)
      .orderBy(desc(suppliers.rating));
    
    res.json(results);
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    res.status(500).json({ message: "Failed to fetch suppliers" });
  }
});

// GET /api/marketplace/suppliers/:id - Get supplier detail
router.get("/suppliers/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const [supplier] = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.id, id));
    
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }
    
    // Get product count and categories
    const productData = await db
      .select({
        count: sql<number>`count(*)`,
        category: parts.category,
      })
      .from(parts)
      .where(eq(parts.supplierId, id))
      .groupBy(parts.category);
    
    const productCount = productData.reduce((sum, item) => sum + Number(item.count), 0);
    const categories = productData.map(item => item.category);
    
    res.json({
      ...supplier,
      productCount,
      categories,
    });
  } catch (error) {
    console.error("Error fetching supplier:", error);
    res.status(500).json({ message: "Failed to fetch supplier" });
  }
});

// GET /api/marketplace/suppliers/:id/products - Get products for a specific supplier
router.get("/suppliers/:id/products", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { q, brand, model, category, inStock } = req.query;
    
    let conditions = [eq(parts.supplierId, id)];
    
    if (q && typeof q === 'string') {
      conditions.push(
        or(
          like(sql`LOWER(${parts.name})`, `%${q.toLowerCase()}%`),
          like(sql`LOWER(${parts.sku})`, `%${q.toLowerCase()}%`),
          like(parts.garagehubCode, `%${q}%`)
        )!
      );
    }
    
    if (brand && typeof brand === 'string') {
      conditions.push(eq(parts.vehicleMake, brand));
    }
    
    if (model && typeof model === 'string') {
      conditions.push(eq(parts.vehicleModel, model));
    }
    
    if (category && typeof category === 'string') {
      conditions.push(eq(parts.category, category as any));
    }
    
    if (inStock === '1' || inStock === 'true') {
      conditions.push(sql`${parts.stockQuantity} > 0`);
    }
    
    const whereClause = and(...conditions);
    
    const results = await db
      .select()
      .from(parts)
      .where(whereClause)
      .orderBy(desc(parts.createdAt));
    
    res.json(results);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

// POST /api/marketplace/suppliers/:id/products - Create product (supplier only)
router.post("/suppliers/:id/products", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Verify user owns this supplier
    const [supplier] = await db
      .select()
      .from(suppliers)
      .where(and(
        eq(suppliers.id, id),
        eq(suppliers.userId, user.claims.sub)
      ));
    
    if (!supplier) {
      return res.status(403).json({ message: "Not authorized to add products to this supplier" });
    }
    
    // Auto-generate system_code using existing ProductCodeService
    const { ProductCodeService } = await import("./services/productCodeService");
    
    const part = await db.transaction(async (tx) => {
      const garagehubCode = await ProductCodeService.generateCodeForSupplier(supplier.id, tx);
      
      return await storage.createPart({
        ...req.body,
        supplierId: supplier.id,
        supplierType: supplier.supplierType,
        garagehubCode,
      }, tx);
    });
    
    // Broadcast product creation via Socket.io
    const io = (req.app as any).get('io');
    if (io) {
      io.to(`shop:${supplier.id}`).emit('product.created', part);
    }
    
    res.status(201).json(part);
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ message: "Failed to create product" });
  }
});

// PATCH /api/marketplace/products/:id - Update product (supplier only)
router.patch("/products/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Verify user owns the supplier that owns this product
    const [part] = await db
      .select({
        part: parts,
        supplier: suppliers,
      })
      .from(parts)
      .innerJoin(suppliers, eq(parts.supplierId, suppliers.id))
      .where(eq(parts.id, id));
    
    if (!part || part.supplier.userId !== user.claims.sub) {
      return res.status(403).json({ message: "Not authorized to update this product" });
    }
    
    const updated = await storage.updatePart(id, req.body);
    
    // Broadcast product update via Socket.io
    const io = (req.app as any).get('io');
    if (io) {
      io.to(`shop:${part.supplier.id}`).emit('product.updated', updated);
    }
    
    res.json(updated);
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ message: "Failed to update product" });
  }
});

// DELETE /api/marketplace/products/:id - Soft delete product (supplier only)
router.delete("/products/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Verify user owns the supplier that owns this product
    const [part] = await db
      .select({
        part: parts,
        supplier: suppliers,
      })
      .from(parts)
      .innerJoin(suppliers, eq(parts.supplierId, suppliers.id))
      .where(eq(parts.id, id));
    
    if (!part || part.supplier.userId !== user.claims.sub) {
      return res.status(403).json({ message: "Not authorized to delete this product" });
    }
    
    await storage.deletePart(id);
    
    // Broadcast product deletion via Socket.io
    const io = (req.app as any).get('io');
    if (io) {
      io.to(`shop:${part.supplier.id}`).emit('product.deleted', { id });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ message: "Failed to delete product" });
  }
});

// GET /api/marketplace/chat/:supplierId/messages - Workshop gets messages with specific supplier
router.get("/chat/:supplierId/messages", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { supplierId } = req.params;
    const reqUser = (req as any).user;
    if (!reqUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = reqUser.claims?.sub || reqUser.userId;
    
    // Get supplier user ID
    const [supplier] = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.id, supplierId));
    
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    const messages = await storage.getWorkshopChatMessages(userId, supplier.userId);
    
    res.json(messages);
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    res.status(500).json({ message: "Failed to fetch chat messages" });
  }
});

// POST /api/marketplace/chat/:supplierId/messages - Chat with supplier (orderless)
router.post("/chat/:supplierId/messages", isAuthenticated, upload.single('image'), async (req: Request, res: Response) => {
  try {
    const { supplierId } = req.params;
    const reqUser = (req as any).user;
    const { message } = req.body;
    const imageFile = req.file;
    
    if (!reqUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // Get user ID from auth token
    const userId = reqUser.claims?.sub || reqUser.userId;
    
    // Verify supplier exists
    const [supplier] = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.id, supplierId));
    
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    // Get workshop ID for the sender
    const workshop = await storage.getWorkshopByUserId(userId);
    if (!workshop) {
      return res.status(403).json({ message: "Only workshops can send messages to suppliers" });
    }
    
    // Create chat message with both supplier_id and workshop_id
    const [chatMessage] = await db
      .insert(chatMessages)
      .values({
        senderId: userId,
        receiverId: supplier.userId,
        orderId: null, // Orderless chat
        supplierId: supplierId,
        workshopId: workshop.id,
        message: message || '',
        imageUrl: imageFile ? `/uploads/${imageFile.filename}` : null,
      })
      .returning();
    
    // Broadcast via Socket.io
    const io = (req.app as any).get('io');
    if (io) {
      console.log(`[Chat] Broadcasting to shop:${supplierId}`, chatMessage);
      io.to(`shop:${supplierId}`).emit('chat.new_message', chatMessage);
    } else {
      console.log('[Chat] WARNING: Socket.IO not available for broadcast');
    }
    
    res.status(201).json(chatMessage);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Failed to send message" });
  }
});

// POST /api/marketplace/chat/workshops/:workshopId/messages - Supplier sends message to workshop
router.post("/chat/workshops/:workshopId/messages", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { workshopId } = req.params;
    const reqUser = (req as any).user;
    const { message } = req.body;
    
    if (!reqUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = reqUser.claims?.sub || reqUser.userId;

    // Get workshop user ID
    const workshop = await storage.getWorkshop(workshopId);
    if (!workshop) {
      return res.status(404).json({ message: "Workshop not found" });
    }

    // Verify sender is a supplier
    const supplier = await storage.getSupplierByUserId(userId);
    if (!supplier) {
      return res.status(403).json({ message: "Only suppliers can send messages to workshops" });
    }

    // Create chat message (orderless supplier chat)
    const [chatMessage] = await db
      .insert(chatMessages)
      .values({
        senderId: userId,
        receiverId: workshop.userId,
        orderId: null,
        supplierId: supplier.id,
        workshopId: workshopId,
        message: message || '',
        imageUrl: null,
      })
      .returning();

    // Broadcast via Socket.IO to shop room
    const io = (req.app as any).get('io');
    if (io) {
      console.log(`[Chat] Broadcasting to shop:${supplier.id}`, chatMessage);
      io.to(`shop:${supplier.id}`).emit('chat.new_message', chatMessage);
    } else {
      console.log('[Chat] WARNING: Socket.IO not available for broadcast');
    }

    res.status(201).json(chatMessage);
  } catch (error) {
    console.error("Error sending message to workshop:", error);
    res.status(500).json({ message: "Failed to send message" });
  }
});

// GET /api/marketplace/chat/threads - Get supplier chat threads
router.get("/chat/threads", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const reqUser = (req as any).user;
    if (!reqUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = reqUser.claims?.sub || reqUser.userId;
    const threads = await storage.listSupplierChatThreads(userId);
    
    res.json(threads);
  } catch (error) {
    console.error("Error fetching chat threads:", error);
    res.status(500).json({ message: "Failed to fetch chat threads" });
  }
});

// GET /api/marketplace/chat/messages/:workshopId - Get supplier chat messages with a specific workshop
router.get("/chat/messages/:workshopId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { workshopId } = req.params;
    const reqUser = (req as any).user;
    if (!reqUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = reqUser.claims?.sub || reqUser.userId;
    
    // Get workshop user ID
    const workshop = await storage.getWorkshop(workshopId);
    if (!workshop) {
      return res.status(404).json({ message: "Workshop not found" });
    }

    const messages = await storage.getSupplierChatMessages(userId, workshop.userId);
    
    res.json(messages);
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    res.status(500).json({ message: "Failed to fetch chat messages" });
  }
});

// POST /api/marketplace/image-search/:supplierId - Image similarity search
router.post("/image-search/:supplierId", upload.single('image'), async (req: Request, res: Response) => {
  try {
    const { supplierId } = req.params;
    const imageFile = req.file;
    
    if (!imageFile) {
      return res.status(400).json({ message: "No image provided" });
    }
    
    // Use ImageSearchService
    const { imageSearchService } = await import("./services/imageSearchService");
    const imageUrl = `/uploads/${imageFile.filename}`;
    const results = await imageSearchService.searchByImage(supplierId, imageUrl);
    
    res.json(results);
  } catch (error) {
    console.error("Error searching by image:", error);
    res.status(500).json({ message: "Failed to search by image" });
  }
});

export default router;
