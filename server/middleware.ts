import type { RequestHandler } from "express";
import { storage } from "./storage";
import type { UserRole } from "@shared/schema";

// Role-based authorization middleware
export const requireRole = (allowedRoles: UserRole[]): RequestHandler => {
  return async (req: any, res, next) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user || !user.role) {
        return res.status(403).json({ message: "No role assigned" });
      }

      if (!allowedRoles.includes(user.role as UserRole)) {
        return res.status(403).json({ message: "Forbidden - insufficient permissions" });
      }

      // Attach user to request for later use
      req.currentUser = user;
      next();
    } catch (error) {
      console.error("Role authorization error:", error);
      res.status(500).json({ message: "Authorization check failed" });
    }
  };
};

// Ownership check middleware for workshops
export const requireWorkshopOwnership: RequestHandler = async (req: any, res, next) => {
  try {
    const userId = req.user?.claims?.sub;
    const workshopId = req.params.id || req.body.workshopId;

    if (!workshopId) {
      return res.status(400).json({ message: "Workshop ID required" });
    }

    const workshop = await storage.getWorkshop(workshopId);
    if (!workshop) {
      return res.status(404).json({ message: "Workshop not found" });
    }

    if (workshop.userId !== userId) {
      return res.status(403).json({ message: "Not authorized to access this workshop" });
    }

    next();
  } catch (error) {
    console.error("Workshop ownership check error:", error);
    res.status(500).json({ message: "Ownership check failed" });
  }
};

// Ownership check middleware for suppliers
export const requireSupplierOwnership: RequestHandler = async (req: any, res, next) => {
  try {
    const userId = req.user?.claims?.sub;
    const supplierId = req.params.id || req.body.supplierId;

    if (!supplierId) {
      return res.status(400).json({ message: "Supplier ID required" });
    }

    const supplier = await storage.getSupplier(supplierId);
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    if (supplier.userId !== userId) {
      return res.status(403).json({ message: "Not authorized to access this supplier" });
    }

    next();
  } catch (error) {
    console.error("Supplier ownership check error:", error);
    res.status(500).json({ message: "Ownership check failed" });
  }
};
