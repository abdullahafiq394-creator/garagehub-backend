import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Loader2, Sparkles, CheckCircle2, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCreatePart } from "@/hooks/api/useParts";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPartSchema, type InsertPart } from "@shared/schema";
import { Capacitor } from '@capacitor/core';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';

interface AIImageUploadFormProps {
  supplierId: string;
  onSuccess: () => void;
}

export function AIImageUploadForm({ supplierId, onSuccess }: AIImageUploadFormProps) {
  const { toast } = useToast();
  const createPartMutation = useCreatePart();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiExtracted, setAiExtracted] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: "Please upload an image file",
          variant: "destructive",
        });
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      setAiExtracted(false);
    }
  };

  const handleCameraCapture = async () => {
    // Check if running on native platform (iOS/Android)
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      // Use Capacitor Camera plugin for native mobile
      try {
        const photo = await CapacitorCamera.getPhoto({
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
          quality: 90,
          allowEditing: false,
          saveToGallery: false,
        });

        if (photo.dataUrl) {
          // Convert base64 to File object
          const response = await fetch(photo.dataUrl);
          const blob = await response.blob();
          const file = new File([blob], `product-${Date.now()}.${photo.format}`, {
            type: `image/${photo.format}`,
          });

          setImageFile(file);
          setImagePreview(photo.dataUrl);
          setAiExtracted(false);

          toast({
            title: "Photo Captured",
            description: "Product image captured successfully",
          });
        }
      } catch (error: any) {
        // User cancelled or permission denied
        if (error.message !== 'User cancelled photos app') {
          toast({
            title: "Camera Error",
            description: error.message || "Failed to capture photo",
            variant: "destructive",
          });
        }
      }
    } else {
      // Web fallback: trigger file input with camera capture
      cameraInputRef.current?.click();
    }
  };

  const analyzeImage = async () => {
    if (!imageFile || !imagePreview) {
      toast({
        title: "No Image",
        description: "Please select an image first",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      // Send image to backend for AI analysis
      const formData = new FormData();
      formData.append('image', imageFile);

      const response = await fetch('/api/supplier/products/analyze-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const result = await response.json();

      // Populate form with AI-extracted data (including partCategory)
      form.setValue('name', result.name || '');
      form.setValue('description', result.description || '');
      form.setValue('category', result.category || '');
      form.setValue('partCategory', result.partCategory || 'service');
      form.setValue('price', result.price || '0.00');
      form.setValue('stockQuantity', result.stockQuantity || 0);
      form.setValue('imageUrl', result.imageUrl || '');

      setAiExtracted(true);
      toast({
        title: "AI Analysis Complete",
        description: "Product details extracted! Review and adjust if needed.",
      });
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const onSubmit = async (data: InsertPart) => {
    try {
      await createPartMutation.mutateAsync({ ...data, supplierId });
      toast({
        title: "Success",
        description: "Product added successfully",
      });
      form.reset();
      setImageFile(null);
      setImagePreview(null);
      setAiExtracted(false);
      onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add product",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-dashed bg-muted/20">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="rounded-full bg-primary/10 p-3">
              <Camera className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">AI-Powered Product Recognition</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Upload a product image and let AI extract the details automatically
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <Label>Upload or Capture Product Image</Label>
        <div className="grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleCameraCapture}
            className="w-full gap-2"
            data-testid="button-camera-capture"
          >
            <Camera className="h-4 w-4" />
            Take Photo
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => document.getElementById('product-image')?.click()}
            className="w-full gap-2"
            data-testid="button-upload-file"
          >
            <Upload className="h-4 w-4" />
            Upload File
          </Button>
        </div>
        <Input
          id="product-image"
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
          data-testid="input-product-image"
        />
        <Input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImageChange}
          className="hidden"
          data-testid="input-camera-capture"
        />
      </div>

      {imagePreview && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <img
                src={imagePreview}
                alt="Product preview"
                className="w-full h-64 object-contain rounded-md border"
              />
              <Button
                onClick={analyzeImage}
                disabled={isAnalyzing || aiExtracted}
                className="w-full gap-2"
                data-testid="button-analyze-image"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing with AI...
                  </>
                ) : aiExtracted ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Analysis Complete
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Analyze with AI
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {aiExtracted && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Card className="bg-green-500/5 border-green-500/20">
              <CardContent className="pt-4">
                <div className="flex items-start gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-600">AI Extraction Complete</p>
                    <p className="text-muted-foreground text-xs mt-1">
                      Review the extracted details below and adjust if needed
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-ai-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-ai-category" />
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
                    <Textarea {...field} value={field.value ?? ""} data-testid="input-ai-description" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (RM)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" data-testid="input-ai-price" />
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
                        data-testid="input-ai-stock" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={createPartMutation.isPending}
              data-testid="button-submit-ai-product"
            >
              {createPartMutation.isPending ? "Adding..." : "Add Product"}
            </Button>
          </form>
        </Form>
      )}
    </div>
  );
}
