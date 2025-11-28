import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, ChevronRight, ShoppingCart, Package, Info } from "lucide-react";
import type { Part } from "@shared/schema";

interface ProductDetailsModalProps {
  product: Part | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToCart?: (product: Part) => void;
}

export default function ProductDetailsModal({
  product,
  open,
  onOpenChange,
  onAddToCart,
}: ProductDetailsModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Reset image index when product changes
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [product?.id]);

  if (!product) return null;

  const images = (product.images || [product.imageUrl]).filter(Boolean) as string[];

  const hasMultipleImages = images.length > 1;

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleAddToCart = () => {
    if (onAddToCart) {
      onAddToCart(product);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <div className="sticky top-0 bg-background z-10 border-b p-4">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">{product.name}</DialogTitle>
          </DialogHeader>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          {/* Image Carousel */}
          {images.length > 0 ? (
            <div className="relative">
              <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-muted">
                <img
                  src={images[currentImageIndex]}
                  alt={`${product.name} - Image ${currentImageIndex + 1}`}
                  className="w-full h-full object-contain"
                  data-testid={`product-image-${currentImageIndex}`}
                />
                
                {hasMultipleImages && (
                  <>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 hover:bg-black/70 text-white"
                      onClick={prevImage}
                      data-testid="button-prev-image"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 hover:bg-black/70 text-white"
                      onClick={nextImage}
                      data-testid="button-next-image"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </>
                )}
              </div>

              {/* Image Indicators */}
              {hasMultipleImages && (
                <div className="flex justify-center gap-2 mt-3">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentImageIndex
                          ? "bg-cyan-500 w-6"
                          : "bg-zinc-700 hover:bg-zinc-600"
                      }`}
                      data-testid={`indicator-${index}`}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-square w-full bg-muted rounded-xl flex items-center justify-center">
              <Package className="w-16 h-16 text-muted-foreground" />
            </div>
          )}

          {/* SKU Codes */}
          <Card>
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">GarageHub Code</span>
                <Badge variant="secondary" data-testid="text-garagehub-code">
                  {product.garagehubCode || "N/A"}
                </Badge>
              </div>
              <Separator />
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">SKU</span>
                <Badge variant="outline" data-testid="text-sku">
                  {product.sku || "N/A"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Price & Stock */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-cyan-400" data-testid="text-price">
                RM {Number(product.price).toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">
                Stock: <span data-testid="text-stock">{product.stockQuantity}</span> units
              </p>
            </div>
            <Badge
              variant={product.stockQuantity > 0 ? "default" : "destructive"}
              data-testid="badge-stock-status"
            >
              {product.stockQuantity > 0 ? "In Stock" : "Out of Stock"}
            </Badge>
          </div>

          {/* Category & Type */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" data-testid="badge-category">
              {product.category}
            </Badge>
            <Badge variant="outline" data-testid="badge-supplier-type">
              {product.supplierType}
            </Badge>
          </div>

          {/* Description */}
          {product.description && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold">Description</h3>
              </div>
              <p className="text-sm text-muted-foreground" data-testid="text-description">
                {product.description}
              </p>
            </div>
          )}

          {/* Compatibility */}
          {(product.brand || product.model || product.vehicleMake || product.vehicleModel) && (
            <Card>
              <CardContent className="pt-4">
                <h3 className="font-semibold mb-3">Vehicle Compatibility</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {(product.brand || product.vehicleMake) && (
                    <div>
                      <p className="text-muted-foreground">Brand</p>
                      <p className="font-medium" data-testid="text-compatible-brand">
                        {product.brand || product.vehicleMake}
                      </p>
                    </div>
                  )}
                  {(product.model || product.vehicleModel) && (
                    <div>
                      <p className="text-muted-foreground">Model</p>
                      <p className="font-medium" data-testid="text-compatible-model">
                        {product.model || product.vehicleModel}
                      </p>
                    </div>
                  )}
                  {product.vehicleYearFrom && (
                    <div>
                      <p className="text-muted-foreground">Year</p>
                      <p className="font-medium" data-testid="text-compatible-year">
                        {product.vehicleYearFrom}
                        {product.vehicleYearTo && product.vehicleYearTo !== product.vehicleYearFrom && ` - ${product.vehicleYearTo}`}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Add to Cart Button */}
          <Button
            className="w-full h-12 text-base"
            onClick={handleAddToCart}
            disabled={product.stockQuantity === 0}
            data-testid="button-add-to-cart"
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            {product.stockQuantity > 0 ? "Add to Cart" : "Out of Stock"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
