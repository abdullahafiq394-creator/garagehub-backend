import { sql, relations } from 'drizzle-orm';
import {
  index,
  uniqueIndex,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User roles enum
export type UserRole = 'customer' | 'workshop' | 'supplier' | 'runner' | 'towing' | 'staff' | 'mechanic' | 'admin';

// Malaysian states enum for marketplace
export type MalaysianState = 'Johor' | 'Kedah' | 'Kelantan' | 'Melaka' | 'Negeri Sembilan' | 'Pahang' | 'Perak' | 'Perlis' | 'Pulau Pinang' | 'Sabah' | 'Sarawak' | 'Selangor' | 'Terengganu' | 'Kuala Lumpur' | 'Labuan' | 'Putrajaya';

// Supplier type enum for Shopee-style marketplace
export const supplierTypeEnum = pgEnum('supplier_type', ['OEM', 'Halfcut']);
export type SupplierType = 'OEM' | 'Halfcut';

// Part category enum for detailed classification
export const partCategoryEnum = pgEnum('part_category', [
  'engine',
  'transmission', 
  'brake',
  'suspension',
  'electrical',
  'cooling',
  'body',
  'interior',
  'exterior',
  'wheel_tyre',
  'fluids',
  'service'
]);
export type PartCategory = 'engine' | 'transmission' | 'brake' | 'suspension' | 'electrical' | 'cooling' | 'body' | 'interior' | 'exterior' | 'wheel_tyre' | 'fluids' | 'service';

// Users table (Replit Auth compatible with role extension + local auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  password: varchar("password", { length: 255 }), // For local authentication (bcrypt hashed)
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { length: 20 }).$type<UserRole>().notNull().default('customer'),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  state: varchar("state", { length: 50 }).$type<MalaysianState>(), // Optional for customers
  city: varchar("city", { length: 100 }),
  latitude: decimal("latitude", { precision: 10, scale: 7 }), // Optional for customers
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  walletBalance: decimal("wallet_balance", { precision: 10, scale: 2 }).notNull().default('0'),
  isActive: boolean("is_active").notNull().default(true),
  isApproved: boolean("is_approved").notNull().default(false), // Admin approval required after registration
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_users_state").on(table.state),
  index("idx_users_role").on(table.role),
  index("idx_users_approved").on(table.isApproved),
]);

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Workshops table
export const workshops = pgTable("workshops", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  address: text("address").notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  state: varchar("state", { length: 50 }).$type<MalaysianState>().notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  geofenceRadius: integer("geofence_radius").notNull().default(100),
  walletBalance: decimal("wallet_balance", { precision: 10, scale: 2 }).notNull().default('0'),
  rating: decimal("rating", { precision: 3, scale: 2 }).notNull().default('0'),
  completedJobs: integer("completed_jobs").notNull().default(0),
  isVerified: boolean("is_verified").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_workshops_state").on(table.state),
  index("idx_workshops_city").on(table.city),
  index("idx_workshops_verified").on(table.isVerified),
]);

export const workshopsRelations = relations(workshops, ({ one, many }) => ({
  owner: one(users, {
    fields: [workshops.userId],
    references: [users.id],
  }),
  jobs: many(jobs),
  supplierOrders: many(supplierOrders),
  bookings: many(bookings),
  workOrders: many(workOrders),
  inventory: many(inventory),
}));

export const insertWorkshopSchema = createInsertSchema(workshops).omit({
  id: true,
  createdAt: true,
}).extend({
  latitude: z.string().optional(),
  longitude: z.string().optional(),
});

export type InsertWorkshop = z.infer<typeof insertWorkshopSchema>;
export type Workshop = typeof workshops.$inferSelect;

// Delivery method enum
export type DeliveryMethod = 'pickup' | 'runner' | 'both';

// Suppliers table
export const suppliers = pgTable("suppliers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  logoUrl: text("logo_url"),
  address: text("address").notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  state: varchar("state", { length: 50 }).$type<MalaysianState>().notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  supplierType: supplierTypeEnum("supplier_type").notNull().default('OEM'), // Shopee-style: OEM or Halfcut
  deliveryMethod: varchar("delivery_method", { length: 20 }).$type<DeliveryMethod>().notNull().default('both'),
  walletBalance: decimal("wallet_balance", { precision: 10, scale: 2 }).notNull().default('0'),
  rating: decimal("rating", { precision: 3, scale: 2 }).notNull().default('0'),
  completedOrders: integer("completed_orders").notNull().default(0),
  isVerified: boolean("is_verified").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_suppliers_state").on(table.state),
  index("idx_suppliers_city").on(table.city),
  index("idx_suppliers_verified").on(table.isVerified),
  index("idx_suppliers_delivery_method").on(table.deliveryMethod),
  index("idx_suppliers_type").on(table.supplierType),
]);

export const suppliersRelations = relations(suppliers, ({ one, many }) => ({
  owner: one(users, {
    fields: [suppliers.userId],
    references: [users.id],
  }),
  parts: many(parts),
  supplierOrders: many(supplierOrders),
}));

export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
  createdAt: true,
});

export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliers.$inferSelect;

// SupplierSummary: Lightweight storefront data for marketplace store list (Nov 2025 Shopee-style)
export type SupplierSummary = Pick<Supplier, 'id' | 'userId' | 'name' | 'description' | 'state' | 'city' | 'deliveryMethod' | 'rating' | 'isVerified'> & {
  productCount: number;
  categories: string[];
};

// Supplier Code Sequences table for atomic garagehubCode generation
export const supplierCodeSequences = pgTable("supplier_code_sequences", {
  supplierId: varchar("supplier_id").primaryKey().references(() => suppliers.id, { onDelete: 'cascade' }),
  lastCode: integer("last_code").notNull().default(0),
});

export type SupplierCodeSequence = typeof supplierCodeSequences.$inferSelect;

// Product category enum (Nov 2025: Added 'Halfcut' for Shopee-style marketplace)
export type ProductCategory = 'OEM' | 'Lubricant' | 'Battery' | 'Tyre' | 'Tools' | 'Accessories' | 'Halfcut' | 'Other';

// Parts/Products table
export const parts = pgTable("parts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  supplierId: varchar("supplier_id").notNull().references(() => suppliers.id),
  sku: varchar("sku", { length: 100 }).unique(),
  garagehubCode: varchar("garagehub_code", { length: 10 }).notNull(), // Shopee-style: Short code per supplier (#01, #02, ...) - unique per supplier
  supplierType: supplierTypeEnum("supplier_type").notNull(), // Mirrors supplier.supplierType
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 100 }).$type<ProductCategory>().notNull(),
  brand: varchar("brand", { length: 100 }), // Nov 2025: For Shopee-style filtering (e.g., Perodua, Toyota, Honda)
  model: varchar("model", { length: 100 }), // Nov 2025: For Shopee-style filtering (e.g., Myvi, Vios, Civic)
  vehicleMake: varchar("vehicle_make", { length: 100 }), // Shopee-style: e.g., Perodua, Toyota
  vehicleModel: varchar("vehicle_model", { length: 100 }), // Shopee-style: e.g., Myvi, Hilux
  vehicleYearFrom: integer("vehicle_year_from"), // Shopee-style: start year (e.g., 2015) - same as YearTo for single year
  vehicleYearTo: integer("vehicle_year_to"), // Shopee-style: end year (e.g., 2023), null for open-ended
  partCategory: partCategoryEnum("part_category").notNull(), // Shopee-style: detailed part classification (required for filtering)
  compatibility: jsonb("compatibility"), // Optional: array of {make: string, model: string, yearFrom?: number, yearTo?: number}
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  stockQuantity: integer("stock_quantity").notNull().default(0),
  imageUrl: varchar("image_url"), // Legacy - kept for backwards compatibility
  images: text("images").array().default(sql`ARRAY[]::text[]`), // New: supports up to 5 images
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  idxPartsSupplier: index("idx_parts_supplier").on(table.supplierId),
  idxPartsCategory: index("idx_parts_category").on(table.category),
  uniqueSupplierCode: uniqueIndex("unique_supplier_code").on(table.supplierId, table.garagehubCode), // Unique per supplier
  idxPartsSupplierType: index("idx_parts_supplier_type").on(table.supplierType),
  idxPartsPartCategory: index("idx_parts_part_category").on(table.partCategory),
  idxPartsVehicleMake: index("idx_parts_vehicle_make").on(table.vehicleMake),
  idxPartsVehicleModel: index("idx_parts_vehicle_model").on(table.vehicleModel),
  idxPartsNameLower: index("idx_parts_name_lower").on(sql`LOWER(name)`), // Individual indexes for text search
  idxPartsVehicleMakeLower: index("idx_parts_vehiclemake_lower").on(sql`LOWER(vehicle_make)`),
  idxPartsVehicleModelLower: index("idx_parts_vehiclemodel_lower").on(sql`LOWER(vehicle_model)`),
}));

