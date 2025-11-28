import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Search, Package, ArrowLeft, Upload, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import ProductDetailModal from "@/components/marketplace/ProductDetailModal";
import DeliverySelectionModal from "@/components/marketplace/DeliverySelectionModal";
import type { Part, Supplier, DeliveryType } from "@shared/schema";

interface ProductWithSku extends Part {
  skuDisplay?: string;
}

export default function SupplierStorePage() {
  const [, params] = useRoute("/marketplace/suppliers/:id");
  const supplierId = params?.id;
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [searchQuery, setSearchQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [modelFilter, setModelFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  const [selectedProduct, setSelectedProduct] = useState<(ProductWithSku & { supplierName?: string }) | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [buyQuantity, setBuyQuantity] = useState(1);

  // Fetch supplier info
  const { data: supplier } = useQuery<Supplier>({
    queryKey: ['/api/suppliers', supplierId],
    enabled: !!supplierId,
  });

  // Fetch products with filters
  const { data: products = [], isLoading } = useQuery<ProductWithSku[]>({
    queryKey: ['/api/suppliers', supplierId, 'products', { brand: brandFilter, model: modelFilter, category: categoryFilter, search: searchQuery }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (brandFilter !== "all") params.append("brand", brandFilter);
      if (modelFilter !== "all") params.append("model", modelFilter);
      if (categoryFilter !== "all") params.append("category", categoryFilter);
      if (searchQuery) params.append("search", searchQuery);

      const url = params.toString()
        ? `/api/suppliers/${supplierId}/products/filter?${params}`
        : `/api/suppliers/${supplierId}/products`;
      
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
    enabled: !!supplierId,
  });

  // Image search mutation
  const imageSearchMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("image", file);
      return apiRequest(`/api/suppliers/${supplierId}/search-by-image`, {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Image search completed",
        description: data.message || `Found ${data.results?.length || 0} similar products`,
      });
      queryClient.setQueryData(
        ['/api/suppliers', supplierId, 'products', { brand: brandFilter, model: modelFilter, category: categoryFilter, search: searchQuery }],
        data.results || []
      );
    },
    onError: () => {
      toast({
        title: "Image search failed",
        description: "Failed to search by image. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: async ({ partId, quantity }: { partId: string; quantity: number }) => {
      return apiRequest('/api/workshop/cart/add', {
        method: 'POST',
        body: JSON.stringify({ partId, quantity }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Added to cart",
        description: "Product successfully added to your cart",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/workshop/cart'] });
      setIsProductModalOpen(false);
    },
    onError: () => {
      toast({
        title: "Failed to add",
        description: "Could not add product to cart. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Image must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      setImageFile(file);
      imageSearchMutation.mutate(file);
    }
  };

  const handleProductClick = (product: ProductWithSku) => {
    setSelectedProduct({
      ...product,
      supplierName: supplier?.name,
    });
    setIsProductModalOpen(true);
  };

  const handleBuyNow = (product: Part, quantity: number) => {
    setBuyQuantity(quantity);
    setSelectedProduct({
      ...product,
      supplierName: supplier?.name,
    });
    setIsProductModalOpen(false);
    setIsDeliveryModalOpen(true);
  };

  const handleAddToCart = (product: Part, quantity: number) => {
    addToCartMutation.mutate({
      partId: product.id,
      quantity,
    });
  };

  const handleMessageSupplier = (supplierId: string) => {
    setLocation(`/workshop/chat?shop=${supplierId}`);
  };

  const handleDeliveryConfirm = async (deliveryType: DeliveryType) => {
    if (!selectedProduct) return;

    const items = [{
      partId: selectedProduct.id,
      quantity: buyQuantity,
      price: parseFloat(selectedProduct.price),
    }];

    const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    setLocation(`/workshop/cart?directBuy=true&deliveryType=${deliveryType}&supplierId=${supplierId}`);
    
    addToCartMutation.mutate({
      partId: selectedProduct.id,
      quantity: buyQuantity,
    });
    
    setIsDeliveryModalOpen(false);
    setSelectedProduct(null);
  };

  // Get unique brands, models, categories for filters
  const allProductsForFilters = products;
  const brands = Array.from(new Set(allProductsForFilters.map(p => p.brand).filter(Boolean)));
  const models = Array.from(new Set(allProductsForFilters.map(p => p.model).filter(Boolean)));
  const categories = Array.from(new Set(allProductsForFilters.map(p => p.category)));

  return (
    <div className="h-full flex flex-col">
      <div className="border-b p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/workshop/marketplace">
              <Button
                variant="ghost"
                size="icon"
                data-testid="button-back"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-semibold" data-testid="text-store-name">
                {supplier?.name || "Loading..."}
              </h1>
              <p className="text-sm text-muted-foreground">{supplier?.description}</p>
            </div>
          </div>
          <Badge variant="default">Verified</Badge>
        </div>

        <div className="space-y-3">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search-products"
              />
            </div>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="image-search-upload"
                data-testid="input-image-upload"
              />
              <label htmlFor="image-search-upload">
                <Button
                  variant="outline"
                  className="gap-2"
                  disabled={imageSearchMutation.isPending}
                  asChild
                  data-testid="button-image-search"
                >
                  <span>
                    {imageSearchMutation.isPending ? (
                      <>
                        <Upload className="w-4 h-4 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-4 h-4" />
                        Search by Image
                      </>
                    )}
                  </span>
                </Button>
              </label>
            </div>
          </div>

          <div className="flex gap-4">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px]" data-testid="select-category">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="w-[150px]" data-testid="select-brand">
                <SelectValue placeholder="Brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                {brands.map(brand => (
                  <SelectItem key={brand!} value={brand!}>{brand}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={modelFilter} onValueChange={setModelFilter}>
              <SelectTrigger className="w-[150px]" data-testid="select-model">
                <SelectValue placeholder="Model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Models</SelectItem>
                {models.map(model => (
                  <SelectItem key={model!} value={model!}>{model}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Package className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No products found</p>
            <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {products.map((product) => {
              const displayImage = product.images && product.images.length > 0 
                ? product.images[0] 
                : product.imageUrl;

              return (
                <Card
                  key={product.id}
                  className="hover-elevate active-elevate-2 cursor-pointer flex flex-col overflow-hidden"
                  onClick={() => handleProductClick(product)}
                  data-testid={`card-product-${product.id}`}
                >
                  <div className="relative aspect-square bg-muted">
                    {displayImage ? (
                      <img
                        src={displayImage}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Package className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                    {product.stockQuantity === 0 && (
                      <div className="absolute top-2 left-2">
                        <Badge variant="destructive" className="text-xs">Out of Stock</Badge>
                      </div>
                    )}
                    {product.category && (
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" className="text-xs">{product.category}</Badge>
                      </div>
                    )}
                  </div>
                  
                  <CardContent className="p-3 flex flex-col flex-1">
                    <h3 className="font-medium text-sm line-clamp-2 overflow-hidden mb-2" data-testid={`text-product-name-${product.id}`}>
                      {product.name}
                    </h3>
                    
                    <div className="mt-auto">
                      <div className="text-primary font-bold text-lg" data-testid={`text-price-${product.id}`}>
                        RM {parseFloat(product.price).toFixed(2)}
                      </div>
                      {product.stockQuantity > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Stock: {product.stockQuantity}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {selectedProduct && (
        <>
          <ProductDetailModal
            product={selectedProduct}
            isOpen={isProductModalOpen}
            onClose={() => {
              setIsProductModalOpen(false);
              setSelectedProduct(null);
            }}
            onBuyNow={handleBuyNow}
            onAddToCart={handleAddToCart}
            onMessageSupplier={handleMessageSupplier}
          />

          <DeliverySelectionModal
            product={selectedProduct}
            quantity={buyQuantity}
            isOpen={isDeliveryModalOpen}
            onClose={() => {
              setIsDeliveryModalOpen(false);
              setSelectedProduct(null);
            }}
            onConfirm={handleDeliveryConfirm}
          />
        </>
      )}
    </div>
  );
}
