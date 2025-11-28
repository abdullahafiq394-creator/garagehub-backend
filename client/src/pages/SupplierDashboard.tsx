import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Trash2, Package, ShoppingCart, TrendingUp, X, Clock, MessageCircle, Camera } from "lucide-react";
import SupplierChatPanel from "./SupplierChatPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLanguage } from "@/contexts/LanguageContext";
import { Capacitor } from "@capacitor/core";
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from "@capacitor/camera";

const PRODUCT_CATEGORIES = ['OEM', 'Lubricant', 'Battery', 'Tyre', 'Tools', 'Accessories', 'Other'] as const;

type ProductFormData = {
  name: string;
  description?: string;
  category: typeof PRODUCT_CATEGORIES[number];
  price: number;
  stockQuantity: number;
  sku?: string;
  images: string[];
};

export default function SupplierDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  
  const getCategoryTranslationKey = (category: string): string => {
    const categoryLower = category.toLowerCase();
    const keyMap: Record<string, string> = {
      'oem': 'oem',
      'lubricant': 'lubricant',
      'battery': 'battery',
      'tyre': 'tyre',
      'tools': 'tools',
      'accessories': 'accessories',
      'other': 'other',
      'engine': 'engine',
      'transmission': 'transmission',
      'brake': 'brake',
      'brakes': 'brake',
      'suspension': 'suspension',
      'electrical': 'electrical',
      'cooling': 'cooling',
      'body': 'body',
      'interior': 'interior',
      'exterior': 'exterior',
      'wheel': 'wheel',
      'tires': 'tyre',
      'filters': 'filters',
      'ignition': 'ignition',
      'fluids': 'fluids',
    };
    return keyMap[categoryLower] || 'other';
  };
  
  // Schema with translated validation messages
  const productFormSchema = z.object({
    name: z.string().min(1, t("supplier.dashboard.validation.productNameRequired")),
    description: z.string().optional(),
    category: z.enum(PRODUCT_CATEGORIES),
    price: z.coerce.number().positive(t("supplier.dashboard.validation.priceGreaterThanZero")),
    stockQuantity: z.coerce.number().min(0, t("supplier.dashboard.validation.stockMinZero")),
    sku: z.string().optional(),
    images: z.array(z.string().url(t("supplier.dashboard.validation.validUrl"))).max(5, t("supplier.dashboard.validation.maxImages")),
  });
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [imageInputs, setImageInputs] = useState<string[]>(['']);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  // Fetch supplier profile
  const { data: suppliers } = useQuery<any[]>({
    queryKey: ['/api/suppliers'],
  });
  const supplier = suppliers?.find(s => s.userId === user?.id);

  // Fetch products
  const { data: products = [], isLoading: loadingProducts } = useQuery<any[]>({
    queryKey: ['/api/parts', supplier?.id],
    queryFn: async () => {
      if (!supplier?.id) return [];
      const res = await fetch(`/api/parts?supplierId=${supplier.id}`);
      return res.json();
    },
    enabled: !!supplier?.id,
  });

  // Fetch orders
  const { data: orders = [] } = useQuery<any[]>({
    queryKey: ['/api/supplier/orders'],
    enabled: user?.role === 'supplier',
  });

  // Form setup
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: '',
      description: '',
      category: 'OEM',
      price: 0,
      stockQuantity: 0,
      sku: '',
      images: [],
    },
  });

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      return apiRequest('/api/parts', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/parts'] });
      setIsProductDialogOpen(false);
      form.reset();
      setImageInputs(['']);
      toast({ title: t("supplier.dashboard.toasts.success"), description: t("supplier.dashboard.toasts.productCreated") });
    },
    onError: (error: any) => {
      console.error('Create error:', error);
      toast({ title: t("supplier.dashboard.toasts.error"), description: t("supplier.dashboard.toasts.productCreateFailed"), variant: "destructive" });
    },
  });

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ProductFormData }) => {
      return apiRequest(`/api/parts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/parts'] });
      setIsProductDialogOpen(false);
      setEditingProduct(null);
      form.reset();
      setImageInputs(['']);
      toast({ title: t("supplier.dashboard.toasts.success"), description: t("supplier.dashboard.toasts.productUpdated") });
    },
    onError: (error: any) => {
      console.error('Update error:', error);
      toast({ title: t("supplier.dashboard.toasts.error"), description: t("supplier.dashboard.toasts.productUpdateFailed"), variant: "destructive" });
    },
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/parts/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/parts'] });
      setDeleteProductId(null);
      toast({ title: t("supplier.dashboard.toasts.success"), description: t("supplier.dashboard.toasts.productDeleted") });
    },
    onError: (error: any) => {
      console.error('Delete error:', error);
      const errorMessage = error?.message || t("supplier.dashboard.toasts.productDeleteFailed");
      toast({ title: t("supplier.dashboard.toasts.error"), description: errorMessage, variant: "destructive" });
    },
  });

  // Accept order mutation
  const acceptOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return apiRequest(`/api/supplier/orders/${orderId}/accept`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/supplier/orders'] });
      toast({ title: t("supplier.dashboard.toasts.success"), description: t("supplier.dashboard.toasts.orderAccepted") });
    },
    onError: () => {
      toast({ title: t("supplier.dashboard.toasts.error"), description: t("supplier.dashboard.toasts.orderAcceptFailed"), variant: "destructive" });
    },
  });

  // Reject order mutation
  const rejectOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      return apiRequest(`/api/supplier/orders/${orderId}/reject`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/supplier/orders'] });
      toast({ title: t("supplier.dashboard.toasts.success"), description: t("supplier.dashboard.toasts.orderRejected") });
    },
    onError: () => {
      toast({ title: t("supplier.dashboard.toasts.error"), description: t("supplier.dashboard.toasts.orderRejectFailed"), variant: "destructive" });
    },
  });

  const onSubmit = (data: ProductFormData) => {
    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data });
    } else {
      createProductMutation.mutate(data);
    }
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    form.reset({
      name: product.name,
      description: product.description || '',
      category: product.category,
      price: parseFloat(product.price),
      stockQuantity: product.stockQuantity,
      sku: product.sku || '',
      images: product.images || [],
    });
    setImageInputs(product.images?.length > 0 ? product.images : ['']);
    setIsProductDialogOpen(true);
  };

  const handleAddImageInput = () => {
    if (imageInputs.length < 5) {
      setImageInputs([...imageInputs, '']);
    }
  };

  const handleRemoveImageInput = (index: number) => {
    const newInputs = imageInputs.filter((_, i) => i !== index);
    setImageInputs(newInputs.length > 0 ? newInputs : ['']);
    form.setValue('images', newInputs.filter(url => url.trim() !== ''));
  };

  const handleImageInputChange = (index: number, value: string) => {
    const newInputs = [...imageInputs];
    newInputs[index] = value;
    setImageInputs(newInputs);
    form.setValue('images', newInputs.filter(url => url.trim() !== ''));
  };

  // Camera capture and upload
  const handleCameraCapture = async (index: number) => {
    try {
      // Check if camera is available (mobile/native app)
      if (!Capacitor.isNativePlatform()) {
        toast({
          title: t("supplier.manualForm.cameraNotAvailable"),
          description: t("supplier.manualForm.cameraWebNotSupported"),
          variant: "destructive",
        });
        return;
      }

      setUploadingIndex(index);

      // Take photo using Capacitor Camera
      const image = await CapacitorCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
      });

      if (!image.base64String) {
        throw new Error("No image data received");
      }

      // Convert base64 to blob
      const response = await fetch(`data:image/${image.format};base64,${image.base64String}`);
      const blob = await response.blob();
      const file = new File([blob], `product-${Date.now()}.${image.format}`, { type: `image/${image.format}` });

      // Upload to object storage
      const uploadResponse = await fetch('/api/product-images/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType: file.type }),
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { objectId, uploadUrl } = await uploadResponse.json();

      // Upload file
      const uploadResult = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
      });

      if (!uploadResult.ok) {
        throw new Error('Failed to upload image');
      }

      // Finalize upload
      const finalizeResponse = await fetch('/api/product-images', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objectId }),
      });

      if (!finalizeResponse.ok) {
        throw new Error('Failed to finalize upload');
      }

      const { imagePath } = await finalizeResponse.json();

      // Update image URL at index
      handleImageInputChange(index, imagePath);

      toast({
        title: t("supplier.manualForm.imageUploaded"),
        description: t("supplier.manualForm.imageUploadedSuccess"),
      });
    } catch (error) {
      console.error('Camera error:', error);
      toast({
        title: t("supplier.manualForm.cameraError"),
        description: error instanceof Error ? error.message : t("supplier.manualForm.cameraErrorGeneric"),
        variant: "destructive",
      });
    } finally {
      setUploadingIndex(null);
    }
  };

  const stats = {
    totalProducts: products.length,
    totalStock: products.reduce((sum, p) => sum + (p.stockQuantity || 0), 0),
    lowStock: products.filter(p => p.stockQuantity < 10).length,
    pendingOrders: orders.filter((o: any) => o.status === 'created').length,
  };

  if (!user || user.role !== 'supplier') {
    return (
      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle data-testid="text-access-denied">{t("supplier.dashboard.accessDenied")}</CardTitle>
            <CardDescription>{t("supplier.dashboard.needSupplierRole")}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" data-testid="text-page-title">{t("supplier.dashboard.title")}</h1>
          <p className="text-sm sm:text-base text-muted-foreground">{supplier?.name || t("common.loading")}</p>
        </div>
        <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto" onClick={() => { setEditingProduct(null); form.reset(); setImageInputs(['']); }} data-testid="button-add-product">
              <Plus className="mr-2 h-4 w-4" /> {t("supplier.dashboard.buttons.addProduct")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle data-testid="text-dialog-title">{editingProduct ? t("supplier.dashboard.dialogs.editProduct") : t("supplier.dashboard.dialogs.addProduct")}</DialogTitle>
              <DialogDescription>
                {editingProduct ? t("supplier.dashboard.dialogs.updateDesc") : t("supplier.dashboard.dialogs.createDesc")}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("supplier.dashboard.forms.productName")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("supplier.dashboard.forms.productNamePlaceholder")} {...field} data-testid="input-product-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("supplier.dashboard.forms.category")}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-category">
                              <SelectValue placeholder={t("supplier.dashboard.forms.categoryPlaceholder")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PRODUCT_CATEGORIES.map((cat) => (
                              <SelectItem key={cat} value={cat} data-testid={`option-category-${cat.toLowerCase()}`}>
                                {t(`supplier.dashboard.categories.${cat.toLowerCase()}`)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("supplier.dashboard.forms.skuLabel")}</FormLabel>
                        <FormControl>
                          <Input placeholder={t("supplier.dashboard.forms.skuPlaceholder")} {...field} data-testid="input-sku" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("supplier.dashboard.forms.price")}</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder={t("supplier.dashboard.forms.pricePlaceholder")} {...field} data-testid="input-price" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="stockQuantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("supplier.dashboard.forms.stockQuantity")}</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder={t("supplier.dashboard.forms.stockPlaceholder")} {...field} data-testid="input-stock" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("supplier.dashboard.forms.description")}</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder={t("supplier.dashboard.forms.descriptionPlaceholder")} 
                          className="resize-none" 
                          rows={3}
                          {...field} 
                          data-testid="input-description" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <FormLabel>{t("supplier.dashboard.forms.images")}</FormLabel>
                  <FormDescription>{t("supplier.dashboard.forms.imagesDesc")}</FormDescription>
                  {imageInputs.map((url, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder={t("supplier.dashboard.forms.imagePlaceholder")}
                        value={url}
                        onChange={(e) => handleImageInputChange(index, e.target.value)}
                        disabled={uploadingIndex === index}
                        data-testid={`input-image-${index}`}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={() => handleCameraCapture(index)}
                        disabled={uploadingIndex !== null}
                        data-testid={`button-camera-${index}`}
                        title={t("supplier.manualForm.takePhoto")}
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                      {imageInputs.length > 1 && (
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => handleRemoveImageInput(index)}
                          disabled={uploadingIndex !== null}
                          data-testid={`button-remove-image-${index}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {imageInputs.length < 5 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddImageInput}
                      disabled={uploadingIndex !== null}
                      data-testid="button-add-image"
                    >
                      <Plus className="mr-2 h-4 w-4" /> {t("supplier.dashboard.forms.addImage")}
                    </Button>
                  )}
                  {form.formState.errors.images && (
                    <p className="text-sm text-destructive">{form.formState.errors.images.message}</p>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsProductDialogOpen(false)}
                    data-testid="button-cancel"
                  >
                    {t("supplier.dashboard.buttons.cancel")}
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createProductMutation.isPending || updateProductMutation.isPending || uploadingIndex !== null}
                    data-testid="button-save-product"
                  >
                    {editingProduct ? t("supplier.dashboard.buttons.updateProduct") : t("supplier.dashboard.buttons.createProduct")}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {supplier && !supplier.isVerified && (
        <Alert className="border-yellow-500/50 bg-yellow-500/10" data-testid="alert-pending-approval">
          <Clock className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-600">{t("supplier.dashboard.alert.pendingApproval")}</AlertTitle>
          <AlertDescription className="text-yellow-700">
            {t("supplier.dashboard.alert.pendingApprovalDesc")}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">{t("supplier.dashboard.cards.totalProducts")}</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold" data-testid="stat-total-products">{stats.totalProducts}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">{t("supplier.dashboard.cards.totalStock")}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold" data-testid="stat-total-stock">{stats.totalStock}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">{t("supplier.dashboard.cards.lowStockItems")}</CardTitle>
            <Package className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-destructive" data-testid="stat-low-stock">{stats.lowStock}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">{t("supplier.dashboard.cards.pendingOrders")}</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold" data-testid="stat-pending-orders">{stats.pendingOrders}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="products" className="space-y-4">
        <TabsList>
          <TabsTrigger value="products" data-testid="tab-products">{t("supplier.dashboard.tabs.products")}</TabsTrigger>
          <TabsTrigger value="orders" data-testid="tab-orders">{t("supplier.dashboard.tabs.orders")}</TabsTrigger>
          <TabsTrigger value="messages" data-testid="tab-messages">
            <MessageCircle className="h-4 w-4 mr-2" />
            {t("supplier.dashboard.tabs.messages")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("supplier.dashboard.cards.productInventory")}</CardTitle>
              <CardDescription>{t("supplier.dashboard.cards.productInventoryDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingProducts ? (
                <div className="text-center py-8 text-muted-foreground">{t("supplier.dashboard.empty.loading")}</div>
              ) : products.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="text-no-products">
                  {t("supplier.dashboard.empty.noProducts")}
                </div>
              ) : (
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                  {products.map((product: any) => {
                    const productImage = product.images?.[0] || product.imageUrl;
                    
                    return (
                    <Card key={product.id} className="overflow-hidden flex flex-col" data-testid={`card-product-${product.id}`}>
                      {productImage && (
                        <div className="relative w-full h-48 bg-muted flex-shrink-0">
                          <img 
                            src={productImage} 
                            alt={product.name}
                            className="w-full h-full object-cover"
                            data-testid={`img-product-${product.id}`}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      <CardHeader className="p-4 flex-shrink-0">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base truncate" data-testid={`text-product-name-${product.id}`}>
                              {product.name}
                            </CardTitle>
                            <div className="flex gap-1 mt-2 flex-wrap">
                              <Badge variant="secondary" className="text-xs gap-1 shrink-0" data-testid={`badge-category-${product.id}`}>
                                {t(`supplier.dashboard.categories.${getCategoryTranslationKey(product.category)}`)}
                              </Badge>
                              {product.stockQuantity < 10 && (
                                <Badge variant="destructive" className="text-xs gap-1 shrink-0" data-testid={`badge-low-stock-${product.id}`}>
                                  {t("supplier.dashboard.cards.lowStock")}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditProduct(product)}
                              data-testid={`button-edit-${product.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteProductId(product.id)}
                              data-testid={`button-delete-${product.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 pt-0 space-y-3 flex-1 flex flex-col">
                        {product.description && (
                          <div className="overflow-hidden">
                            <p className="text-sm text-muted-foreground line-clamp-2" data-testid={`text-description-${product.id}`}>
                              {product.description}
                            </p>
                          </div>
                        )}
                        <div className="flex justify-between items-end gap-4 mt-auto">
                          <div className="flex-1">
                            <div className="text-xl sm:text-2xl font-bold" data-testid={`text-price-${product.id}`}>
                              RM {parseFloat(product.price).toFixed(2)}
                            </div>
                            <div className="text-xs sm:text-sm text-muted-foreground" data-testid={`text-stock-${product.id}`}>
                              {t("supplier.dashboard.stock")}: {product.stockQuantity}
                            </div>
                          </div>
                          {product.sku && (
                            <div className="text-xs text-muted-foreground text-right flex-shrink-0" data-testid={`text-sku-${product.id}`}>
                              {t("common.sku")}: {product.sku}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )})}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("supplier.dashboard.cards.incomingOrders")}</CardTitle>
              <CardDescription>{t("supplier.dashboard.cards.incomingOrdersDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="text-no-orders">
                  {t("supplier.dashboard.empty.noOrders")}
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order: any) => (
                    <Card key={order.id} data-testid={`card-order-${order.id}`}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-base" data-testid={`text-order-id-${order.id}`}>
                              {t("supplier.dashboard.order")}{order.id.slice(0, 8)}
                            </CardTitle>
                            <CardDescription data-testid={`text-order-date-${order.id}`}>
                              {new Date(order.createdAt).toLocaleDateString()}
                            </CardDescription>
                          </div>
                          <Badge 
                            variant={order.status === 'created' ? 'default' : 'secondary'}
                            data-testid={`badge-status-${order.id}`}
                          >
                            {order.status}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">{t("supplier.dashboard.totalAmount")}</span>
                          <span className="font-semibold" data-testid={`text-amount-${order.id}`}>
                            RM {parseFloat(order.totalAmount).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">{t("supplier.dashboard.deliveryType")}</span>
                          <span data-testid={`text-delivery-${order.id}`}>{order.deliveryType}</span>
                        </div>
                        {order.status === 'created' && (
                          <div className="pt-2 flex gap-2">
                            <Button 
                              className="flex-1" 
                              onClick={() => acceptOrderMutation.mutate(order.id)}
                              disabled={acceptOrderMutation.isPending || rejectOrderMutation.isPending}
                              data-testid={`button-accept-${order.id}`}
                            >
                              {t("supplier.dashboard.buttons.accept")}
                            </Button>
                            <Button 
                              variant="destructive"
                              className="flex-1" 
                              onClick={() => rejectOrderMutation.mutate(order.id)}
                              disabled={acceptOrderMutation.isPending || rejectOrderMutation.isPending}
                              data-testid={`button-reject-${order.id}`}
                            >
                              {t("supplier.dashboard.buttons.reject")}
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messages" className="space-y-4">
          {supplier?.id && user?.id && (
            <SupplierChatPanel supplierId={supplier.id} userId={user.id} />
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!deleteProductId} onOpenChange={() => setDeleteProductId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle data-testid="text-delete-confirm-title">{t("supplier.dashboard.dialogs.deleteProduct")}</AlertDialogTitle>
            <AlertDialogDescription data-testid="text-delete-confirm-message">
              {t("supplier.dashboard.dialogs.deleteConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">{t("supplier.dashboard.buttons.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteProductId && deleteProductMutation.mutate(deleteProductId)}
              data-testid="button-confirm-delete"
            >
              {t("supplier.dashboard.buttons.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
