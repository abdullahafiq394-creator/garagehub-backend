import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Mail, MapPin, Phone, Store, Edit, Camera, Upload } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import type { Supplier, MalaysianState } from "@shared/schema";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useState } from "react";
import { Capacitor } from '@capacitor/core';
import { Camera as CapacitorCamera, CameraResultType, CameraSource } from '@capacitor/camera';

const malaysianStates: MalaysianState[] = [
  'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan',
  'Pahang', 'Perak', 'Perlis', 'Pulau Pinang', 'Sabah',
  'Sarawak', 'Selangor', 'Terengganu', 'Kuala Lumpur',
  'Labuan', 'Putrajaya'
];

const editSupplierSchema = z.object({
  name: z.string().min(1, "Business name is required"),
  description: z.string().optional(),
  logoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  address: z.string().min(1, "Address is required"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  city: z.string().min(1, "City is required"),
  state: z.string() as z.ZodType<MalaysianState>,
});

type EditSupplierForm = z.infer<typeof editSupplierSchema>;

export default function SupplierProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  
  const { data: supplier, isLoading } = useQuery<Supplier>({
    queryKey: ["/api/suppliers/mine"],
  });

  const form = useForm<EditSupplierForm>({
    resolver: zodResolver(editSupplierSchema),
    defaultValues: {
      name: supplier?.name || "",
      description: supplier?.description || "",
      logoUrl: supplier?.logoUrl || "",
      address: supplier?.address || "",
      phone: supplier?.phone || "",
      city: supplier?.city || "",
      state: supplier?.state || "Selangor",
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: EditSupplierForm) => {
      return await apiRequest<Supplier>("/api/suppliers/mine", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers/mine"] });
      setIsEditDialogOpen(false);
      toast({
        title: "Success",
        description: "Supplier profile updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update supplier profile",
      });
    },
  });

  const handleEditClick = () => {
    if (supplier) {
      form.reset({
        name: supplier.name,
        description: supplier.description || "",
        logoUrl: supplier.logoUrl || "",
        address: supplier.address,
        phone: supplier.phone,
        city: supplier.city,
        state: supplier.state,
      });
      setIsEditDialogOpen(true);
    }
  };

  const onSubmit = (data: EditSupplierForm) => {
    updateMutation.mutate(data);
  };

  const handleCameraCapture = async () => {
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      try {
        const photo = await CapacitorCamera.getPhoto({
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
          quality: 90,
          allowEditing: true,
          saveToGallery: false,
        });

        if (photo.dataUrl) {
          await uploadLogoImage(photo.dataUrl, `logo-${Date.now()}.${photo.format}`);
        }
      } catch (error: any) {
        if (error.message !== 'User cancelled photos app') {
          toast({
            title: "Camera Error",
            description: error.message || "Failed to capture photo",
            variant: "destructive",
          });
        }
      }
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          handleFileUpload(file);
        }
      };
      input.click();
    }
  };

  const handleFileSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFileUpload(file);
      }
    };
    input.click();
  };

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      await uploadLogoImage(dataUrl, file.name);
    };
    reader.readAsDataURL(file);
  };

  const uploadLogoImage = async (dataUrl: string, filename: string) => {
    setIsUploadingLogo(true);
    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const contentType = blob.type || 'image/jpeg';

      const uploadResponse = await fetch('/api/product-images/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType }),
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { objectId, uploadUrl } = await uploadResponse.json();

      const uploadResult = await fetch(uploadUrl, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': contentType },
      });

      if (!uploadResult.ok) {
        throw new Error('Failed to upload image');
      }

      const finalizeResponse = await fetch('/api/product-images', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objectId }),
      });

      if (!finalizeResponse.ok) {
        throw new Error('Failed to finalize upload');
      }

      const { imagePath } = await finalizeResponse.json();
      form.setValue('logoUrl', imagePath);

      toast({
        title: "Success",
        description: "Logo uploaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload logo",
        variant: "destructive",
      });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 pb-20">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <Skeleton className="h-8 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-4xl mx-auto space-y-4">
        <Card data-testid="card-supplier-profile" className="overflow-hidden">
          {supplier?.logoUrl && (
            <div className="relative h-32 sm:h-48 bg-gradient-to-r from-orange-400 to-pink-500 overflow-hidden">
              <img 
                src={supplier.logoUrl} 
                alt={supplier.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
          )}
          <CardHeader className={supplier?.logoUrl ? "-mt-16 relative" : ""}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                {supplier?.logoUrl ? (
                  <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full border-4 border-background bg-background overflow-hidden shrink-0">
                    <img 
                      src={supplier.logoUrl} 
                      alt={supplier.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-20 w-20 sm:h-24 sm:w-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shrink-0">
                    <Store className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
                  </div>
                )}
                <div>
                  <CardTitle className="text-xl sm:text-2xl">{supplier?.name || "Supplier Profile"}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {supplier?.description || "Manage your supplier information"}
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" data-testid="button-edit-profile" onClick={handleEditClick} className="shrink-0">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* User Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Account Information</h3>
              <div className="grid gap-4">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">
                      {user?.firstName || user?.lastName 
                        ? `${user?.firstName || ''} ${user?.lastName || ''}`.trim()
                        : "Not set"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{user?.email}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Supplier Info */}
            {supplier && (
              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="text-lg font-semibold">Business Information</h3>
                <div className="grid gap-4">
                  <div className="flex items-center gap-3">
                    <Store className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Business Name</p>
                      <p className="font-medium">{supplier.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="font-medium">
                        {supplier.city}, {supplier.state}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Contact</p>
                      <p className="font-medium">{supplier.phone || "Not set"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`h-3 w-3 rounded-full ${supplier.isVerified ? 'bg-green-500' : 'bg-yellow-500'}`} />
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <p className="font-medium">
                        {supplier.isVerified ? "Verified" : "Pending Verification"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Supplier Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle data-testid="text-edit-dialog-title">Edit Supplier Profile</DialogTitle>
              <DialogDescription>
                Update your business information
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter business name" data-testid="input-business-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Describe your business" rows={3} data-testid="input-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="logoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Shop Logo/Image</FormLabel>
                      <div className="space-y-2">
                        {field.value && (
                          <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-border">
                            <img src={field.value} alt="Logo preview" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleCameraCapture}
                            disabled={isUploadingLogo}
                            data-testid="button-camera-logo"
                          >
                            <Camera className="h-4 w-4 mr-2" />
                            Ambil Foto
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleFileSelect}
                            disabled={isUploadingLogo}
                            data-testid="button-upload-logo"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Pilih Fail
                          </Button>
                        </div>
                        <FormControl>
                          <Input {...field} placeholder="atau masukkan URL gambar" data-testid="input-logo-url" />
                        </FormControl>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter business address" data-testid="input-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter city" data-testid="input-city" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-state">
                              <SelectValue placeholder="Select state" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {malaysianStates.map((state) => (
                              <SelectItem key={state} value={state}>
                                {state}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter phone number" data-testid="input-phone" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                    data-testid="button-cancel-edit"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending}
                    data-testid="button-save-edit"
                  >
                    {updateMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
