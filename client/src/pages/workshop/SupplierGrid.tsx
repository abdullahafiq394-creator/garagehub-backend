import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, Store, Search, Loader2 } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { useState } from "react";
import type { Supplier } from "@shared/schema";

const STATES = ['Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan', 'Pahang', 'Perak', 'Perlis', 'Pulau Pinang', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu', 'Kuala Lumpur', 'Labuan', 'Putrajaya'];

export default function SupplierGrid() {
  const [, params] = useRoute("/workshop/marketplace/:type");
  const [, navigate] = useLocation();
  const supplierType = params?.type?.toUpperCase() === 'HALFCUT' ? 'Halfcut' : 'OEM';
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedState, setSelectedState] = useState<string>("all");

  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({
    queryKey: ["/api/marketplace/suppliers", supplierType, searchQuery, selectedState],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('type', supplierType);
      if (searchQuery) params.append('q', searchQuery);
      if (selectedState && selectedState !== 'all') params.append('state', selectedState);
      const response = await fetch(`/api/marketplace/suppliers?${params}`);
      if (!response.ok) throw new Error('Failed to fetch suppliers');
      return response.json();
    },
  });

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{supplierType} Suppliers</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Browse {supplierType} parts suppliers across Malaysia
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/workshop/marketplace")} data-testid="button-back-marketplace">
          Back to Marketplace
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search suppliers by name or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-suppliers"
            />
          </div>
        </div>
        <Select value={selectedState} onValueChange={setSelectedState}>
          <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-state-filter">
            <SelectValue placeholder="Filter by state" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All states</SelectItem>
            {STATES.map(state => (
              <SelectItem key={state} value={state}>{state}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : suppliers.length === 0 ? (
        <div className="text-center py-12">
          <Store className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No suppliers found</h3>
          <p className="text-muted-foreground">
            Try adjusting your search or filters
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {suppliers.map((supplier) => (
            <Card 
              key={supplier.id}
              className="hover:shadow-xl transition-all cursor-pointer hover-elevate active-elevate-2 overflow-hidden group flex flex-col"
              onClick={() => navigate(`/workshop/marketplace/shop/${supplier.id}`)}
              data-testid={`card-supplier-${supplier.id}`}
            >
              {/* Shop Logo/Image - SQUARE */}
              <div className="relative aspect-square bg-gradient-to-br from-primary/5 to-accent/5 overflow-hidden">
                {supplier.logoUrl ? (
                  <img 
                    src={supplier.logoUrl} 
                    alt={supplier.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.currentTarget.src = '';
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Store className="w-12 h-12 sm:w-16 sm:h-16 text-muted-foreground/30" />
                  </div>
                )}
                {/* Verified Badge Overlay */}
                {supplier.isVerified && (
                  <Badge className="absolute top-1.5 right-1.5 text-[10px] px-1.5 py-0.5 bg-primary text-primary-foreground shadow-lg">
                    Verified
                  </Badge>
                )}
              </div>

              {/* Shop Info */}
              <CardContent className="p-3 space-y-2 flex-1 flex flex-col">
                <div className="flex-1">
                  <h3 className="font-semibold text-sm sm:text-base text-foreground line-clamp-2 leading-tight mb-1" data-testid={`text-supplier-name-${supplier.id}`}>
                    {supplier.name}
                  </h3>
                  <div className="flex items-start gap-1 text-[11px] text-muted-foreground mb-2">
                    <MapPin className="h-3 w-3 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-1 leading-tight">{supplier.city}, {supplier.state}</span>
                  </div>

                  {supplier.description && (
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-tight">
                      {supplier.description}
                    </p>
                  )}
                </div>

                {/* Rating & Orders */}
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border">
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium text-foreground">{Number(supplier.rating).toFixed(1)}</span>
                  </div>
                  <span className="text-muted-foreground">
                    {supplier.completedOrders} orders
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