export const partsRelations = relations(parts, ({ one, many }) => ({
  supplier: one(suppliers, {
    fields: [parts.supplierId],
    references: [suppliers.id],
  }),
  supplierOrderItems: many(supplierOrderItems),
  inventory: many(inventory),
}));

// Compatibility validation schema (for parts.compatibility JSONB field)
export const compatibilityItemSchema = z.object({
  make: z.string(),
  model: z.string(),
  yearFrom: z.number().int().min(1900).max(2100).optional(),
  yearTo: z.number().int().min(1900).max(2100).optional(),
});

export const insertPartSchema = createInsertSchema(parts, {
  compatibility: z.array(compatibilityItemSchema).optional(),
  category: z.string().transform(val => {
    const trimmed = val?.trim() || '';
    return trimmed.length > 0 ? trimmed : 'General';
  }),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  garagehubCode: true, // Auto-generated by ProductCodeService
  supplierType: true, // Auto-populated from supplier
});

// Update schema - excludes id, supplierId, createdAt, updatedAt, garagehubCode, supplierType (prevents ownership/code changes)
export const updatePartSchema = insertPartSchema.omit({
  supplierId: true,
}).partial();

export type CompatibilityItem = z.infer<typeof compatibilityItemSchema>;
export type InsertPart = z.infer<typeof insertPartSchema>;
export type UpdatePart = z.infer<typeof updatePartSchema>;
export type Part = typeof parts.$inferSelect;

// Supplier Order status enum
export type SupplierOrderStatus = 'created' | 'accepted' | 'preparing' | 'assigned_runner' | 'delivering' | 'delivered' | 'cancelled';

// Delivery type enum
export type DeliveryType = 'pickup' | 'runner';

// Payment method enum
export type PaymentMethod = 'wallet' | 'bank_transfer' | 'qr_code';

// Payment status enum
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

// Supplier Orders table (Workshop orders parts from Supplier - also known as Purchase Orders)
export const supplierOrders = pgTable("supplier_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workshopId: varchar("workshop_id").notNull().references(() => workshops.id),
  supplierId: varchar("supplier_id").notNull().references(() => suppliers.id),
  runnerId: varchar("runner_id").references(() => users.id),
  status: varchar("status", { length: 30 }).$type<SupplierOrderStatus>().notNull().default('created'),
  deliveryType: varchar("delivery_type", { length: 20 }).$type<DeliveryType>().notNull().default('pickup'),
  paymentMethod: varchar("payment_method", { length: 20 }).$type<PaymentMethod>().notNull().default('wallet'),
  paymentStatus: varchar("payment_status", { length: 20 }).$type<PaymentStatus>().notNull().default('pending'),
  itemsTotal: decimal("items_total", { precision: 10, scale: 2 }).notNull().default('0'),
  deliveryCharge: decimal("delivery_charge", { precision: 10, scale: 2 }).notNull().default('0'),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  distanceKm: decimal("distance_km", { precision: 10, scale: 2 }),
  deliveryAddress: text("delivery_address").notNull(),
  notes: text("notes"),
  pickupId: varchar("pickup_id", { length: 40 }).unique(),
  qrToken: varchar("qr_token", { length: 255 }),
  qrExpires: timestamp("qr_expires"),
  qrScannedAt: timestamp("qr_scanned_at"),
  qrScannedBy: varchar("qr_scanned_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const supplierOrdersRelations = relations(supplierOrders, ({ one, many }) => ({
  workshop: one(workshops, {
    fields: [supplierOrders.workshopId],
    references: [workshops.id],
  }),
  supplier: one(suppliers, {
    fields: [supplierOrders.supplierId],
    references: [suppliers.id],
  }),
  runner: one(users, {
    fields: [supplierOrders.runnerId],
    references: [users.id],
  }),
  items: many(supplierOrderItems),
  deliveryAssignment: many(deliveryAssignments),
}));

export const insertSupplierOrderSchema = createInsertSchema(supplierOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSupplierOrder = z.infer<typeof insertSupplierOrderSchema>;
export type SupplierOrder = typeof supplierOrders.$inferSelect;

// Legacy exports for backwards compatibility
export type OrderStatus = SupplierOrderStatus;
export const orders = supplierOrders;
export const ordersRelations = supplierOrdersRelations;
export const insertOrderSchema = insertSupplierOrderSchema;
export type InsertOrder = InsertSupplierOrder;
export type Order = SupplierOrder;

// Supplier Order Items table
export const supplierOrderItems = pgTable("supplier_order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => supplierOrders.id),
  partId: varchar("part_id").notNull().references(() => parts.id),
  quantity: integer("quantity").notNull(),
  priceAtTime: decimal("price_at_time", { precision: 10, scale: 2 }).notNull(),
});

export const supplierOrderItemsRelations = relations(supplierOrderItems, ({ one }) => ({
  supplierOrder: one(supplierOrders, {
    fields: [supplierOrderItems.orderId],
    references: [supplierOrders.id],
  }),
  part: one(parts, {
    fields: [supplierOrderItems.partId],
    references: [parts.id],
  }),
}));

export const insertSupplierOrderItemSchema = createInsertSchema(supplierOrderItems).omit({
  id: true,
});

export type InsertSupplierOrderItem = z.infer<typeof insertSupplierOrderItemSchema>;
export type SupplierOrderItem = typeof supplierOrderItems.$inferSelect;

// Legacy exports for backwards compatibility
export const orderItems = supplierOrderItems;
export const orderItemsRelations = supplierOrderItemsRelations;
export const insertOrderItemSchema = insertSupplierOrderItemSchema;
export type InsertOrderItem = InsertSupplierOrderItem;
export type OrderItem = SupplierOrderItem;

// Payment Transactions table (Track all payment activities for orders)
export const paymentTransactions = pgTable("payment_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => supplierOrders.id),
  paymentMethod: varchar("payment_method", { length: 20 }).$type<PaymentMethod>().notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: varchar("status", { length: 20 }).$type<PaymentStatus>().notNull().default('pending'),
  processorReference: varchar("processor_reference", { length: 255 }), // Stripe payment intent ID or bank reference
  metadata: text("metadata"), // JSON string for additional data (bank proof URL, QR code data, etc)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const paymentTransactionsRelations = relations(paymentTransactions, ({ one }) => ({
  order: one(supplierOrders, {
    fields: [paymentTransactions.orderId],
    references: [supplierOrders.id],
  }),
}));

export const insertPaymentTransactionSchema = createInsertSchema(paymentTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPaymentTransaction = z.infer<typeof insertPaymentTransactionSchema>;
export type PaymentTransaction = typeof paymentTransactions.$inferSelect;

// Job status enum
export type JobStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

// Jobs table (Workshop service jobs for customers)
export const jobs = pgTable("jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workshopId: varchar("workshop_id").notNull().references(() => workshops.id),
  customerId: varchar("customer_id").notNull().references(() => users.id),
  vehicleModel: varchar("vehicle_model", { length: 255 }).notNull(),
  vehiclePlate: varchar("vehicle_plate", { length: 50 }).notNull(),
  serviceType: varchar("service_type", { length: 100 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).$type<JobStatus>().notNull().default('pending'),
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 2 }),
  actualCost: decimal("actual_cost", { precision: 10, scale: 2 }),
  scheduledDate: timestamp("scheduled_date"),
  completedDate: timestamp("completed_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const jobsRelations = relations(jobs, ({ one }) => ({
  workshop: one(workshops, {
    fields: [jobs.workshopId],
    references: [workshops.id],
  }),
  customer: one(users, {
    fields: [jobs.customerId],
    references: [users.id],
  }),
}));

