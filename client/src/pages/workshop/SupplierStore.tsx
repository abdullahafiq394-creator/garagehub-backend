import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { MapPin, Star, MessageSquare, Search, Camera, Package, Loader2, Send, ShoppingCart, Filter } from "lucide-react";
import { useSocket } from "@/hooks/useSocket";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Supplier, Part, DeliveryType } from "@shared/schema";
import ImageSearchDialog from "@/components/ImageSearchDialog";
import ProductDetailModal from "@/components/marketplace/ProductDetailModal";
import DeliverySelectionModal from "@/components/marketplace/DeliverySelectionModal";

const BRANDS = ['Perodua', 'Proton', 'Toyota', 'Honda', 'Nissan', 'Mitsubishi', 'Mazda', 'BMW', 'Mercedes', 'VW', 'Hyundai', 'Kia'];
const CATEGORIES = ['Engine', 'Gearbox', 'Body', 'Suspension', 'Electrical', 'Cooling', 'Brakes', 'Lubricant', 'Battery', 'Tyre', 'Tools', 'Accessories', 'Halfcut'];

export default function SupplierStore() {
  const [, params] = useRoute("/workshop/marketplace/shop/:supplierId");
  const [, navigate] = useLocation();
  const supplierId = params?.supplierId;
  const { toast } = useToast();
  const { socket } = useSocket();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [showChat, setShowChat] = useState(false);
  const [showImageSearch, setShowImageSearch] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Part | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);

  const { data: supplier, isLoading: loadingSupplier } = useQuery<any>({
    queryKey: [`/api/marketplace/suppliers/${supplierId}`],
    enabled: !!supplierId,
  });

  const { data: cartData } = useQuery<{ cart: any; items: any[] }>({
    queryKey: ['/api/cart'],
  });

  const cartItemCount = cartData?.items?.reduce((total, item) => total + item.quantity, 0) || 0;

  const { data: products = [], isLoading: loadingProducts } = useQuery<Part[]>({
    queryKey: ["/api/marketplace/suppliers", supplierId, "products", searchQuery, selectedBrand, selectedModel, selectedCategory, inStockOnly],
    enabled: !!supplierId,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (selectedBrand && selectedBrand !== 'all') params.append('brand', selectedBrand);
      if (selectedModel) params.append('model', selectedModel);
      if (selectedCategory && selectedCategory !== 'all') params.append('category', selectedCategory);
      if (inStockOnly) params.append('inStock', '1');
      const response = await fetch(`/api/marketplace/suppliers/${supplierId}/products?${params}`);
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
  });

  const { data: chatMessages = [], isLoading: loadingMessages } = useQuery<any[]>({
    queryKey: [`/api/marketplace/chat/${supplierId}/messages`],
    enabled: !!supplierId && showChat,
  });

  // Socket.io - Join shop room and listen for updates
  useEffect(() => {
    if (!socket || !supplierId) return;
    
    console.log('[Workshop] Joining room:', `shop:${supplierId}`);
    socket.emit("join_room", `shop:${supplierId}`);
    
    const handleProductCreated = (product: Part) => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/suppliers", supplierId, "products"] });
      toast({ title: "New product added!", description: product.name });
    };
    
    const handleProductUpdated = (product: Part) => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/suppliers", supplierId, "products"] });
    };
    
    const handleProductDeleted = ({ id }: { id: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/marketplace/suppliers", supplierId, "products"] });
      toast({ title: "Product removed", variant: "destructive" });
    };

    const handleNewChatMessage = (data: any) => {
      console.log('[Workshop] New chat message received:', data);
      queryClient.invalidateQueries({ queryKey: [`/api/marketplace/chat/${supplierId}/messages`] });
      toast({ title: "New message received!" });
    };

    socket.on("product.created", handleProductCreated);
    socket.on("product.updated", handleProductUpdated);
    socket.on("product.deleted", handleProductDeleted);
    socket.on("chat.new_message", handleNewChatMessage);
    
    console.log('[Workshop] Event listeners registered for room:', `shop:${supplierId}`);

    return () => {
      socket.emit("leave_room", `shop:${supplierId}`);
      socket.off("product.created", handleProductCreated);
      socket.off("product.updated", handleProductUpdated);
      socket.off("product.deleted", handleProductDeleted);
      socket.off("chat.new_message", handleNewChatMessage);
    };
  }, [socket, supplierId]);

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      return apiRequest('POST', `/api/marketplace/chat/${supplierId}/messages`, { message });
    },
    onSuccess: () => {
      setChatMessage("");
      queryClient.invalidateQueries({ queryKey: [`/api/marketplace/chat/${supplierId}/messages`] });
      toast({ title: "Message sent!" });
    },
    onError: () => {
      toast({ title: "Failed to send message", variant: "destructive" });
    },
  });

  const addToCartMutation = useMutation({
    mutationFn: async ({ product, quantity }: { product: Part; quantity: number }) => {
      return apiRequest('POST', '/api/cart/items', {
        partId: product.id,
        quantity,
        deliveryType: "runner",
      });
    },
    onSuccess: (_, { product, quantity }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({ 
        title: "Added to cart!", 
        description: `${product.name} x${quantity} added to cart` 
      });
      setShowProductModal(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add item to cart",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    sendMessageMutation.mutate(chatMessage.trim());
  };

  const filteredProducts = products.filter(p => {
    if (priceRange[0] > 0 || priceRange[1] < 10000) {
      const price = Number(p.price);
      if (price < priceRange[0] || price > priceRange[1]) return false;
    }
    return true;
  });

  if (!supplierId) {
    return <div className="container mx-auto p-6">Invalid supplier ID</div>;
  }

  if (loadingSupplier) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Supplier not found</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const handleProductClick = (product: Part) => {
    setSelectedProduct(product);
    setSelectedQuantity(1);
    setShowProductModal(true);
  };

  const handleAddToCart = (product: Part, quantity: number) => {
    addToCartMutation.mutate({ product, quantity });
  };

  const handleBuyNow = (product: Part, quantity: number) => {
    setSelectedProduct(product);
    setSelectedQuantity(quantity);
    setShowProductModal(false);
    setShowDeliveryModal(true);
  };

  const handleMessageSupplier = (supplierId: string) => {
    setShowProductModal(false);
    setShowChat(true);
  };

  const handleDeliveryConfirm = async (deliveryType: DeliveryType) => {
    if (!selectedProduct) return;
    
    try {
      await apiRequest("POST", "/api/cart/items", {
        partId: selectedProduct.id,
        quantity: selectedQuantity,
        deliveryType,
      });
      
      const result: any = await apiRequest("POST", "/api/cart/checkout", {});
      
      queryClient.invalidateQueries({ queryKey: ['/api/cart/items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      
      setShowDeliveryModal(false);
      setSelectedProduct(null);
      setSelectedQuantity(1);
      
      const order = result.orders?.[0];
      const pickupId = order?.pickupId;
      
      toast({
        title: "Order placed!",
        description: deliveryType === 'pickup' && pickupId
          ? `Your pickup ID: ${pickupId}`
          : deliveryType === 'pickup'
          ? "Your order has been placed for pickup."
          : "Your order has been placed. A runner will be assigned soon.",
      });
      
      navigate("/workshop/orders");
    } catch (error) {
      toast({
        title: "Checkout failed",
        description: "Failed to complete checkout. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-0">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto p-4 sm:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Package className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold">{supplier.name}</h1>
                  {supplier.isVerified && (
                    <Badge>Verified</Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {supplier.city}, {supplier.state}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    {Number(supplier.rating).toFixed(1)}
                  </span>
                  <span>{supplier.productCount} products</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setShowChat(true)} size="sm" data-testid="button-open-chat">
                <MessageSquare className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Chat with Supplier</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate("/workshop/cart")} 
                data-testid="button-view-cart"
                className="relative"
              >
                <ShoppingCart className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Cart</span>
                {cartItemCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    data-testid="badge-cart-count"
                  >
                    {cartItemCount}
                  </Badge>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/workshop/marketplace")} data-testid="button-back-marketplace">
                Back
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-4 sm:p-6">
        <div className="grid lg:grid-cols-[280px_1fr] gap-4 sm:gap-6">
          {/* Left Sidebar - Filters (Desktop) */}
          <div className="hidden lg:block">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Filters</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Brand</Label>
                  <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                    <SelectTrigger data-testid="select-filter-brand">
                      <SelectValue placeholder="All brands" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All brands</SelectItem>
                      {BRANDS.map(brand => (
                        <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Model</Label>
                  <Input
                    placeholder="e.g. Myvi, Civic"
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    data-testid="input-filter-model"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger data-testid="select-filter-category">
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All categories</SelectItem>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="in-stock"
                    checked={inStockOnly}
                    onCheckedChange={(checked) => setInStockOnly(checked as boolean)}
                    data-testid="checkbox-in-stock"
                  />
                  <Label htmlFor="in-stock" className="cursor-pointer">
                    In stock only
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label>Price Range (RM)</Label>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <span>RM{priceRange[0]}</span>
                    <span>-</span>
                    <span>RM{priceRange[1]}</span>
                  </div>
                  <Slider
                    min={0}
                    max={10000}
                    step={100}
                    value={priceRange}
                    onValueChange={setPriceRange}
                    data-testid="slider-price-range"
                  />
                </div>

                <Separator />

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSelectedBrand("all");
                    setSelectedModel("");
                    setSelectedCategory("all");
                    setInStockOnly(false);
                    setPriceRange([0, 10000]);
                  }}
                  data-testid="button-clear-filters"
                >
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Content - Products */}
          <div className="space-y-4">
            {/* Search and Tools */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, SKU, or #code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-products"
                />
              </div>
              <Button onClick={() => setShowImageSearch(true)} data-testid="button-image-search">
                <Camera className="h-4 w-4 mr-2" />
                Search by Image
              </Button>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="lg:hidden" data-testid="button-open-filters-mobile">
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent side="left">
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-6">
                    <div className="space-y-2">
                      <Label>Brand</Label>
                      <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                        <SelectTrigger>
                          <SelectValue placeholder="All brands" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All brands</SelectItem>
                          {BRANDS.map(brand => (
                            <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="in-stock-mobile"
                        checked={inStockOnly}
                        onCheckedChange={(checked) => setInStockOnly(checked as boolean)}
                      />
                      <Label htmlFor="in-stock-mobile">In stock only</Label>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Product Grid */}
            {loadingProducts ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Package className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No products found</h3>
                  <p className="text-muted-foreground">Try adjusting your search or filters</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {filteredProducts.map((product) => (
                  <Card 
                    key={product.id} 
                    className="hover-elevate active-elevate-2 cursor-pointer transition-all" 
                    onClick={() => handleProductClick(product)}
                    data-testid={`card-product-${product.id}`}
                  >
                    <CardHeader className="p-2 sm:p-4">
                      {product.images && product.images.length > 0 ? (
                        <div className="h-28 rounded-md bg-muted mb-2 overflow-hidden">
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://placehold.co/300x300?text=No+Image";
                            }}
                          />
                        </div>
                      ) : (
                        <div className="h-28 rounded-md bg-muted mb-2 flex items-center justify-center">
                          <Package className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground" />
                        </div>
                      )}
                      <CardTitle className="text-xs sm:text-sm line-clamp-2">{product.name}</CardTitle>
                      {product.garagehubCode && (
                        <CardDescription className="text-xs">
                          {product.garagehubCode}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="p-2 sm:p-4 pt-0 space-y-2">
                      <div className="flex flex-col gap-1">
                        <span className="text-lg sm:text-xl font-bold text-cyan-400">RM{Number(product.price).toFixed(2)}</span>
                        <Badge variant={product.stockQuantity > 0 ? "default" : "secondary"} className="text-xs w-fit">
                          {product.stockQuantity > 0 ? "In stock" : "Out"}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chat Sheet */}
      <Sheet open={showChat} onOpenChange={setShowChat}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Chat with {supplier.name}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col h-[calc(100vh-8rem)] mt-6">
            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-8" data-testid="text-loading-messages">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : chatMessages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center" data-testid="text-no-messages">
                    Start a conversation with the supplier
                  </p>
                ) : (
                  chatMessages.map((msg: any) => {
                    const isOwnMessage = msg.senderId === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                        data-testid={`message-${msg.id}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            isOwnMessage
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {new Date(msg.createdAt).toLocaleTimeString('en-MY', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
            <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
              <Textarea
                placeholder="Type your message..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                className="resize-none"
                rows={2}
                data-testid="textarea-chat-message"
              />
              <Button type="submit" size="icon" disabled={sendMessageMutation.isPending} data-testid="button-send-message">
                {sendMessageMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>

      {/* Image Search Dialog */}
      <ImageSearchDialog
        open={showImageSearch}
        onOpenChange={setShowImageSearch}
        supplierId={supplierId}
      />

      {/* Product Details Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={{ ...selectedProduct, supplierName: supplier?.businessName }}
          isOpen={showProductModal}
          onClose={() => setShowProductModal(false)}
          onBuyNow={handleBuyNow}
          onAddToCart={handleAddToCart}
          onMessageSupplier={handleMessageSupplier}
        />
      )}

      {/* Delivery Selection Modal */}
      {selectedProduct && (
        <DeliverySelectionModal
          product={{ ...selectedProduct, supplierName: supplier?.businessName }}
          quantity={selectedQuantity}
          isOpen={showDeliveryModal}
          onClose={() => setShowDeliveryModal(false)}
          onConfirm={handleDeliveryConfirm}
        />
      )}
    </div>
  );
}
