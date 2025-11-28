import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSuppliers } from "@/hooks/api/useSuppliers";
import { useParts } from "@/hooks/api/useParts";

export default function Parts() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch supplier data
  const { data: suppliers, isLoading: suppliersLoading } = useSuppliers();
  const userSupplier = suppliers?.find(s => s.userId === user?.id);

  // Fetch parts for this supplier
  const { data: parts, isLoading: partsLoading } = useParts(userSupplier?.id);

  const isLoading = suppliersLoading || partsLoading;

  // Filter parts based on search query (client-side filtering)
  const filteredParts = parts?.filter(part => 
    part.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    part.category.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Parts Catalog</h1>
          <p className="text-muted-foreground mt-2">
            Manage your automotive parts inventory
          </p>
        </div>
        <Button data-testid="button-add-part">
          <Plus className="h-4 w-4 mr-2" />
          Add Part
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search parts..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="input-search-parts"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <>
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="space-y-3">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-6 w-full" />
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-full" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : filteredParts.length > 0 ? (
          filteredParts.map((part) => (
            <Card key={part.id} className="hover-elevate" data-testid={`part-${part.id}`}>
              <CardHeader className="space-y-3">
                <div className="flex items-start justify-between">
                  <Badge variant="secondary">{part.category}</Badge>
                  {part.stockQuantity < 20 && (
                    <Badge variant="destructive">Low Stock</Badge>
                  )}
                </div>
                <CardTitle className="text-lg">{part.name}</CardTitle>
                <CardDescription className="flex items-center justify-between">
                  <span className="text-lg font-mono font-semibold text-foreground">
                    RM {part.price}
                  </span>
                  <span className="text-sm">
                    Stock: <span className="font-semibold">{part.stockQuantity}</span>
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button size="sm" className="flex-1" data-testid={`button-edit-${part.id}`}>
                  Edit
                </Button>
                <Button size="sm" variant="outline" className="flex-1" data-testid={`button-view-${part.id}`}>
                  View
                </Button>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "No parts match your search" : "No parts in catalog"}
            </p>
            {!searchQuery && (
              <Button data-testid="button-add-first-part">
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Part
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