export const insertJobSchema = createInsertSchema(jobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobs.$inferSelect;

// Towing request status enum
export type TowingStatus = 'pending' | 'assigned' | 'en_route' | 'completed' | 'cancelled';

// Towing Requests table
export const towingRequests = pgTable("towing_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => users.id),
  towingServiceId: varchar("towing_service_id").references(() => users.id),
  workshopId: varchar("workshop_id").references(() => workshops.id),
  pickupLocation: text("pickup_location").notNull(),
  dropoffLocation: text("dropoff_location").notNull(),
  vehicleModel: varchar("vehicle_model", { length: 255 }).notNull(),
  vehiclePlate: varchar("vehicle_plate", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).$type<TowingStatus>().notNull().default('pending'),
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const towingRequestsRelations = relations(towingRequests, ({ one }) => ({
  customer: one(users, {
    fields: [towingRequests.customerId],
    references: [users.id],
  }),
  towingService: one(users, {
    fields: [towingRequests.towingServiceId],
    references: [users.id],
  }),
  workshop: one(workshops, {
    fields: [towingRequests.workshopId],
    references: [workshops.id],
  }),
}));

export const insertTowingRequestSchema = createInsertSchema(towingRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTowingRequest = z.infer<typeof insertTowingRequestSchema>;
export type TowingRequest = typeof towingRequests.$inferSelect;

// Booking status enum
export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled' | 'workshop_proposed';

// Bookings table (Customer service booking requests)
export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull().references(() => users.id),
  workshopId: varchar("workshop_id").notNull().references(() => workshops.id),
  vehicleModel: varchar("vehicle_model", { length: 255 }).notNull(),
  vehiclePlate: varchar("vehicle_plate", { length: 50 }).notNull(),
  serviceType: varchar("service_type", { length: 100 }).notNull(),
  description: text("description"),
  preferredDate: timestamp("preferred_date"),
  proposedDate: timestamp("proposed_date"),
  proposalReason: text("proposal_reason"),
  status: varchar("status", { length: 20 }).$type<BookingStatus>().notNull().default('pending'),
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const bookingsRelations = relations(bookings, ({ one }) => ({
  customer: one(users, {
    fields: [bookings.customerId],
    references: [users.id],
  }),
  workshop: one(workshops, {
    fields: [bookings.workshopId],
    references: [workshops.id],
  }),
}));

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  preferredDate: z.union([z.date(), z.string()]).optional().transform(val => {
    if (!val) return undefined;
    if (typeof val === 'string') return new Date(val);
    return val;
  }),
  estimatedCost: z.union([z.string(), z.number()]).optional().transform(val => {
    if (!val) return undefined;
    return String(val);
  }),
});

export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;

// Work Order status enum
export type WorkOrderStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

// Work Orders table (Created when workshop approves booking)
export const workOrders = pgTable("work_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").notNull().references(() => bookings.id),
  workshopId: varchar("workshop_id").notNull().references(() => workshops.id),
  customerId: varchar("customer_id").notNull().references(() => users.id),
  vehicleModel: varchar("vehicle_model", { length: 255 }).notNull(),
  vehiclePlate: varchar("vehicle_plate", { length: 50 }).notNull(),
  serviceType: varchar("service_type", { length: 100 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).$type<WorkOrderStatus>().notNull().default('pending'),
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 2 }),
  actualCost: decimal("actual_cost", { precision: 10, scale: 2 }),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const workOrdersRelations = relations(workOrders, ({ one }) => ({
  booking: one(bookings, {
    fields: [workOrders.bookingId],
    references: [bookings.id],
  }),
  workshop: one(workshops, {
    fields: [workOrders.workshopId],
    references: [workshops.id],
  }),
  customer: one(users, {
    fields: [workOrders.customerId],
    references: [users.id],
  }),
}));

export const insertWorkOrderSchema = createInsertSchema(workOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWorkOrder = z.infer<typeof insertWorkOrderSchema>;
export type WorkOrder = typeof workOrders.$inferSelect;

// Delivery assignment status enum
export type DeliveryStatus = 'pending' | 'picked_up' | 'en_route' | 'delivered' | 'cancelled';

// Delivery Assignments table (Runner deliveries with live tracking)
export const deliveryAssignments = pgTable("delivery_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => supplierOrders.id),
  runnerId: varchar("runner_id").notNull().references(() => users.id),
  status: varchar("status", { length: 20 }).$type<DeliveryStatus>().notNull().default('pending'),
  pickupLocation: text("pickup_location").notNull(),
  dropoffLocation: text("dropoff_location").notNull(),
  currentLat: decimal("current_lat", { precision: 10, scale: 8 }),
  currentLng: decimal("current_lng", { precision: 11, scale: 8 }),
  pickedUpAt: timestamp("picked_up_at"),
  deliveredAt: timestamp("delivered_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const deliveryAssignmentsRelations = relations(deliveryAssignments, ({ one }) => ({
  supplierOrder: one(supplierOrders, {
    fields: [deliveryAssignments.orderId],
    references: [supplierOrders.id],
  }),
  runner: one(users, {
    fields: [deliveryAssignments.runnerId],
    references: [users.id],
  }),
}));

export const insertDeliveryAssignmentSchema = createInsertSchema(deliveryAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDeliveryAssignment = z.infer<typeof insertDeliveryAssignmentSchema>;
export type DeliveryAssignment = typeof deliveryAssignments.$inferSelect;

// Inventory table (Workshop stock management)
export const inventory = pgTable("inventory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workshopId: varchar("workshop_id").notNull().references(() => workshops.id),
  partId: varchar("part_id").notNull().references(() => parts.id),
  quantity: integer("quantity").notNull().default(0),
  minimumStock: integer("minimum_stock").notNull().default(5),
  location: varchar("location", { length: 100 }),
  lastRestocked: timestamp("last_restocked"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const inventoryRelations = relations(inventory, ({ one }) => ({
  workshop: one(workshops, {
    fields: [inventory.workshopId],
    references: [workshops.id],
  }),
  part: one(parts, {
    fields: [inventory.partId],
    references: [parts.id],
  }),
}));

export const insertInventorySchema = createInsertSchema(inventory).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertInventory = z.infer<typeof insertInventorySchema>;
export type Inventory = typeof inventory.$inferSelect;

// Notifications table
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Chat Messages table (Nov 2025: Supports both order-based and supplier-scoped chat)
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => supplierOrders.id, { onDelete: 'cascade' }), // Nullable for supplier-room chat
  supplierId: varchar("supplier_id").references(() => suppliers.id, { onDelete: 'cascade' }), // For supplier-room chat
  workshopId: varchar("workshop_id").references(() => workshops.id, { onDelete: 'cascade' }), // For supplier-room chat
  senderId: varchar("sender_id").notNull().references(() => users.id),
  receiverId: varchar("receiver_id").references(() => users.id),
  message: text("message"),
  imageUrl: varchar("image_url"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Composite index for supplier-room message lookups
  supplierWorkshopIdx: index("chat_supplier_workshop_idx").on(table.supplierId, table.workshopId),
  // Index for order-thread message lookups
  orderIdx: index("chat_order_idx").on(table.orderId),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  order: one(supplierOrders, {
    fields: [chatMessages.orderId],
    references: [supplierOrders.id],
  }),
  supplier: one(suppliers, {
    fields: [chatMessages.supplierId],
    references: [suppliers.id],
  }),
  workshop: one(workshops, {
    fields: [chatMessages.workshopId],
    references: [workshops.id],
  }),
  sender: one(users, {
    fields: [chatMessages.senderId],
    references: [users.id],
  }),
  receiver: one(users, {
    fields: [chatMessages.receiverId],
    references: [users.id],
  }),
}));

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

// User Actions table - Audit Trail
export const userActions = pgTable("user_actions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  resource: varchar("resource", { length: 100 }),
  resourceId: varchar("resource_id"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  requestId: varchar("request_id", { length: 100 }),
  details: jsonb("details"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const insertUserActionSchema = createInsertSchema(userActions).omit({
  id: true,
  timestamp: true,
});

export type InsertUserAction = z.infer<typeof insertUserActionSchema>;
export type UserAction = typeof userActions.$inferSelect;

// Two Factor Auth table - TOTP Secrets
export const twoFactorAuth = pgTable("two_factor_auth", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id),
  secret: varchar("secret", { length: 255 }).notNull(),
  enabled: boolean("enabled").default(false).notNull(),
  backupCodes: jsonb("backup_codes").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const twoFactorAuthRelations = relations(twoFactorAuth, ({ one }) => ({
  user: one(users, {
    fields: [twoFactorAuth.userId],
    references: [users.id],
  }),
}));

export const insertTwoFactorAuthSchema = createInsertSchema(twoFactorAuth).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTwoFactorAuth = z.infer<typeof insertTwoFactorAuthSchema>;
export type TwoFactorAuth = typeof twoFactorAuth.$inferSelect;

// Refresh Tokens table - JWT Refresh Token Storage
export const refreshTokens = pgTable("refresh_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  revokedAt: timestamp("revoked_at"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
});

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

export const insertRefreshTokenSchema = createInsertSchema(refreshTokens).omit({
  id: true,
  createdAt: true,
});

export type InsertRefreshToken = z.infer<typeof insertRefreshTokenSchema>;
export type RefreshToken = typeof refreshTokens.$inferSelect;

// Auth validation schemas
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().optional(),
});

