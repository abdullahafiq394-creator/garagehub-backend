import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, Upload, Loader2, X, ShoppingCart, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import type { Part } from "@shared/schema";

interface ImageSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierId: string;
}

export default function ImageSearchDialog({ open, onOpenChange, supplierId }: ImageSearchDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [results, setResults] = useState<Part[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const searchMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch(`/api/marketplace/image-search/${supplierId}`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Image search failed');
      }
      
      return response.json();
    },
    onSuccess: (data: Part[]) => {
      setResults(data);
      if (data.length === 0) {
        toast({
          title: "No similar products found",
          description: "Try a different image or send this to the supplier via chat",
        });
      }
    },
    onError: () => {
      toast({
        title: "Search failed",
        description: "Could not process the image. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setResults([]);
  };

  const handleSearch = () => {
    if (!selectedFile) return;
    searchMutation.mutate(selectedFile);
  };

  const handleClear = () => {
    setSelectedFile(null);
    setPreviewUrl("");
    setResults([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSendToChat = () => {
    toast({
      title: "Image ready to send",
      description: "Open the chat panel to send this image to the supplier",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Search by Image</DialogTitle>
          <DialogDescription>
            Upload a photo to find similar products in this store
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Upload Area */}
          {!previewUrl ? (
            <div className="border-2 border-dashed rounded-lg p-12 text-center hover:bg-accent/50 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                data-testid="input-image-upload"
              />
              <Camera className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Upload or Capture Image</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Maximum file size: 10MB
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => fileInputRef.current?.click()} data-testid="button-select-image">
                  <Upload className="h-4 w-4 mr-2" />
                  Choose File
                </Button>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} data-testid="button-camera">
                  <Camera className="h-4 w-4 mr-2" />
                  Take Photo
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Selected"
                  className="w-full max-h-64 object-contain rounded-lg bg-muted"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={handleClear}
                  data-testid="button-clear-image"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={handleSearch}
                  disabled={searchMutation.isPending}
                  data-testid="button-search-image"
                >
                  {searchMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4 mr-2" />
                      Search Similar Products
                    </>
                  )}
                </Button>
                
                {results.length === 0 && !searchMutation.isPending && (
                  <Button variant="outline" onClick={handleSendToChat} data-testid="button-send-to-chat">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send to Chat
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Found {results.length} similar product{results.length !== 1 ? 's' : ''}
                </h3>
                <Button variant="outline" size="sm" onClick={handleSendToChat} data-testid="button-send-results-to-chat">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Ask about these
                </Button>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {results.map((product: any) => (
                  <Card key={product.id} className="hover-elevate" data-testid={`card-result-${product.id}`}>
                    <CardHeader className="p-4">
                      {product.images && product.images.length > 0 ? (
                        <div className="aspect-square rounded-md bg-muted mb-3 overflow-hidden">
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://placehold.co/300x300?text=No+Image";
                            }}
                          />
                        </div>
                      ) : null}
                      <CardTitle className="text-base">{product.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {product.garagehubCode}
                        {product.similarityScore && (
                          <Badge variant="secondary" className="ml-2">
                            {Math.round(product.similarityScore * 100)}% match
                          </Badge>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xl font-bold">RM{Number(product.price).toFixed(2)}</span>
                        <Badge variant={product.stockQuantity > 0 ? "default" : "secondary"}>
                          {product.stockQuantity > 0 ? "In stock" : "Out of stock"}
                        </Badge>
                      </div>
                      <Button className="w-full" size="sm" disabled={product.stockQuantity === 0} data-testid={`button-add-result-${product.id}`}>
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Add to Cart
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
