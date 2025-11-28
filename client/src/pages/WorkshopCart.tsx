import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShoppingCart, Truck, Package, ArrowLeft, Wallet, CreditCard, QrCode, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Part, User } from "@shared/schema";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

interface CartItem {
  id: string; // Cart item ID for mutations
  part: Part;
  quantity: number;
}

type PaymentMethod = 'wallet' | 'bank_transfer' | 'qr_code';

interface BankDetails {
  bankName: string;
  accountNumber: string;
  accountName: string;
  reference: string;
}

interface QuoteResponse {
  itemsTotal: string;
  deliveryCharge: string;
  totalAmount: string;
  distanceKm?: string;
}

export default function WorkshopCart() {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [, setLocation] = useLocation();
  const [deliveryType, setDeliveryType] = useState<"pickup" | "runner">("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("wallet");
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);
  const [confirmedOrderTotal, setConfirmedOrderTotal] = useState<number>(0);

  const { data: user } = useQuery<User>({
    queryKey: ['/api/auth/user'],
  });

  const { data: walletData } = useQuery<{ balance: number }>({
    queryKey: ['/api/wallet/balance'],
  });

  // Fetch cart from API instead of localStorage (returns flattened structure)
  const { data: cartData, isLoading: cartLoading } = useQuery<{
    cart: any;
    items: Array<{
      id: string;
      partId: string;
      supplierId: string;
      quantity: number;
      partName: string;
      partPrice: string;
      partImage?: any;
      partCategory?: string;
      partStock?: number;
    }>
  }>({
    queryKey: ['/api/cart'],
  });

  // Extract cart items and synthesize Part object from flattened API response
  const cart: CartItem[] = (cartData?.items || []).map(item => ({
    id: item.id,
    // Build Part object from flattened fields returned by getCartItemsWithDetails
    part: {
      id: item.partId,
      supplierId: item.supplierId,
      name: item.partName,
      price: item.partPrice,
      images: item.partImage,
      category: item.partCategory || '',
      stockQuantity: item.partStock || 0,
      // Required Part fields with defaults
      sku: '', // Not returned by cart API
      description: '', // Not returned by cart API
      brand: null,
      model: null,
      year: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Part,
    quantity: item.quantity,
  }));

  // Group cart items by supplier (MUST be before query!)
  const itemsBySupplier = cart.reduce((acc, item) => {
    const supplierId = item.part.supplierId;
    if (!acc[supplierId]) {
      acc[supplierId] = [];
    }
    acc[supplierId].push(item);
    return acc;
  }, {} as Record<string, CartItem[]>);

  // Calculate delivery charges using quote API for ALL suppliers
  const { data: quoteData, isLoading: isQuoteLoading } = useQuery<QuoteResponse | null>({
    queryKey: ['/api/workshop/orders/quote', {
      cacheKey: {
        items: cart.map(i => ({ partId: i.part.id, quantity: i.quantity })),
        deliveryType,
        deliveryAddress, // Include address in query key to trigger refetch when it changes
      },
    }],
    queryFn: async () => {
      if (cart.length === 0) return null;
      
      // Calculate total delivery charge for ALL suppliers
      let totalDeliveryCharge = 0;
      let totalDistanceKm = 0;
      let totalItemsTotal = 0;

      // Group by supplier and calculate delivery for each
      for (const [supplierId, items] of Object.entries(itemsBySupplier)) {
        const itemsArray = items.map(item => ({
          partId: item.part.id,
          quantity: item.quantity,
        }));

        const response: QuoteResponse = await apiRequest('/api/workshop/orders/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            supplierId,
            items: itemsArray,
            deliveryType,
            deliveryAddress: deliveryType === 'runner' ? deliveryAddress : undefined,
          }),
        });

        totalDeliveryCharge += parseFloat(response.deliveryCharge);
        totalItemsTotal += parseFloat(response.itemsTotal);
        if (response.distanceKm) {
          totalDistanceKm = Math.max(totalDistanceKm, parseFloat(response.distanceKm)); // Use max distance
        }
      }

      return {
        itemsTotal: totalItemsTotal.toFixed(2),
        deliveryCharge: totalDeliveryCharge.toFixed(2),
        totalAmount: (totalItemsTotal + totalDeliveryCharge).toFixed(2),
        distanceKm: totalDistanceKm > 0 ? totalDistanceKm.toFixed(2) : undefined,
      };
    },
    enabled: cart.length > 0 && deliveryType === 'runner' && deliveryAddress.trim().length > 0,
  });

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not authenticated");

      // Validate wallet balance for wallet payment
      if (paymentMethod === 'wallet') {
        const walletBalance = walletData?.balance || 0;
        if (walletBalance < cartTotal) {
          throw new Error(t("workshop.cart.toasts.insufficientBalanceDetail")
            .replace("{required}", cartTotal.toFixed(2))
            .replace("{available}", walletBalance.toFixed(2)));
        }
      }

      // Group cart items by supplier
      const itemsBySupplier = cart.reduce((acc, item) => {
        const supplierId = item.part.supplierId;
        if (!acc[supplierId]) {
          acc[supplierId] = [];
        }
        acc[supplierId].push(item);
        return acc;
      }, {} as Record<string, CartItem[]>);

      // Create an order for each supplier with payment method
      const orderPromises = Object.entries(itemsBySupplier).map(async ([supplierId, items]) => {
        const orderData = {
          supplierId,
          items: items.map(item => ({
            partId: item.part.id,
            quantity: item.quantity,
          })),
          deliveryType,
          deliveryAddress: deliveryType === "runner" ? deliveryAddress : undefined,
          notes: notes || undefined,
          paymentMethod,
        };

        const order: any = await apiRequest('/api/workshop/supplier-orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(orderData),
        });

        return order;
      });

      const orders = await Promise.all(orderPromises);
      return orders;
    },
    onSuccess: (orders) => {
      // Handle bank transfer - show bank details
      if (paymentMethod === 'bank_transfer' && orders[0]?.bankDetails) {
        setBankDetails(orders[0].bankDetails);
        toast({
          title: t("workshop.cart.toasts.orderCreated"),
          description: t("workshop.cart.toasts.completeBankTransfer"),
        });
        // Clear cart from backend API
        queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
        queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
        queryClient.invalidateQueries({ queryKey: ['/api/workshop-dashboard/orders'] });
        return; // Don't redirect, show bank details
      }

      // Handle wallet payment - success redirect
      toast({
        title: t("workshop.cart.toasts.paymentSuccessful"),
        description: paymentMethod === 'wallet' ? t("workshop.cart.toasts.orderPlacedWallet") : t("workshop.cart.toasts.orderPlacedPayment"),
      });
      // Clear cart from backend API
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/workshop-dashboard/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet/balance'] });
      setLocation('/workshop/orders');
    },
    onError: (error) => {
      toast({
        title: t("workshop.cart.toasts.orderFailed"),
        description: error instanceof Error ? error.message : t("workshop.cart.toasts.tryAgain"),
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Reset confirmed total on success or failure to avoid stale amounts
      setConfirmedOrderTotal(0);
    },
  });

  const cartSubtotal = cart.reduce((sum, item) => sum + parseFloat(item.part.price) * item.quantity, 0);
  // Only apply delivery charge for runner delivery, not pickup
  const deliveryCharge = deliveryType === 'runner' && quoteData?.deliveryCharge ? parseFloat(quoteData.deliveryCharge) : 0;
  const cartTotal = cartSubtotal + deliveryCharge;

  // Clear quote data when switching from runner to pickup
  useEffect(() => {
    if (deliveryType === 'pickup') {
      // Use invalidateQueries with exact: false to clear ALL quote queries (including those with cacheKey)
      queryClient.invalidateQueries({ queryKey: ['/api/workshop/orders/quote'], exact: false });
    }
  }, [deliveryType]);

  const handleCheckout = () => {
    if (deliveryType === "runner" && !deliveryAddress.trim()) {
      toast({
        title: t("workshop.cart.toasts.addressRequired"),
        description: t("workshop.cart.toasts.addressRequiredDesc"),
        variant: "destructive",
      });
      return;
    }

    // Block checkout if runner delivery quote is loading or missing
    if (deliveryType === "runner" && (!quoteData || isQuoteLoading)) {
      toast({
        title: t("workshop.cart.toasts.calculatingCharge"),
        description: t("workshop.cart.toasts.calculatingChargeDesc"),
        variant: "destructive",
      });
      return;
    }

    // Preserve order total before cart is cleared
    setConfirmedOrderTotal(cartTotal);
    createOrderMutation.mutate();
  };

  // Show loading state while cart is being fetched
  if (cartLoading) {
    return (
      <div className="h-full overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-muted rounded animate-pulse" />
            <div className="space-y-2">
              <div className="h-6 w-32 bg-muted rounded animate-pulse" />
              <div className="h-4 w-48 bg-muted rounded animate-pulse" />
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <div className="h-64 bg-muted rounded animate-pulse" />
            </div>
            <div className="space-y-4">
              <div className="h-96 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show empty cart only if no bank details AND cart is empty (don't hide bank transfer instructions!)
  if (!bankDetails && cart.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h2 className="text-xl font-semibold mb-2" data-testid="text-empty-cart">{t("workshop.cart.emptyCart")}</h2>
          <p className="text-muted-foreground mb-4">{t("workshop.cart.addPartsPrompt")}</p>
          <Link href="/workshop/marketplace">
            <Button data-testid="button-browse-marketplace">{t("workshop.cart.browseMarketplace")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/workshop/marketplace">
            <Button variant="ghost" size="icon" data-testid="button-back-to-marketplace">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-cart-title">{t("workshop.cart.checkout")}</h1>
            <p className="text-sm text-muted-foreground">{t("workshop.cart.reviewOrder")}</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{t("workshop.cart.orderItems")}</CardTitle>
                <CardDescription>
                  {Object.keys(itemsBySupplier).length} {t("workshop.cart.suppliers")}, {cart.length} {t("workshop.cart.items")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(itemsBySupplier).map(([supplierId, items]) => (
                  <div key={supplierId} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold text-sm">{t("workshop.cart.supplierOrder")}</span>
                      <Badge variant="outline" className="ml-auto">
                        RM {items.reduce((sum, item) => sum + parseFloat(item.part.price) * item.quantity, 0).toFixed(2)}
                      </Badge>
                    </div>
                    {items.map(item => (
                      <div key={item.part.id} className="flex items-center justify-between border-t pt-3" data-testid={`cart-item-${item.part.id}`}>
                        <div className="flex-1">
                          <h4 className="font-medium" data-testid={`text-item-name-${item.part.id}`}>{item.part.name}</h4>
                          <p className="text-sm text-muted-foreground">{t("common.sku")}: {item.part.sku}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold" data-testid={`text-item-total-${item.part.id}`}>
                            RM {(parseFloat(item.part.price) * item.quantity).toFixed(2)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {t("workshop.cart.qty")}: {item.quantity} × RM {parseFloat(item.part.price).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("workshop.cart.deliveryOptions")}</CardTitle>
                <CardDescription>{t("workshop.cart.deliveryPrompt")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <RadioGroup value={deliveryType} onValueChange={(v) => setDeliveryType(v as "pickup" | "runner")}>
                  <div className="flex items-start space-x-3 border rounded-lg p-4 hover-elevate">
                    <RadioGroupItem value="pickup" id="pickup" data-testid="radio-pickup" />
                    <Label htmlFor="pickup" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        <span className="font-semibold">{t("workshop.cart.pickup")}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t("workshop.cart.pickupDesc")}
                      </p>
                    </Label>
                  </div>

                  <div className="flex items-start space-x-3 border rounded-lg p-4 hover-elevate">
                    <RadioGroupItem value="runner" id="runner" data-testid="radio-runner" />
                    <Label htmlFor="runner" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Truck className="w-5 h-5" />
                        <span className="font-semibold">{t("workshop.cart.runnerDelivery")}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t("workshop.cart.runnerDeliveryDesc")}
                      </p>
                    </Label>
                  </div>
                </RadioGroup>

                {deliveryType === "runner" && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <Label htmlFor="delivery-address">{t("workshop.cart.deliveryAddress")}</Label>
                    <Textarea
                      id="delivery-address"
                      placeholder={t("workshop.cart.deliveryAddressPlaceholder")}
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      data-testid="input-delivery-address"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="notes">{t("workshop.cart.orderNotes")}</Label>
                  <Textarea
                    id="notes"
                    placeholder={t("workshop.cart.orderNotesPlaceholder")}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    data-testid="input-order-notes"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            {/* Bank Transfer Success Alert */}
            {bankDetails && (
              <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="space-y-3">
                  <div>
                    <p className="font-semibold text-green-900 dark:text-green-100 mb-2">{t("workshop.cart.bankTransferRequired")}</p>
                    <p className="text-sm text-green-800 dark:text-green-200 mb-3">
                      {t("workshop.cart.transferPrompt").replace("{amount}", confirmedOrderTotal.toFixed(2))}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("workshop.cart.bank")}</span>
                      <span className="font-semibold">{bankDetails.bankName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("workshop.cart.account")}</span>
                      <span className="font-semibold">{bankDetails.accountNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("workshop.cart.name")}</span>
                      <span className="font-semibold">{bankDetails.accountName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t("workshop.cart.reference")}</span>
                      <span className="font-mono font-semibold text-primary">{bankDetails.reference}</span>
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => setLocation('/workshop/orders')}
                    data-testid="button-view-orders"
                  >
                    {t("workshop.cart.viewMyOrders")}
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Payment Method Selection */}
            {!bankDetails && (
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>{t("workshop.cart.paymentMethod")}</CardTitle>
                  <CardDescription>{t("workshop.cart.paymentPrompt")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                    {/* Wallet Payment */}
                    <div className="flex items-start space-x-3 border rounded-lg p-4 hover-elevate">
                      <RadioGroupItem value="wallet" id="wallet" data-testid="radio-wallet" />
                      <Label htmlFor="wallet" className="flex-1 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Wallet className="w-5 h-5" />
                            <span className="font-semibold">{t("workshop.cart.wallet")}</span>
                          </div>
                          <Badge variant="outline">
                            RM {(walletData?.balance || 0).toFixed(2)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {t("workshop.cart.walletDesc")}
                        </p>
                      </Label>
                    </div>

                    {/* Bank Transfer */}
                    <div className="flex items-start space-x-3 border rounded-lg p-4 hover-elevate">
                      <RadioGroupItem value="bank_transfer" id="bank_transfer" data-testid="radio-bank-transfer" />
                      <Label htmlFor="bank_transfer" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-5 h-5" />
                          <span className="font-semibold">{t("workshop.cart.bankTransfer")}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {t("workshop.cart.bankTransferDesc")}
                        </p>
                      </Label>
                    </div>

                    {/* QR Code (Disabled) */}
                    <div className="flex items-start space-x-3 border rounded-lg p-4 opacity-60">
                      <RadioGroupItem value="qr_code" id="qr_code" disabled data-testid="radio-qr-code" />
                      <Label htmlFor="qr_code" className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <QrCode className="w-5 h-5" />
                            <span className="font-semibold">{t("workshop.cart.qrCode")}</span>
                          </div>
                          <Badge variant="secondary" className="text-xs">{t("workshop.cart.comingSoon")}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {t("workshop.cart.qrCodeDesc")}
                        </p>
                      </Label>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>
            )}

            {/* Order Summary */}
            {!bankDetails && (
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>{t("workshop.cart.orderSummary")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("workshop.cart.subtotal")}</span>
                      <span data-testid="text-subtotal">RM {cartSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("workshop.cart.delivery")}</span>
                      <span data-testid="text-delivery-fee">
                        {deliveryType === "pickup" ? (
                          t("workshop.cart.free")
                        ) : isQuoteLoading ? (
                          <span className="text-xs">{t("workshop.cart.calculating")}</span>
                        ) : deliveryCharge > 0 ? (
                          <span>
                            RM {deliveryCharge.toFixed(2)}
                            {quoteData?.distanceKm && (
                              <span className="text-xs text-muted-foreground ml-1">
                                ({parseFloat(quoteData.distanceKm).toFixed(1)}km)
                              </span>
                            )}
                          </span>
                        ) : (
                          t("workshop.cart.free")
                        )}
                      </span>
                    </div>
                    <div className="border-t pt-2 flex justify-between font-semibold text-lg">
                      <span>{t("workshop.cart.total")}</span>
                      <span data-testid="text-order-total">RM {cartTotal.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Insufficient Balance Warning */}
                  {paymentMethod === 'wallet' && (walletData?.balance || 0) < cartTotal && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        {t("workshop.cart.insufficientBalance")}
                      </AlertDescription>
                    </Alert>
                  )}

                  <Button
                    size="lg"
                    className="w-full gap-2"
                    onClick={handleCheckout}
                    disabled={
                      createOrderMutation.isPending || 
                      (paymentMethod === 'wallet' && (walletData?.balance || 0) < cartTotal) ||
                      (deliveryType === 'runner' && isQuoteLoading)
                    }
                    data-testid="button-place-order"
                  >
                    {isQuoteLoading ? t("workshop.cart.calculatingDelivery") : createOrderMutation.isPending ? t("workshop.cart.processing") : t("workshop.cart.placeOrder")}
                    <ShoppingCart className="w-5 h-5" />
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    {t("workshop.cart.termsAgreement")}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