export const registerSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  role: z.enum(['customer', 'workshop', 'supplier', 'runner', 'towing', 'staff', 'admin']),
  phone: z.string().optional(),
  address: z.string().optional(),
  businessName: z.string().optional(),
  businessDescription: z.string().optional(),
  state: z.enum(['Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan', 'Pahang', 'Perak', 'Perlis', 'Pulau Pinang', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu', 'Kuala Lumpur', 'Labuan', 'Putrajaya']).optional(),
  city: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  deliveryMethod: z.enum(['pickup', 'runner', 'both']).optional(),
  supplierType: z.enum(['OEM', 'Halfcut']).optional(), // Shopee-style: Required for supplier role
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
}).refine((data) => {
  if (data.role === 'workshop' || data.role === 'supplier') {
    return !!data.businessName && !!data.address && !!data.phone;
  }
  return true;
}, {
  message: "Business name, address, and phone are required for workshop/supplier accounts",
  path: ["businessName"],
}).refine((data) => {
  if (data.role === 'workshop' || data.role === 'supplier' || data.role === 'runner') {
    return !!data.state && !!data.city;
  }
  return true;
}, {
  message: "Location information (state, city) is required for workshop/supplier/runner accounts",
  path: ["state"],
}).refine((data) => {
  if (data.role === 'supplier') {
    return !!data.deliveryMethod;
  }
  return true;
}, {
  message: "Delivery method is required for supplier accounts",
  path: ["deliveryMethod"],
}).refine((data) => {
  // Shopee-style: Supplier requires supplier type (OEM or Halfcut)
  if (data.role === 'supplier') {
    return !!data.supplierType;
  }
  return true;
}, {
  message: "Supplier type is required (OEM or Halfcut)",
  path: ["supplierType"],
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;

// ============================================================
// WORKSHOP DASHBOARD TABLES
// ============================================================

// Workshop Customers table (Workshop-specific customer records)
export const workshopCustomers = pgTable("workshop_customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workshopId: varchar("workshop_id").notNull().references(() => workshops.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'set null' }), // Links platform users to workshop customers
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  plateNo: varchar("plate_no", { length: 50 }).notNull(),
  vehicleModel: varchar("vehicle_model", { length: 255 }).notNull(),
  lastService: timestamp("last_service"),
  nextService: timestamp("next_service"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const workshopCustomersRelations = relations(workshopCustomers, ({ one, many }) => ({
  workshop: one(workshops, {
    fields: [workshopCustomers.workshopId],
    references: [workshops.id],
  }),
  user: one(users, {
    fields: [workshopCustomers.userId],
    references: [users.id],
  }),
  jobs: many(workshopJobs),
  sales: many(workshopSales),
}));

export const insertWorkshopCustomerSchema = createInsertSchema(workshopCustomers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  lastService: z.coerce.date().nullable().optional(),
  nextService: z.coerce.date().nullable().optional(),
});

export type InsertWorkshopCustomer = z.infer<typeof insertWorkshopCustomerSchema>;
export type WorkshopCustomer = typeof workshopCustomers.$inferSelect;

// Workshop Staff table (Employees/Mechanics)
export const workshopStaff = pgTable("workshop_staff", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workshopId: varchar("workshop_id").notNull().references(() => workshops.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'set null' }), // Link to user account for authentication
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 100 }).notNull(), // e.g., 'mechanic', 'manager', 'admin'
  ic: varchar("ic", { length: 50 }), // Identity card number
  basicSalary: decimal("basic_salary", { precision: 10, scale: 2 }).default('0'),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).default('0'), // Percentage
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  isActive: boolean("is_active").default(true).notNull(),
  qrCode: text("qr_code"), // Unique QR code for attendance
  photoUrl: text("photo_url"), // Staff photo for face recognition and profile display
  faceDescriptor: jsonb("face_descriptor"), // Face-api.js descriptor for face recognition
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const workshopStaffRelations = relations(workshopStaff, ({ one, many }) => ({
  workshop: one(workshops, {
    fields: [workshopStaff.workshopId],
    references: [workshops.id],
  }),
  commissions: many(staffCommissions),
  jobs: many(workshopJobs),
  attendances: many(staffAttendance),
}));

export const insertWorkshopStaffSchema = createInsertSchema(workshopStaff).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWorkshopStaff = z.infer<typeof insertWorkshopStaffSchema>;
export type WorkshopStaff = typeof workshopStaff.$inferSelect;

// Attendance status enum
export type AttendanceStatus = 'present' | 'late' | 'absent';

// Staff Attendance table
export const staffAttendance = pgTable("staff_attendance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  staffId: varchar("staff_id").notNull().references(() => workshopStaff.id, { onDelete: 'cascade' }),
  date: timestamp("date").notNull(),
  clockIn: timestamp("clock_in"),
  clockOut: timestamp("clock_out"),
  hoursWorked: decimal("hours_worked", { precision: 5, scale: 2 }),
  status: varchar("status", { length: 20 }).$type<AttendanceStatus>().default('present'),
  latitude: decimal("latitude", { precision: 10, scale: 7 }), // Geolocation verification
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  verificationMethod: varchar("verification_method", { length: 20 }), // 'qr', 'face', 'qr_face'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const staffAttendanceRelations = relations(staffAttendance, ({ one }) => ({
  staff: one(workshopStaff, {
    fields: [staffAttendance.staffId],
    references: [workshopStaff.id],
  }),
}));

export const insertStaffAttendanceSchema = createInsertSchema(staffAttendance).omit({
  id: true,
  createdAt: true,
});

export type InsertStaffAttendance = z.infer<typeof insertStaffAttendanceSchema>;
export type StaffAttendance = typeof staffAttendance.$inferSelect;

// Staff Commissions table
export const staffCommissions = pgTable("staff_commissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  staffId: varchar("staff_id").notNull().references(() => workshopStaff.id, { onDelete: 'cascade' }),
  jobId: varchar("job_id").references(() => workshopJobs.id, { onDelete: 'set null' }),
  commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const staffCommissionsRelations = relations(staffCommissions, ({ one }) => ({
  staff: one(workshopStaff, {
    fields: [staffCommissions.staffId],
    references: [workshopStaff.id],
  }),
  job: one(workshopJobs, {
    fields: [staffCommissions.jobId],
    references: [workshopJobs.id],
  }),
}));

export const insertStaffCommissionSchema = createInsertSchema(staffCommissions).omit({
  id: true,
  createdAt: true,
});

export type InsertStaffCommission = z.infer<typeof insertStaffCommissionSchema>;
export type StaffCommission = typeof staffCommissions.$inferSelect;

// Workshop Jobs table (Enhanced jobs table specific to workshop dashboard)
export const workshopJobs = pgTable("workshop_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id", { length: 50 }).unique(), // Formatted as JOB-YYYYMMDD-XXXX
  workshopId: varchar("workshop_id").notNull().references(() => workshops.id, { onDelete: 'cascade' }),
  customerId: varchar("customer_id").references(() => workshopCustomers.id, { onDelete: 'set null' }),
  customerUserId: varchar("customer_user_id").references(() => users.id, { onDelete: 'set null' }), // Direct link to platform user
  plateNo: varchar("plate_no", { length: 50 }).notNull(),
  vehicleModel: varchar("vehicle_model", { length: 255 }).notNull(),
  mechanicId: varchar("mechanic_id").references(() => workshopStaff.id, { onDelete: 'set null' }),
  bayId: varchar("bay_id"), // FK to workBays - handled in relations to avoid circular dependency
  serviceType: varchar("service_type", { length: 100 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).$type<'pending' | 'in_progress' | 'completed' | 'cancelled'>().notNull().default('pending'),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // Duration in minutes
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 2 }),
  actualCost: decimal("actual_cost", { precision: 10, scale: 2 }),
  taskList: jsonb("task_list"), // Array of tasks with completion status
  progress: integer("progress").default(0), // Progress percentage (0-100)
  beforeImages: jsonb("before_images"), // Array of image URLs
  afterImages: jsonb("after_images"), // Array of image URLs
  partsUsed: jsonb("parts_used"), // Array of parts with quantities and costs
  labourCost: decimal("labour_cost", { precision: 10, scale: 2 }),
  receiptUrl: text("receipt_url"), // PDF receipt file path
  source: varchar("source", { length: 20 }).default('walk_in'), // 'walk_in' or 'booking'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const workshopJobsRelations = relations(workshopJobs, ({ one, many }) => ({
  workshop: one(workshops, {
    fields: [workshopJobs.workshopId],
    references: [workshops.id],
  }),
  customer: one(workshopCustomers, {
    fields: [workshopJobs.customerId],
    references: [workshopCustomers.id],
  }),
  customerUser: one(users, {
    fields: [workshopJobs.customerUserId],
    references: [users.id],
  }),
  mechanic: one(workshopStaff, {
    fields: [workshopJobs.mechanicId],
    references: [workshopStaff.id],
  }),
  bay: one(workBays, {
    fields: [workshopJobs.bayId],
    references: [workBays.id],
  }),
  commissions: many(staffCommissions),
  sales: many(workshopSales),
}));

