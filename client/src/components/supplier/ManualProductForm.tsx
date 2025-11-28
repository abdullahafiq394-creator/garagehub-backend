import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { insertPartSchema, type InsertPart } from "@shared/schema";
import { useCreatePart } from "@/hooks/api/useParts";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Camera, Plus, X } from "lucide-react";
import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from "@capacitor/camera";

interface ManualProductFormProps {
  supplierId: string;
  onSuccess: () => void;
}

export function ManualProductForm({ supplierId, onSuccess }: ManualProductFormProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const createPartMutation = useCreatePart();
  const [imageUrls, setImageUrls] = useState<string[]>([""]);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  const form = useForm<InsertPart>({
    resolver: zodResolver(insertPartSchema),
    defaultValues: {
      supplierId,
      name: "",
      sku: "",
      description: "",
      category: "General",
      partCategory: "service",
      price: "0.00",
      stockQuantity: 0,
      imageUrl: "",
    },
  });

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
      const newUrls = [...imageUrls];
      newUrls[index] = imagePath;
      setImageUrls(newUrls);

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

  const handleAddImageUrl = () => {
    if (imageUrls.length < 5) {
      setImageUrls([...imageUrls, ""]);
    }
  };

  const handleRemoveImageUrl = (index: number) => {
    const newUrls = imageUrls.filter((_, i) => i !== index);
    setImageUrls(newUrls.length === 0 ? [""] : newUrls);
  };

  const handleImageUrlChange = (index: number, value: string) => {
    const newUrls = [...imageUrls];
    newUrls[index] = value;
    setImageUrls(newUrls);
  };

  const onSubmit = async (data: InsertPart) => {
    try {
      // Filter out empty URLs and use first one as imageUrl
      const validUrls = imageUrls.filter(url => url.trim() !== "");
      const submitData = {
        ...data,
        supplierId,
        imageUrl: validUrls[0] || "",
        images: validUrls.length > 1 ? validUrls : undefined,
      };

      await createPartMutation.mutateAsync(submitData);
      toast({
        title: t("supplier.manualForm.success"),
        description: t("supplier.manualForm.productAdded"),
      });
      form.reset();
      setImageUrls([""]);
      onSuccess();
    } catch (error) {
      toast({
        title: t("supplier.manualForm.error"),
        description: t("supplier.manualForm.productAddFailed"),
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Product Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g., Brake Pads" data-testid="input-product-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="sku"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SKU</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} placeholder="e.g., BP-001" data-testid="input-product-sku" />
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
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea {...field} value={field.value ?? ""} placeholder="Product description..." data-testid="input-product-description" />
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
                <FormLabel>Category</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g., Brakes" data-testid="input-product-category" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="partCategory"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Part Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} data-testid="select-part-category">
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="engine">Engine</SelectItem>
                    <SelectItem value="transmission">Transmission</SelectItem>
                    <SelectItem value="brake">Brake</SelectItem>
                    <SelectItem value="suspension">Suspension</SelectItem>
                    <SelectItem value="electrical">Electrical</SelectItem>
                    <SelectItem value="cooling">Cooling</SelectItem>
                    <SelectItem value="body">Body</SelectItem>
                    <SelectItem value="interior">Interior</SelectItem>
                    <SelectItem value="exterior">Exterior</SelectItem>
                    <SelectItem value="wheel_tyre">Wheel & Tyre</SelectItem>
                    <SelectItem value="fluids">Fluids</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                  </SelectContent>
                </Select>
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
                <FormLabel>Price (RM)</FormLabel>
                <FormControl>
                  <Input {...field} type="number" step="0.01" placeholder="0.00" data-testid="input-product-price" />
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
                <FormLabel>Stock Quantity</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    type="number" 
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    placeholder="0" 
                    data-testid="input-product-stock" 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Image URLs Section */}
        <div className="space-y-3">
          <FormLabel>{t("supplier.manualForm.productImages")} ({t("supplier.manualForm.max5")})</FormLabel>
          <p className="text-sm text-muted-foreground">{t("supplier.manualForm.imageUrlHint")}</p>
          
          {imageUrls.map((url, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={url}
                onChange={(e) => handleImageUrlChange(index, e.target.value)}
                placeholder="https://contoh.com/gambar.jpg"
                disabled={uploadingIndex === index}
                data-testid={`input-image-url-${index}`}
                className="flex-1"
              />
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() => handleCameraCapture(index)}
                disabled={uploadingIndex !== null || createPartMutation.isPending}
                data-testid={`button-camera-${index}`}
                title={t("supplier.manualForm.takePhoto")}
              >
                <Camera className="h-4 w-4" />
              </Button>
              {imageUrls.length > 1 && (
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  onClick={() => handleRemoveImageUrl(index)}
                  disabled={uploadingIndex !== null || createPartMutation.isPending}
                  data-testid={`button-remove-url-${index}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}

          {imageUrls.length < 5 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddImageUrl}
              disabled={uploadingIndex !== null || createPartMutation.isPending}
              data-testid="button-add-image-url"
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("supplier.manualForm.addImageUrl")}
            </Button>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={createPartMutation.isPending || uploadingIndex !== null}
          data-testid="button-submit-product"
        >
          {createPartMutation.isPending ? t("supplier.manualForm.adding") : t("supplier.manualForm.addProduct")}
        </Button>
      </form>
    </Form>
  );
}
