import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Truck, Store, AlertCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Part } from "@shared/schema";
import type { DeliveryType } from "@shared/schema";

interface DeliverySelectionModalProps {
  product: Part & { supplierName?: string };
  quantity: number;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (deliveryType: DeliveryType) => void;
}

export default function DeliverySelectionModal({
  product,
  quantity,
  isOpen,
  onClose,
  onConfirm,
}: DeliverySelectionModalProps) {
  const { t } = useLanguage();
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("pickup");

  const subtotal = parseFloat(product.price) * quantity;

  const handleConfirm = () => {
    onConfirm(deliveryType);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle data-testid="text-delivery-modal-title">
            {t('marketplace.selectDelivery')}
          </DialogTitle>
          <DialogDescription>
            {t('marketplace.selectDeliveryDesc')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Product Summary */}
          <div className="bg-muted rounded-lg p-4">
            <div className="flex items-start gap-3">
              {product.images?.[0] && (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-16 h-16 object-cover rounded"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium line-clamp-2 text-sm" data-testid="text-modal-product-name">
                  {product.name}
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-sm text-muted-foreground">
                    RM {parseFloat(product.price).toFixed(2)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    × {quantity}
                  </span>
                </div>
                <p className="font-semibold mt-1" data-testid="text-modal-subtotal">
                  RM {subtotal.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Delivery Method Selection */}
          <RadioGroup value={deliveryType} onValueChange={(v) => setDeliveryType(v as DeliveryType)}>
            {/* Pickup Option */}
            <div className="flex items-start space-x-3 border rounded-lg p-4 hover-elevate cursor-pointer">
              <RadioGroupItem value="pickup" id="pickup" data-testid="radio-pickup" />
              <Label htmlFor="pickup" className="flex-1 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Store className="w-5 h-5 text-primary" />
                    <span className="font-semibold">{t('marketplace.pickup')}</span>
                  </div>
                  <Badge variant="secondary">{t('marketplace.free')}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {t('marketplace.pickupDesc')}
                </p>
                <div className="mt-2 p-2 bg-primary/10 rounded border border-primary/20">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-primary">
                      {t('marketplace.pickupIdInfo')}
                    </p>
                  </div>
                </div>
              </Label>
            </div>

            {/* Runner Delivery Option */}
            <div className="flex items-start space-x-3 border rounded-lg p-4 hover-elevate cursor-pointer">
              <RadioGroupItem value="runner" id="runner" data-testid="radio-runner" />
              <Label htmlFor="runner" className="flex-1 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-primary" />
                    <span className="font-semibold">{t('marketplace.runnerDelivery')}</span>
                  </div>
                  <Badge variant="outline">{t('marketplace.calculated')}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {t('marketplace.runnerDeliveryDesc')}
                </p>
              </Label>
            </div>
          </RadioGroup>

          {/* Confirm Button */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              data-testid="button-cancel-delivery"
            >
              {t('common.cancel')}
            </Button>
            <Button
              className="flex-1 bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white"
              onClick={handleConfirm}
              data-testid="button-confirm-delivery"
            >
              {t('common.confirm')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
