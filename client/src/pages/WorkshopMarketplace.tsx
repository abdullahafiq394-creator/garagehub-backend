import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Store, MapPin, Package, Star, Truck } from "lucide-react";
import type { SupplierSummary } from "@shared/schema";

export default function WorkshopMarketplace() {
  const [searchQuery, setSearchQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("all");

  const { data: suppliers = [], isLoading } = useQuery<SupplierSummary[]>({
    queryKey: ['/api/marketplace/suppliers'],
  });

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          supplier.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesState = stateFilter === "all" || supplier.state === stateFilter;
    return matchesSearch && matchesState;
  });

  const states = Array.from(new Set(suppliers.map(s => s.state)));

  return (
    <div className="h-full flex flex-col">
      <div className="border-b p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold" data-testid="text-marketplace-title">Supplier Stores</h1>
            <p className="text-sm text-muted-foreground">Browse verified suppliers and their products</p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search suppliers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-suppliers"
            />
          </div>
          <Select value={stateFilter} onValueChange={setStateFilter}>
            <SelectTrigger className="w-[200px]" data-testid="select-state-filter">
              <SelectValue placeholder="Filter by state" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              {states.map(state => (
                <SelectItem key={state} value={state}>{state}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Loading suppliers...</p>
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Store className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No suppliers found</p>
            <p className="text-sm text-muted-foreground">Try adjusting your search criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSuppliers.map((supplier) => (
              <Link key={supplier.id} href={`/marketplace/suppliers/${supplier.id}`}>
                <Card
                  className="hover-elevate active-elevate-2 transition-all cursor-pointer"
                  data-testid={`card-supplier-${supplier.id}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2" data-testid={`text-supplier-name-${supplier.id}`}>
                          <Store className="w-5 h-5" />
                          {supplier.name}
                        </CardTitle>
                        <CardDescription className="mt-2">
                          {supplier.description}
                        </CardDescription>
                      </div>
                      {supplier.isVerified && (
                        <Badge variant="default" className="ml-2">Verified</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{supplier.city}, {supplier.state}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Package className="w-4 h-4" />
                      <span data-testid={`text-product-count-${supplier.id}`}>{supplier.productCount} products</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span>{supplier.rating} / 5.0</span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Truck className="w-4 h-4" />
                      <span className="capitalize">{supplier.deliveryMethod === 'both' ? 'Pickup & Delivery' : supplier.deliveryMethod}</span>
                    </div>

                    {supplier.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-2">
                        {supplier.categories.map((cat, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {cat}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <Button className="w-full mt-4" size="sm" data-testid={`button-visit-store-${supplier.id}`}>
                      Visit Store
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
