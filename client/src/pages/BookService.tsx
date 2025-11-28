import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, MapPin, Phone, Search, Filter, X } from "lucide-react";
import { useWorkshops } from "@/hooks/api/useWorkshops";
import { useState } from "react";
import { BookingFormDialog } from "@/components/BookingFormDialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { Workshop } from "@shared/schema";

export default function BookService() {
  const { data: workshops, isLoading } = useWorkshops();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  
  // Filter states
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "none">("none");

  let filteredWorkshops = workshops?.filter(workshop => {
    const matchesSearch = workshop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      workshop.address.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesVerified = !verifiedOnly || workshop.isVerified;
    
    return matchesSearch && matchesVerified;
  }) || [];

  // Sort workshops
  if (sortBy === "name") {
    filteredWorkshops = [...filteredWorkshops].sort((a, b) => 
      a.name.localeCompare(b.name)
    );
  }

  const clearFilters = () => {
    setVerifiedOnly(false);
    setSortBy("none");
  };

  const hasActiveFilters = verifiedOnly || sortBy !== "none";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Book a Service</h1>
        <p className="text-muted-foreground mt-2">
          Find and book workshops near you
        </p>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search workshops by name or location..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="input-search-workshops"
          />
        </div>
        
        <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
          <SheetTrigger asChild>
            <Button 
              variant="outline" 
              className="gap-2 relative"
              data-testid="button-filter"
            >
              <Filter className="h-4 w-4" />
              Filter
              {hasActiveFilters && (
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full" />
              )}
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <div className="flex items-center justify-between">
                <SheetTitle>Filter Workshops</SheetTitle>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="gap-1 text-xs"
                    data-testid="button-clear-filters"
                  >
                    <X className="h-3 w-3" />
                    Clear
                  </Button>
                )}
              </div>
              <SheetDescription>
                Refine your search to find the perfect workshop
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 mt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="verified-only">Verified Only</Label>
                    <p className="text-xs text-muted-foreground">
                      Show only verified workshops
                    </p>
                  </div>
                  <Switch
                    id="verified-only"
                    checked={verifiedOnly}
                    onCheckedChange={setVerifiedOnly}
                    data-testid="switch-verified-only"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>Sort By</Label>
                <div className="space-y-2">
                  <Button
                    variant={sortBy === "none" ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => setSortBy("none")}
                    data-testid="button-sort-none"
                  >
                    Default Order
                  </Button>
                  <Button
                    variant={sortBy === "name" ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => setSortBy("name")}
                    data-testid="button-sort-name"
                  >
                    Name (A-Z)
                  </Button>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Results:</span>
                  <span className="font-medium">{filteredWorkshops.length} workshops</span>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-40" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredWorkshops.map((workshop) => (
            <Card key={workshop.id} className="hover-elevate" data-testid={`workshop-${workshop.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xl">{workshop.name}</CardTitle>
                      {workshop.isVerified && (
                        <Badge variant="default" className="text-xs">Verified</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span className="text-muted-foreground">{workshop.address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{workshop.phone}</span>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button 
                    className="flex-1" 
                    onClick={() => {
                      setSelectedWorkshop(workshop);
                      setDialogOpen(true);
                    }}
                    data-testid={`button-book-${workshop.id}`}
                  >
                    Book Service
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1" 
                    onClick={() => window.location.href = `/workshop/${workshop.id}/details`}
                    data-testid={`button-view-${workshop.id}`}
                  >
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {filteredWorkshops.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-muted-foreground">
                  {searchTerm ? "No workshops found matching your search" : "No workshops found"}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Booking Dialog */}
      {selectedWorkshop && (
        <BookingFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          workshop={selectedWorkshop}
        />
      )}
    </div>
  );
}