export const insertWorkshopJobSchema = createInsertSchema(workshopJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWorkshopJob = z.infer<typeof insertWorkshopJobSchema>;
export type WorkshopJob = typeof workshopJobs.$inferSelect;

// Work Bays table (Service bay status tracking)
export const workBays = pgTable("work_bays", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workshopId: varchar("workshop_id").notNull().references(() => workshops.id, { onDelete: 'cascade' }),
  bayName: varchar("bay_name", { length: 100 }).notNull(),
  status: varchar("status", { length: 20 }).$type<'available' | 'in_service' | 'occupied' | 'offline'>().notNull().default('available'),
  currentVehicle: varchar("current_vehicle", { length: 50 }),
  assignedMechanicId: varchar("assigned_mechanic_id").references(() => workshopStaff.id, { onDelete: 'set null' }),
  currentJobId: varchar("current_job_id"), // FK to workshopJobs - handled in relations to avoid circular dependency
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const workBaysRelations = relations(workBays, ({ one, many }) => ({
  workshop: one(workshops, {
    fields: [workBays.workshopId],
    references: [workshops.id],
  }),
  assignedMechanic: one(workshopStaff, {
    fields: [workBays.assignedMechanicId],
    references: [workshopStaff.id],
  }),
  currentJob: one(workshopJobs, {
    fields: [workBays.currentJobId],
    references: [workshopJobs.id],
  }),
  jobs: many(workshopJobs),
}));

export const insertWorkBaySchema = createInsertSchema(workBays).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWorkBay = z.infer<typeof insertWorkBaySchema>;
export type WorkBay = typeof workBays.$inferSelect;

// Workshop Purchases table (Inventory purchases from suppliers)
export const workshopPurchases = pgTable("workshop_purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workshopId: varchar("workshop_id").notNull().references(() => workshops.id, { onDelete: 'cascade' }),
  supplierId: varchar("supplier_id").references(() => suppliers.id, { onDelete: 'set null' }),
  supplierOrderId: varchar("supplier_order_id").references(() => supplierOrders.id, { onDelete: 'set null' }),
  itemName: varchar("item_name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  quantity: integer("quantity").notNull(),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }).notNull(),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const workshopPurchasesRelations = relations(workshopPurchases, ({ one }) => ({
  workshop: one(workshops, {
    fields: [workshopPurchases.workshopId],
    references: [workshops.id],
  }),
  supplier: one(suppliers, {
    fields: [workshopPurchases.supplierId],
    references: [suppliers.id],
  }),
  supplierOrder: one(supplierOrders, {
    fields: [workshopPurchases.supplierOrderId],
    references: [supplierOrders.id],
  }),
}));

export const insertWorkshopPurchaseSchema = createInsertSchema(workshopPurchases).omit({
  id: true,
  createdAt: true,
});

export type InsertWorkshopPurchase = z.infer<typeof insertWorkshopPurchaseSchema>;
export type WorkshopPurchase = typeof workshopPurchases.$inferSelect;

// Workshop Sales table (Sales/receipts)
export const workshopSales = pgTable("workshop_sales", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workshopId: varchar("workshop_id").notNull().references(() => workshops.id, { onDelete: 'cascade' }),
  customerId: varchar("customer_id").references(() => workshopCustomers.id, { onDelete: 'set null' }),
  jobId: varchar("job_id").references(() => workshopJobs.id, { onDelete: 'set null' }),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }).notNull(), // 'cash', 'card', 'bank_transfer'
  gstAmount: decimal("gst_amount", { precision: 10, scale: 2 }).default('0'),
  gstRate: decimal("gst_rate", { precision: 5, scale: 2 }).default('0'), // e.g., 6.00 for 6%
  receiptNumber: varchar("receipt_number", { length: 100 }),
  date: timestamp("date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const workshopSalesRelations = relations(workshopSales, ({ one }) => ({
  workshop: one(workshops, {
    fields: [workshopSales.workshopId],
    references: [workshops.id],
  }),
  customer: one(workshopCustomers, {
    fields: [workshopSales.customerId],
    references: [workshopCustomers.id],
  }),
  job: one(workshopJobs, {
    fields: [workshopSales.jobId],
    references: [workshopJobs.id],
  }),
}));

export const insertWorkshopSaleSchema = createInsertSchema(workshopSales).omit({
  id: true,
  createdAt: true,
});

export type InsertWorkshopSale = z.infer<typeof insertWorkshopSaleSchema>;
export type WorkshopSale = typeof workshopSales.$inferSelect;

// Manual Invoices table (Custom quotations & receipts)
export const manualInvoices = pgTable("manual_invoices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workshopId: varchar("workshop_id").notNull().references(() => workshops.id, { onDelete: 'cascade' }),
  customerId: varchar("customer_id").references(() => workshopCustomers.id, { onDelete: 'set null' }),
  invoiceType: varchar("invoice_type", { length: 20 }).$type<'quotation' | 'receipt'>().notNull(),
  invoiceNumber: varchar("invoice_number", { length: 100 }).notNull(),
  customerName: varchar("customer_name", { length: 255 }).notNull(),
  customerPhone: varchar("customer_phone", { length: 20 }),
  customerAddress: text("customer_address"),
  items: jsonb("items").notNull(), // Array of {description: string, quantity: number, unitPrice: number, total: number}
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default('0'), // e.g., 6.00 for 6%
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }).default('0'),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  terms: text("terms"), // Payment terms or quotation validity
  pdfUrl: text("pdf_url"), // Path to generated PDF
  status: varchar("status", { length: 20 }).$type<'draft' | 'sent' | 'paid' | 'void'>().notNull().default('draft'),
  issueDate: timestamp("issue_date").notNull(),
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const manualInvoicesRelations = relations(manualInvoices, ({ one }) => ({
  workshop: one(workshops, {
    fields: [manualInvoices.workshopId],
    references: [workshops.id],
  }),
  customer: one(workshopCustomers, {
    fields: [manualInvoices.customerId],
    references: [workshopCustomers.id],
  }),
}));

export const insertManualInvoiceSchema = createInsertSchema(manualInvoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date().nullable().optional(),
});

export type InsertManualInvoice = z.infer<typeof insertManualInvoiceSchema>;
export type ManualInvoice = typeof manualInvoices.$inferSelect;

