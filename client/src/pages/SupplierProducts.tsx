import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPartSchema, type InsertPart, type Part } from "@shared/schema";
import { Plus, Edit, Trash2, Package } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSuppliers } from "@/hooks/api/useSuppliers";
import { useParts, useUpdatePart, useDeletePart } from "@/hooks/api/useParts";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BulkUploadDialog } from "@/components/supplier/BulkUploadDialog";

export default function SupplierProducts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [deletingPartId, setDeletingPartId] = useState<string | null>(null);

  const { data: suppliers } = useSuppliers();
  const userSupplier = suppliers?.find(s => s.userId === user?.id);
  
  const { data: parts, isLoading } = useParts(userSupplier?.id);
  const updatePartMutation = useUpdatePart();
  const deletePartMutation = useDeletePart();

  const editForm = useForm<InsertPart>({
    resolver: zodResolver(insertPartSchema),
  });

  const handleEditProduct = async (data: InsertPart) => {
    if (!editingPart) return;

    try {
      await updatePartMutation.mutateAsync({
        id: editingPart.id,
        data,
      });
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
      setEditingPart(null);
      editForm.reset();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update product",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProduct = async () => {
    if (!deletingPartId) return;

    try {
      await deletePartMutation.mutateAsync(deletingPartId);
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
      setDeletingPartId(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (part: Part) => {
    setEditingPart(part);
    editForm.reset({
      supplierId: part.supplierId,
      name: part.name,
      sku: part.sku || "",
      description: part.description || "",
      category: part.category,
      partCategory: part.partCategory,
      price: part.price,
      stockQuantity: part.stockQuantity,
      imageUrl: part.imageUrl || "",
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Product Management</h1>
          <p className="text-muted-foreground mt-2">
            Add, edit, and manage your product catalog
          </p>
        </div>
        <Button 
          onClick={() => setIsBulkUploadOpen(true)} 
          disabled={!userSupplier}
          data-testid="button-add-product"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Products
        </Button>
      </div>

      {userSupplier && (
        <BulkUploadDialog
          open={isBulkUploadOpen}
          onOpenChange={setIsBulkUploadOpen}
          supplierId={userSupplier.id}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Your Products</CardTitle>
          <CardDescription>
            {parts?.length || 0} product{parts?.length !== 1 ? 's' : ''} in your catalog
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !parts || parts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No products yet</h3>
              <p className="text-muted-foreground mt-2">
                Add your first product to start selling
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parts.map((part) => (
                  <TableRow key={part.id} data-testid={`row-product-${part.id}`}>
                    <TableCell className="font-medium" data-testid={`text-product-name-${part.id}`}>
                      {part.name}
                    </TableCell>
                    <TableCell data-testid={`text-product-sku-${part.id}`}>
                      {part.sku || '-'}
                    </TableCell>
                    <TableCell>{part.category}</TableCell>
                    <TableCell className="text-right">RM {parseFloat(part.price).toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <span className={part.stockQuantity < 20 ? "text-yellow-600" : ""}>
                        {part.stockQuantity}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(part)}
                          data-testid={`button-edit-${part.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingPartId(part.id)}
                          data-testid={`button-delete-${part.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingPart} onOpenChange={(open) => !open && setEditingPart(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update product details
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditProduct)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} data-testid="input-edit-sku" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value ?? ""} data-testid="input-edit-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-category" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="partCategory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Part Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} data-testid="select-edit-part-category">
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
                  control={editForm.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price ($)</FormLabel>
                      <FormControl>
                        <Input {...field} type="number" step="0.01" data-testid="input-edit-price" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="stockQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock Quantity</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          data-testid="input-edit-stock"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Image URL (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ""} data-testid="input-edit-image" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setEditingPart(null)} data-testid="button-cancel-edit">
                  Cancel
                </Button>
                <Button type="submit" disabled={updatePartMutation.isPending} data-testid="button-submit-edit">
                  {updatePartMutation.isPending ? "Updating..." : "Update Product"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingPartId} onOpenChange={(open) => !open && setDeletingPartId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this product? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProduct}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deletePartMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
