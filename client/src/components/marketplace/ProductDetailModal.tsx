import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ShoppingCart, MessageCircle, Plus, Minus, X, ChevronLeft, ChevronRight, Package } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Part } from "@shared/schema";

interface ProductDetailModalProps {
  product: Part & { supplierName?: string };
  isOpen: boolean;
  onClose: () => void;
  onBuyNow: (product: Part, quantity: number) => void;
  onAddToCart: (product: Part, quantity: number) => void;
  onMessageSupplier: (supplierId: string) => void;
}

export default function ProductDetailModal({
  product,
  isOpen,
  onClose,
  onBuyNow,
  onAddToCart,
  onMessageSupplier,
}: ProductDetailModalProps) {
  const { t } = useLanguage();
  const [quantity, setQuantity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const images = product.images && product.images.length > 0 
    ? product.images 
    : product.imageUrl 
      ? [product.imageUrl] 
      : [];

  const incrementQuantity = () => {
    if (quantity < product.stockQuantity) {
      setQuantity(quantity + 1);
    }
  };

  const decrementQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const getCategoryDisplay = (category: string, lang: 'en' | 'ms') => {
    const categoryMap: Record<string, {en: string, ms: string}> = {
      'oem': {en: 'OEM', ms: 'OEM'},
      'lubricant': {en: 'Lubricant', ms: 'Pelincir'},
      'battery': {en: 'Battery', ms: 'Bateri'},
      'tyre': {en: 'Tyre', ms: 'Tayar'},
      'tools': {en: 'Tools', ms: 'Alatan'},
      'accessories': {en: 'Accessories', ms: 'Aksesori'},
      'halfcut': {en: 'Halfcut', ms: 'Halfcut'},
      'other': {en: 'Other', ms: 'Lain-lain'},
    };
    
    const normalized = category?.toLowerCase().trim() || 'other';
    return categoryMap[normalized]?.[lang] || categoryMap['other'][lang];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <div className="sticky top-0 right-0 z-50 flex justify-end p-2 bg-background/80 backdrop-blur-sm">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            data-testid="button-close-modal"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6 p-6 pt-0">
          {/* Image Carousel */}
          <div className="space-y-4">
            <div className="relative aspect-square bg-muted rounded-lg overflow-hidden">
              {images.length > 0 ? (
                <>
                  <img
                    src={images[currentImageIndex]}
                    alt={product.name}
                    className="w-full h-full object-contain"
                    data-testid="img-product-detail"
                  />
                  {images.length > 1 && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm hover:bg-background"
                        onClick={prevImage}
                        data-testid="button-prev-image"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm hover:bg-background"
                        onClick={nextImage}
                        data-testid="button-next-image"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                      <div className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-xs">
                        {currentImageIndex + 1}/{images.length}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Package className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Thumbnail Gallery */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`flex-shrink-0 w-16 h-16 rounded border-2 overflow-hidden ${
                      idx === currentImageIndex ? 'border-primary' : 'border-border'
                    }`}
                    data-testid={`button-thumbnail-${idx}`}
                  >
                    <img src={img} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-4">
            {/* Product Name */}
            <div>
              <h2 className="text-2xl font-bold line-clamp-2" data-testid="text-product-name">
                {product.name}
              </h2>
              {product.supplierName && (
                <p className="text-sm text-muted-foreground mt-1">
                  {t('marketplace.by')} <span className="font-medium">{product.supplierName}</span>
                </p>
              )}
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-primary" data-testid="text-product-price">
                RM {parseFloat(product.price).toFixed(2)}
              </span>
            </div>

            {/* Stock & Category */}
            <div className="flex flex-wrap gap-2">
              <Badge variant={product.stockQuantity > 0 ? "default" : "destructive"} data-testid="badge-stock">
                {product.stockQuantity > 0 
                  ? `${t('marketplace.stock')}: ${product.stockQuantity}`
                  : t('marketplace.outOfStock')}
              </Badge>
              <Badge variant="outline" data-testid="badge-category">
                {getCategoryDisplay(product.category, t('_lang') as 'en' | 'ms')}
              </Badge>
              {product.brand && (
                <Badge variant="secondary">{product.brand}</Badge>
              )}
            </div>

            {/* SKU & GarageHub Code */}
            <div className="space-y-1 text-sm text-muted-foreground">
              {product.garagehubCode && (
                <p data-testid="text-garagehub-code">
                  {t('marketplace.code')}: <span className="font-mono font-medium">#{product.garagehubCode}</span>
                </p>
              )}
              {product.sku && (
                <p>SKU: <span className="font-mono">{product.sku}</span></p>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <div>
                <h3 className="font-semibold mb-2">{t('marketplace.description')}</h3>
                <p className="text-sm text-muted-foreground">{product.description}</p>
              </div>
            )}

            {/* Vehicle Compatibility */}
            {(product.vehicleMake || product.vehicleModel) && (
              <div>
                <h3 className="font-semibold mb-2">{t('marketplace.compatibility')}</h3>
                <div className="text-sm space-y-1">
                  {product.vehicleMake && (
                    <p className="text-muted-foreground">
                      {t('marketplace.make')}: <span className="font-medium text-foreground">{product.vehicleMake}</span>
                    </p>
                  )}
                  {product.vehicleModel && (
                    <p className="text-muted-foreground">
                      {t('marketplace.model')}: <span className="font-medium text-foreground">{product.vehicleModel}</span>
                    </p>
                  )}
                  {product.vehicleYearFrom && (
                    <p className="text-muted-foreground">
                      {t('marketplace.year')}: <span className="font-medium text-foreground">
                        {product.vehicleYearFrom}
                        {product.vehicleYearTo && product.vehicleYearTo !== product.vehicleYearFrom 
                          ? ` - ${product.vehicleYearTo}` 
                          : ''}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Quantity Selector */}
            <div>
              <h3 className="font-semibold mb-2">{t('marketplace.quantity')}</h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={decrementQuantity}
                  disabled={quantity <= 1}
                  data-testid="button-decrease-quantity"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  min="1"
                  max={product.stockQuantity}
                  value={quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (val >= 1 && val <= product.stockQuantity) {
                      setQuantity(val);
                    }
                  }}
                  className="w-20 text-center"
                  data-testid="input-quantity"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={incrementQuantity}
                  disabled={quantity >= product.stockQuantity}
                  data-testid="button-increase-quantity"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-4">
              {/* Buy Now - Shopee Orange Style */}
              <Button
                className="w-full bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white"
                size="lg"
                onClick={() => onBuyNow(product, quantity)}
                disabled={product.stockQuantity === 0}
                data-testid="button-buy-now"
              >
                {t('marketplace.buyNow')}
              </Button>

              {/* Add to Cart & Message Supplier */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => onAddToCart(product, quantity)}
                  disabled={product.stockQuantity === 0}
                  data-testid="button-add-to-cart"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  {t('marketplace.addToCart')}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => onMessageSupplier(product.supplierId)}
                  data-testid="button-message-supplier"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  {t('marketplace.chat')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