// Job Parts Requests table
export const jobPartsRequests = pgTable("job_parts_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  jobId: varchar("job_id").notNull().references(() => workshopJobs.id, { onDelete: 'cascade' }),
  requestedBy: varchar("requested_by").notNull().references(() => workshopStaff.id, { onDelete: 'cascade' }), // Mechanic who requested
  workshopId: varchar("workshop_id").notNull().references(() => workshops.id, { onDelete: 'cascade' }),
  status: varchar("status", { length: 20 }).$type<'pending' | 'approved' | 'rejected' | 'fulfilled'>().notNull().default('pending'),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const jobPartsRequestsRelations = relations(jobPartsRequests, ({ one, many }) => ({
  job: one(workshopJobs, {
    fields: [jobPartsRequests.jobId],
    references: [workshopJobs.id],
  }),
  requestedByStaff: one(workshopStaff, {
    fields: [jobPartsRequests.requestedBy],
    references: [workshopStaff.id],
  }),
  workshop: one(workshops, {
    fields: [jobPartsRequests.workshopId],
    references: [workshops.id],
  }),
  items: many(jobPartRequestItems),
}));

// Job Parts Request Items table (child items)
export const jobPartRequestItems = pgTable("job_part_request_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requestId: varchar("request_id").notNull().references(() => jobPartsRequests.id, { onDelete: 'cascade' }),
  itemName: varchar("item_name", { length: 255 }).notNull(),
  quantity: integer("quantity").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const jobPartRequestItemsRelations = relations(jobPartRequestItems, ({ one }) => ({
  request: one(jobPartsRequests, {
    fields: [jobPartRequestItems.requestId],
    references: [jobPartsRequests.id],
  }),
}));

export const insertJobPartsRequestSchema = createInsertSchema(jobPartsRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertJobPartRequestItemSchema = createInsertSchema(jobPartRequestItems).omit({
  id: true,
  createdAt: true,
});

export type InsertJobPartsRequest = z.infer<typeof insertJobPartsRequestSchema>;
export type JobPartsRequest = typeof jobPartsRequests.$inferSelect;
export type InsertJobPartRequestItem = z.infer<typeof insertJobPartRequestItemSchema>;
export type JobPartRequestItem = typeof jobPartRequestItems.$inferSelect;

// Workshop Expenses table
export const workshopExpenses = pgTable("workshop_expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workshopId: varchar("workshop_id").notNull().references(() => workshops.id, { onDelete: 'cascade' }),
  category: varchar("category", { length: 100 }).notNull(), // 'parts', 'tools', 'rent', 'utilities', 'salary', 'other'
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const workshopExpensesRelations = relations(workshopExpenses, ({ one }) => ({
  workshop: one(workshops, {
    fields: [workshopExpenses.workshopId],
    references: [workshops.id],
  }),
}));

export const insertWorkshopExpenseSchema = createInsertSchema(workshopExpenses).omit({
  id: true,
  createdAt: true,
}).extend({
  amount: z.union([
    z.string(),
    z.number().transform((num) => num.toFixed(2))
  ]),
  date: z.union([
    z.date(),
    z.string().transform((str) => {
      const date = new Date(str);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date string');
      }
      return date;
    })
  ])
});

export type InsertWorkshopExpense = z.infer<typeof insertWorkshopExpenseSchema>;
export type WorkshopExpense = typeof workshopExpenses.$inferSelect;

// Workshop Accounts table (Income/Expense tracking)
export const workshopAccounts = pgTable("workshop_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workshopId: varchar("workshop_id").notNull().references(() => workshops.id, { onDelete: 'cascade' }),
  type: varchar("type", { length: 20 }).$type<'income' | 'expense'>().notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  reference: varchar("reference", { length: 255 }), // Reference to sale_id or expense_id
  referenceType: varchar("reference_type", { length: 50 }), // 'sale', 'expense', 'purchase'
  date: timestamp("date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const workshopAccountsRelations = relations(workshopAccounts, ({ one }) => ({
  workshop: one(workshops, {
    fields: [workshopAccounts.workshopId],
    references: [workshops.id],
  }),
}));

export const insertWorkshopAccountSchema = createInsertSchema(workshopAccounts).omit({
  id: true,
  createdAt: true,
});

export type InsertWorkshopAccount = z.infer<typeof insertWorkshopAccountSchema>;
export type WorkshopAccount = typeof workshopAccounts.$inferSelect;

// Workshop Settings table (Zakat & Tax configuration)
export const workshopSettings = pgTable("workshop_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workshopId: varchar("workshop_id").notNull().unique().references(() => workshops.id, { onDelete: 'cascade' }),
  zakatRate: decimal("zakat_rate", { precision: 5, scale: 2 }).default('2.50'), // Default 2.5%
  taxRate: decimal("tax_rate", { precision: 5, scale: 2 }).default('10.00'), // Default 10%
  zakatEnabled: boolean("zakat_enabled").default(true),
  taxEnabled: boolean("tax_enabled").default(true),
  autoReportEnabled: boolean("auto_report_enabled").default(true),
  reportTime: varchar("report_time", { length: 5 }).default('23:59'), // HH:MM format
  reportEmail: varchar("report_email", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const workshopSettingsRelations = relations(workshopSettings, ({ one }) => ({
  workshop: one(workshops, {
    fields: [workshopSettings.workshopId],
    references: [workshops.id],
  }),
}));

export const insertWorkshopSettingsSchema = createInsertSchema(workshopSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWorkshopSettings = z.infer<typeof insertWorkshopSettingsSchema>;
export type WorkshopSettings = typeof workshopSettings.$inferSelect;

// Daily Reports table (Auto-generated reports storage)
export const dailyReports = pgTable("daily_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workshopId: varchar("workshop_id").notNull().references(() => workshops.id, { onDelete: 'cascade' }),
  reportDate: timestamp("report_date").notNull(),
  totalJobs: integer("total_jobs").notNull().default(0),
  totalSales: decimal("total_sales", { precision: 10, scale: 2 }).notNull().default('0'),
  totalExpenses: decimal("total_expenses", { precision: 10, scale: 2 }).notNull().default('0'),
  profit: decimal("profit", { precision: 10, scale: 2 }).notNull().default('0'),
  zakatAmount: decimal("zakat_amount", { precision: 10, scale: 2 }),
  taxAmount: decimal("tax_amount", { precision: 10, scale: 2 }),
  pdfUrl: text("pdf_url"), // Path to generated PDF
  status: varchar("status", { length: 20 }).default('generated'), // 'generated', 'sent', 'failed'
  createdAt: timestamp("created_at").defaultNow(),
});

export const dailyReportsRelations = relations(dailyReports, ({ one }) => ({
  workshop: one(workshops, {
    fields: [dailyReports.workshopId],
    references: [workshops.id],
  }),
}));

export const insertDailyReportSchema = createInsertSchema(dailyReports).omit({
  id: true,
  createdAt: true,
});

export type InsertDailyReport = z.infer<typeof insertDailyReportSchema>;
export type DailyReport = typeof dailyReports.$inferSelect;

// ============================================================
// WORKSHOP DASHBOARD UPDATE SCHEMAS (Security: Whitelist mutable fields)
// ============================================================

// Workshop Customer Update Schema - exclude id, workshopId, createdAt, updatedAt
export const updateWorkshopCustomerSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  phone: z.string().min(1).max(20).optional(),
  plateNo: z.string().min(1).max(50).optional(),
  vehicleModel: z.string().min(1).max(255).optional(),
  lastService: z.coerce.date().nullable().optional(),
  nextService: z.coerce.date().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type UpdateWorkshopCustomer = z.infer<typeof updateWorkshopCustomerSchema>;

// Workshop Staff Update Schema - exclude id, workshopId, createdAt, updatedAt
export const updateWorkshopStaffSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  role: z.string().min(1).max(100).optional(),
  ic: z.string().max(50).nullable().optional(),
  basicSalary: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  commissionRate: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  phone: z.string().max(20).nullable().optional(),
  email: z.string().email().max(255).nullable().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateWorkshopStaff = z.infer<typeof updateWorkshopStaffSchema>;

// Workshop Job Update Schema - exclude id, workshopId, createdAt, updatedAt, protect calculated fields
export const updateWorkshopJobSchema = z.object({
  customerId: z.string().nullable().optional(),
  plateNo: z.string().min(1).max(50).optional(),
  vehicleModel: z.string().min(1).max(255).optional(),
  mechanicId: z.string().nullable().optional(),
  bayId: z.string().nullable().optional(),
  serviceType: z.string().min(1).max(100).optional(),
  description: z.string().nullable().optional(),
  estimatedCost: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(),
  // Protect status, startTime, endTime, duration, actualCost - these are set by startJob/completeJob
});

export type UpdateWorkshopJob = z.infer<typeof updateWorkshopJobSchema>;

// Work Bay Update Schema - exclude id, workshopId, createdAt, updatedAt
export const updateWorkBaySchema = z.object({
  bayName: z.string().min(1).max(100).optional(),
  // Protect status, currentVehicle, assignedMechanicId, currentJobId - these are set by assign/clear bay
});

export type UpdateWorkBay = z.infer<typeof updateWorkBaySchema>;

// Workshop Expense Update Schema - exclude id, workshopId, createdAt
export const updateWorkshopExpenseSchema = z.object({
  category: z.string().min(1).max(100).optional(),
  description: z.string().min(1).optional(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
  date: z.coerce.date().optional(),
  notes: z.string().nullable().optional(),
});

export type UpdateWorkshopExpense = z.infer<typeof updateWorkshopExpenseSchema>;

// ===== Phase 4: Financial Management Tables =====

// Financial Transactions table (Income & Expenses tracking)
export const financialTransactions = pgTable("financial_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workshopId: varchar("workshop_id").notNull().references(() => workshops.id, { onDelete: 'cascade' }),
  type: varchar("type", { length: 20 }).$type<'income' | 'expense'>().notNull(),
  source: varchar("source", { length: 50 }).$type<'job' | 'purchase' | 'salary' | 'misc' | 'payroll'>().notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
  referenceId: varchar("reference_id", { length: 255 }), // FK to job/purchase/payroll etc
  description: text("description"),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const financialTransactionsRelations = relations(financialTransactions, ({ one }) => ({
  workshop: one(workshops, {
    fields: [financialTransactions.workshopId],
    references: [workshops.id],
  }),
  creator: one(users, {
    fields: [financialTransactions.createdBy],
    references: [users.id],
  }),
}));

export const insertFinancialTransactionSchema = createInsertSchema(financialTransactions).omit({
  id: true,
  createdAt: true,
});

export type InsertFinancialTransaction = z.infer<typeof insertFinancialTransactionSchema>;
export type FinancialTransaction = typeof financialTransactions.$inferSelect;

// Staff Payroll table (Salary payments)
export const staffPayroll = pgTable("staff_payroll", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workshopId: varchar("workshop_id").notNull().references(() => workshops.id, { onDelete: 'cascade' }),
  staffId: varchar("staff_id").notNull().references(() => workshopStaff.id, { onDelete: 'cascade' }),
  baseSalary: decimal("base_salary", { precision: 10, scale: 2 }).notNull().default('0'),
  commission: decimal("commission", { precision: 10, scale: 2 }).notNull().default('0'),
  totalPaid: decimal("total_paid", { precision: 10, scale: 2 }).notNull(),
  payPeriodStart: timestamp("pay_period_start").notNull(),
  payPeriodEnd: timestamp("pay_period_end").notNull(),
  payDate: timestamp("pay_date").notNull(),
  remarks: text("remarks"),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const staffPayrollRelations = relations(staffPayroll, ({ one }) => ({
  workshop: one(workshops, {
    fields: [staffPayroll.workshopId],
    references: [workshops.id],
  }),
  staff: one(workshopStaff, {
    fields: [staffPayroll.staffId],
    references: [workshopStaff.id],
  }),
  creator: one(users, {
    fields: [staffPayroll.createdBy],
    references: [users.id],
  }),
}));

export const insertStaffPayrollSchema = createInsertSchema(staffPayroll).omit({
  id: true,
  createdAt: true,
}).extend({
  payPeriodStart: z.coerce.date(),
  payPeriodEnd: z.coerce.date(),
  payDate: z.coerce.date(),
});

export type InsertStaffPayroll = z.infer<typeof insertStaffPayrollSchema>;
export type StaffPayroll = typeof staffPayroll.$inferSelect;

// Miscellaneous Expenses table
export const miscExpenses = pgTable("misc_expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workshopId: varchar("workshop_id").notNull().references(() => workshops.id, { onDelete: 'cascade' }),
  category: varchar("category", { length: 100 }).notNull(),
  description: text("description"),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  date: timestamp("date").notNull(),
  receiptUrl: text("receipt_url"), // Optional attachment
  addedBy: varchar("added_by").references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const miscExpensesRelations = relations(miscExpenses, ({ one }) => ({
  workshop: one(workshops, {
    fields: [miscExpenses.workshopId],
    references: [workshops.id],
  }),
  creator: one(users, {
    fields: [miscExpenses.addedBy],
    references: [users.id],
  }),
}));

export const insertMiscExpenseSchema = createInsertSchema(miscExpenses).omit({
  id: true,
  createdAt: true,
}).extend({
  amount: z.union([
    z.string(),
    z.number().transform((num) => num.toFixed(2))
  ]),
  date: z.union([
    z.date(),
    z.string().transform((str) => {
      const date = new Date(str);
      if (isNaN(date.getTime())) {
        throw new Error('Invalid date string');
      }
      return date;
    })
  ])
});

export type InsertMiscExpense = z.infer<typeof insertMiscExpenseSchema>;
export type MiscExpense = typeof miscExpenses.$inferSelect;

// Activity Log table (Audit trail)
export const activityLog = pgTable("activity_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'set null' }),
  workshopId: varchar("workshop_id").references(() => workshops.id, { onDelete: 'set null' }),
  action: varchar("action", { length: 100 }).notNull(), // 'create', 'update', 'delete', 'login', etc
  entity: varchar("entity", { length: 100 }), // 'job', 'staff', 'expense', etc
  entityId: varchar("entity_id", { length: 255 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  status: varchar("status", { length: 20 }).$type<'success' | 'failure'>().default('success'),
  details: jsonb("details"), // Additional context
  createdAt: timestamp("created_at").defaultNow(),
});

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  user: one(users, {
    fields: [activityLog.userId],
    references: [users.id],
  }),
  workshop: one(workshops, {
    fields: [activityLog.workshopId],
    references: [workshops.id],
  }),
}));

export const insertActivityLogSchema = createInsertSchema(activityLog).omit({
  id: true,
  createdAt: true,
});

export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLog.$inferSelect;

// ============================================================================
// GLOBAL MARKETPLACE MODE TABLES
// ============================================================================

// Shopping Cart table (Workshop shopping cart)
export const cart = pgTable("cart", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workshopId: varchar("workshop_id").notNull().references(() => workshops.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const cartRelations = relations(cart, ({ one, many }) => ({
  workshop: one(workshops, {
    fields: [cart.workshopId],
    references: [workshops.id],
  }),
  items: many(cartItems),
}));

export const insertCartSchema = createInsertSchema(cart).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCart = z.infer<typeof insertCartSchema>;
export type Cart = typeof cart.$inferSelect;

// Cart Items table
export const cartItems = pgTable("cart_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cartId: varchar("cart_id").notNull().references(() => cart.id, { onDelete: 'cascade' }),
  partId: varchar("part_id").notNull().references(() => parts.id, { onDelete: 'cascade' }),
  supplierId: varchar("supplier_id").notNull().references(() => suppliers.id),
  quantity: integer("quantity").notNull().default(1),
  deliveryType: varchar("delivery_type", { length: 20 }).$type<DeliveryType>().notNull().default('runner'),
  createdAt: timestamp("created_at").defaultNow(),
});

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(cart, {
    fields: [cartItems.cartId],
    references: [cart.id],
  }),
  part: one(parts, {
    fields: [cartItems.partId],
    references: [parts.id],
  }),
  supplier: one(suppliers, {
    fields: [cartItems.supplierId],
    references: [suppliers.id],
  }),
}));

export const insertCartItemSchema = createInsertSchema(cartItems).omit({
  id: true,
  createdAt: true,
});

export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type CartItem = typeof cartItems.$inferSelect;

// Delivery Offer status enum
export type DeliveryOfferStatus = 'pending' | 'accepted' | 'rejected' | 'expired';

// Delivery Offers table (Auto-assignment offers to runners)
export const deliveryOffers = pgTable("delivery_offers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => supplierOrders.id, { onDelete: 'cascade' }),
  runnerId: varchar("runner_id").notNull().references(() => users.id),
  status: varchar("status", { length: 20 }).$type<DeliveryOfferStatus>().notNull().default('pending'),
  distanceKm: decimal("distance_km", { precision: 6, scale: 2 }),
  offeredAt: timestamp("offered_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const deliveryOffersRelations = relations(deliveryOffers, ({ one }) => ({
  supplierOrder: one(supplierOrders, {
    fields: [deliveryOffers.orderId],
    references: [supplierOrders.id],
  }),
  runner: one(users, {
    fields: [deliveryOffers.runnerId],
    references: [users.id],
  }),
}));

export const insertDeliveryOfferSchema = createInsertSchema(deliveryOffers).omit({
  id: true,
  createdAt: true,
});

export type InsertDeliveryOffer = z.infer<typeof insertDeliveryOfferSchema>;
export type DeliveryOffer = typeof deliveryOffers.$inferSelect;

// Wallets table (User wallet balances)
export const wallets = pgTable("wallets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull().default('0'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const walletsRelations = relations(wallets, ({ one }) => ({
  user: one(users, {
    fields: [wallets.userId],
    references: [users.id],
  }),
}));

export const insertWalletSchema = createInsertSchema(wallets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type Wallet = typeof wallets.$inferSelect;

// Transaction type enum (includes escrow flow types)
export type TransactionType = 
  | 'order_payment'      // Workshop pays for order
  | 'escrow_hold'        // Money held in platform escrow
  | 'escrow_release'     // Money released from escrow
  | 'platform_fee'       // Platform commission deducted
  | 'supplier_payout'    // Payment to supplier
  | 'runner_payout'      // Payment to runner
  | 'delivery_fee'       // Delivery charge
  | 'refund'             // Refund to user
  | 'adjustment'         // Manual adjustment
  | 'topup'              // Wallet top-up
  | 'withdrawal';        // Withdrawal to bank

// Transaction Logs table (Wallet transaction tracking)
export const transactionLogs = pgTable("transaction_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => supplierOrders.id),
  transactionType: varchar("transaction_type", { length: 50 }).$type<TransactionType>().notNull(),
  fromUserId: varchar("from_user_id").references(() => users.id),
  toUserId: varchar("to_user_id").references(() => users.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  platformCommission: decimal("platform_commission", { precision: 10, scale: 2 }).default('0'),
  description: text("description"),
  status: varchar("status", { length: 20 }).$type<'pending' | 'completed' | 'failed'>().notNull().default('completed'),
  createdAt: timestamp("created_at").defaultNow(),
});

export const transactionLogsRelations = relations(transactionLogs, ({ one }) => ({
  order: one(supplierOrders, {
    fields: [transactionLogs.orderId],
    references: [supplierOrders.id],
  }),
  fromUser: one(users, {
    fields: [transactionLogs.fromUserId],
    references: [users.id],
  }),
  toUser: one(users, {
    fields: [transactionLogs.toUserId],
    references: [users.id],
  }),
}));

export const insertTransactionLogSchema = createInsertSchema(transactionLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertTransactionLog = z.infer<typeof insertTransactionLogSchema>;
export type TransactionLog = typeof transactionLogs.$inferSelect;

// ============================================================
// PLATFORM ESCROW SYSTEM
// ============================================================

// Escrow status enum
export type EscrowStatus = 'holding' | 'released' | 'refunded' | 'disputed';

// Platform Escrow table (Holds funds before distribution)
export const platformEscrow = pgTable("platform_escrow", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => supplierOrders.id, { onDelete: 'cascade' }),
  workshopId: varchar("workshop_id").notNull().references(() => workshops.id),
  supplierId: varchar("supplier_id").notNull().references(() => suppliers.id),
  runnerId: varchar("runner_id").references(() => users.id), // Optional - only if delivery by runner
  
  // Amount breakdown
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(), // Total paid by workshop
  partsAmount: decimal("parts_amount", { precision: 10, scale: 2 }).notNull(), // Parts cost
  deliveryAmount: decimal("delivery_amount", { precision: 10, scale: 2 }).default('0'), // Delivery fee
  platformFeePercent: decimal("platform_fee_percent", { precision: 5, scale: 2 }).notNull().default('5'), // Platform fee %
  platformFeeAmount: decimal("platform_fee_amount", { precision: 10, scale: 2 }).notNull(), // Calculated platform fee
  
  // Payout amounts (after platform fee deduction)
  supplierPayout: decimal("supplier_payout", { precision: 10, scale: 2 }).notNull(), // Amount for supplier
  runnerPayout: decimal("runner_payout", { precision: 10, scale: 2 }).default('0'), // Amount for runner
  
  // Status tracking
  status: varchar("status", { length: 20 }).$type<EscrowStatus>().notNull().default('holding'),
  holdAt: timestamp("hold_at").defaultNow(), // When funds were held
  releaseAt: timestamp("release_at"), // When funds were released
  releasedBy: varchar("released_by").references(() => users.id), // Admin/system who released
  
  // Notes
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_escrow_order").on(table.orderId),
  index("idx_escrow_status").on(table.status),
  index("idx_escrow_supplier").on(table.supplierId),
  index("idx_escrow_runner").on(table.runnerId),
]);

export const platformEscrowRelations = relations(platformEscrow, ({ one }) => ({
  order: one(supplierOrders, {
    fields: [platformEscrow.orderId],
    references: [supplierOrders.id],
  }),
  workshop: one(workshops, {
    fields: [platformEscrow.workshopId],
    references: [workshops.id],
  }),
  supplier: one(suppliers, {
    fields: [platformEscrow.supplierId],
    references: [suppliers.id],
  }),
  runner: one(users, {
    fields: [platformEscrow.runnerId],
    references: [users.id],
  }),
  releasedByUser: one(users, {
    fields: [platformEscrow.releasedBy],
    references: [users.id],
  }),
}));

export const insertPlatformEscrowSchema = createInsertSchema(platformEscrow).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPlatformEscrow = z.infer<typeof insertPlatformEscrowSchema>;
export type PlatformEscrow = typeof platformEscrow.$inferSelect;

// Platform Revenue table (Tracks platform earnings from fees)
export const platformRevenue = pgTable("platform_revenue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  escrowId: varchar("escrow_id").references(() => platformEscrow.id),
  orderId: varchar("order_id").references(() => supplierOrders.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  feeType: varchar("fee_type", { length: 50 }).$type<'order_commission' | 'delivery_commission' | 'subscription' | 'other'>().notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const platformRevenueRelations = relations(platformRevenue, ({ one }) => ({
  escrow: one(platformEscrow, {
    fields: [platformRevenue.escrowId],
    references: [platformEscrow.id],
  }),
  order: one(supplierOrders, {
    fields: [platformRevenue.orderId],
    references: [supplierOrders.id],
  }),
}));

export const insertPlatformRevenueSchema = createInsertSchema(platformRevenue).omit({
  id: true,
  createdAt: true,
});

export type InsertPlatformRevenue = z.infer<typeof insertPlatformRevenueSchema>;
export type PlatformRevenue = typeof platformRevenue.$inferSelect;

// Platform Settings table (Global configuration)
export const platformSettings = pgTable("platform_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key", { length: 100 }).unique().notNull(),
  value: text("value").notNull(),
  description: text("description"),
  updatedBy: varchar("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const platformSettingsRelations = relations(platformSettings, ({ one }) => ({
  updater: one(users, {
    fields: [platformSettings.updatedBy],
    references: [users.id],
  }),
}));

export const insertPlatformSettingSchema = createInsertSchema(platformSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPlatformSetting = z.infer<typeof insertPlatformSettingSchema>;
export type PlatformSetting = typeof platformSettings.$inferSelect;

// Search Image Log table (Nov 2025: Mock AI image search tracking for Shopee-style marketplace)
export const searchImageLog = pgTable("search_image_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workshopId: varchar("workshop_id").references(() => workshops.id),
  supplierId: varchar("supplier_id").references(() => suppliers.id),
  imageUrl: varchar("image_url", { length: 500 }),
  resultCount: integer("result_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_search_log_workshop").on(table.workshopId),
  index("idx_search_log_supplier").on(table.supplierId),
]);

export const searchImageLogRelations = relations(searchImageLog, ({ one }) => ({
  workshop: one(workshops, {
    fields: [searchImageLog.workshopId],
    references: [workshops.id],
  }),
  supplier: one(suppliers, {
    fields: [searchImageLog.supplierId],
    references: [suppliers.id],
  }),
}));

export const insertSearchImageLogSchema = createInsertSchema(searchImageLog).omit({
  id: true,
  createdAt: true,
});

export type InsertSearchImageLog = z.infer<typeof insertSearchImageLogSchema>;
export type SearchImageLog = typeof searchImageLog.$inferSelect;

// Review target type enum (Nov 12, 2025)
export const reviewTargetTypeEnum = pgEnum('review_target_type', ['workshop', 'supplier', 'product']);
export type ReviewTargetType = 'workshop' | 'supplier' | 'product';

// Reviews table (Nov 12, 2025: Comprehensive rating system for workshops, suppliers, and products)
export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  targetType: reviewTargetTypeEnum("target_type").notNull(),
  targetId: varchar("target_id").notNull(), // workshop.id, supplier.id, or product.id
  rating: integer("rating").notNull(), // 1-5 stars
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_reviews_user").on(table.userId),
  index("idx_reviews_target").on(table.targetType, table.targetId),
  // Prevent duplicate reviews: one review per user per target
  uniqueIndex("idx_reviews_unique").on(table.userId, table.targetType, table.targetId),
]);

export const reviewsRelations = relations(reviews, ({ one }) => ({
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),
}));

export const insertReviewSchema = createInsertSchema(reviews, {
  rating: z.number().min(1).max(5),
  comment: z.string().min(10).max(1000).optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;
