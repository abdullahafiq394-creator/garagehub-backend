import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, Search, Store, Package, Plus, Minus, Trash2, CreditCard, MapPin, Filter } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Part, Supplier } from "@shared/schema";

interface MarketplaceTabProps {
  workshopId: string;
}

const PRODUCT_CATEGORIES = ['All', 'OEM', 'Lubricant', 'Battery', 'Tyre', 'Tools', 'Accessories', 'Other'] as const;
const MALAYSIAN_STATES = ['All States', 'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan', 'Pahang', 'Perak', 'Perlis', 'Pulau Pinang', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu', 'Kuala Lumpur', 'Labuan', 'Putrajaya'] as const;

export default function MarketplaceTab({ workshopId }: MarketplaceTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedState, setSelectedState] = useState<string>('All States');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { toast } = useToast();

  // Fetch all parts
  const { data: allParts, isLoading: partsLoading } = useQuery<Part[]>({
    queryKey: ['/api/parts'],
  });

  // Fetch all suppliers
  const { data: suppliers } = useQuery<Supplier[]>({
    queryKey: ['/api/suppliers'],
  });

  // Fetch cart
  const { data: cartData, isLoading: cartLoading } = useQuery<{ cart: any; items: any[] }>({
    queryKey: ['/api/cart'],
  });

  const cart = cartData?.cart;
  const cartItems = cartData?.items || [];

  // Filter parts
  const filteredParts = allParts?.filter((part) => {
    const supplier = suppliers?.find(s => s.id === part.supplierId);
    const matchesSearch = part.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      part.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || part.category === selectedCategory;
    const matchesState = selectedState === 'All States' || supplier?.state === selectedState;
    const inStock = part.stockQuantity > 0;
    return matchesSearch && matchesCategory && matchesState && inStock;
  }) || [];

  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: async ({ partId, supplierId, quantity }: { partId: string; supplierId: string; quantity: number }) => {
      return apiRequest('/api/cart/items', {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ partId, supplierId, quantity, deliveryType: 'runner' }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      toast({ title: "Success", description: "Item added to cart" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add item to cart", variant: "destructive" });
    },
  });

  // Update cart item mutation
  const updateCartItemMutation = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      return apiRequest(`/api/cart/items/${id}`, {
        method: 'PATCH',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ quantity }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update quantity", variant: "destructive" });
    },
  });

  // Remove from cart mutation
  const removeFromCartMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/cart/items/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      toast({ title: "Success", description: "Item removed from cart" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove item", variant: "destructive" });
    },
  });

  // Checkout mutation
  const checkoutMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/cart/checkout', {
        method: 'POST',
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      setIsCartOpen(false);
      toast({ 
        title: "Success", 
        description: `${data.orders.length} order(s) created successfully` 
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to complete checkout", variant: "destructive" });
    },
  });

  // Calculate cart totals
  const cartTotal = cartItems.reduce((sum: number, item: any) => 
    sum + (parseFloat(item.partPrice) * item.quantity), 0
  );

  const cartCount = cartItems.reduce((sum: number, item: any) => sum + item.quantity, 0);

  // Group cart items by supplier
  const cartItemsBySupplierId: Record<string, any[]> = {};
  cartItems.forEach((item: any) => {
    if (!cartItemsBySupplierId[item.supplierId]) {
      cartItemsBySupplierId[item.supplierId] = [];
    }
    cartItemsBySupplierId[item.supplierId].push(item);
  });

  return (
    <div className="space-y-6">
      {/* Header with Cart Button */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Marketplace</h2>
          <p className="text-muted-foreground">Browse and order parts from suppliers nationwide</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setIsCartOpen(true)}
          className="relative"
          data-testid="button-open-cart"
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Cart
          {cartCount > 0 && (
            <Badge className="ml-2" variant="secondary" data-testid="badge-cart-count">
              {cartCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Filters */}
      <Card className="card-glow">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            <CardTitle>Filters</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-products"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger data-testid="select-category">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {PRODUCT_CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat} data-testid={`option-category-${cat}`}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedState} onValueChange={setSelectedState}>
              <SelectTrigger data-testid="select-state">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                {MALAYSIAN_STATES.map(state => (
                  <SelectItem key={state} value={state} data-testid={`option-state-${state}`}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {partsLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-32 w-full mb-4" />
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))
        ) : filteredParts.length === 0 ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center text-muted-foreground py-12">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No products found matching your criteria</p>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          filteredParts.map((part) => {
            const supplier = suppliers?.find(s => s.id === part.supplierId);
            const firstImage = part.images && part.images.length > 0 ? part.images[0] : null;

            return (
              <Card key={part.id} className="hover-elevate" data-testid={`card-product-${part.id}`}>
                <CardContent className="pt-6">
                  {firstImage && (
                    <div className="mb-4 rounded-md overflow-hidden bg-muted h-32">
                      <img 
                        src={firstImage} 
                        alt={part.name}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold" data-testid={`text-name-${part.id}`}>{part.name}</h3>
                      <Badge variant="outline" data-testid={`badge-category-${part.id}`}>
                        {part.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-description-${part.id}`}>
                      {part.description || 'No description available'}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Store className="h-4 w-4" />
                      <span data-testid={`text-supplier-${part.id}`}>{supplier?.name || 'Unknown Supplier'}</span>
                    </div>
                    {supplier?.state && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span data-testid={`text-location-${part.id}`}>{supplier.city}, {supplier.state}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-2">
                      <div>
                        <p className="text-2xl font-bold" data-testid={`text-price-${part.id}`}>
                          RM {parseFloat(part.price).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground" data-testid={`text-stock-${part.id}`}>
                          {part.stockQuantity} in stock
                        </p>
                      </div>
                      <Button 
                        size="sm"
                        onClick={() => addToCartMutation.mutate({ 
                          partId: part.id, 
                          supplierId: part.supplierId, 
                          quantity: 1 
                        })}
                        disabled={addToCartMutation.isPending || part.stockQuantity < 1}
                        data-testid={`button-add-cart-${part.id}`}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Shopping Cart Dialog */}
      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-cart-title">Shopping Cart</DialogTitle>
            <DialogDescription>
              Review your items before checkout
            </DialogDescription>
          </DialogHeader>

          {cartLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : cartItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Your cart is empty</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Cart Items by Supplier */}
              {Object.entries(cartItemsBySupplierId).map(([supplierId, items]) => (
                <Card key={supplierId}>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Store className="h-4 w-4" />
                      {items[0]?.supplierName || 'Unknown Supplier'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {items.map((item: any) => (
                      <div key={item.id} className="flex items-center gap-4" data-testid={`cart-item-${item.id}`}>
                        <div className="flex-1">
                          <p className="font-medium" data-testid={`text-cart-item-name-${item.id}`}>
                            {item.partName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            RM {parseFloat(item.partPrice).toFixed(2)} each
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => {
                              if (item.quantity > 1) {
                                updateCartItemMutation.mutate({ id: item.id, quantity: item.quantity - 1 });
                              }
                            }}
                            disabled={updateCartItemMutation.isPending || item.quantity <= 1}
                            data-testid={`button-decrease-${item.id}`}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-12 text-center" data-testid={`text-quantity-${item.id}`}>
                            {item.quantity}
                          </span>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => updateCartItemMutation.mutate({ id: item.id, quantity: item.quantity + 1 })}
                            disabled={updateCartItemMutation.isPending || item.quantity >= item.partStock}
                            data-testid={`button-increase-${item.id}`}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="destructive"
                            onClick={() => removeFromCartMutation.mutate(item.id)}
                            disabled={removeFromCartMutation.isPending}
                            data-testid={`button-remove-${item.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="font-semibold w-24 text-right" data-testid={`text-subtotal-${item.id}`}>
                          RM {(parseFloat(item.partPrice) * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}

              {/* Cart Total */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between text-lg font-bold">
                  <span>Total</span>
                  <span data-testid="text-cart-total">RM {cartTotal.toFixed(2)}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {Object.keys(cartItemsBySupplierId).length} supplier(s) • {cartCount} item(s)
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCartOpen(false)} data-testid="button-close-cart">
              Continue Shopping
            </Button>
            <Button 
              onClick={() => checkoutMutation.mutate()}
              disabled={checkoutMutation.isPending || cartItems.length === 0}
              data-testid="button-checkout"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              {checkoutMutation.isPending ? "Processing..." : "Checkout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
