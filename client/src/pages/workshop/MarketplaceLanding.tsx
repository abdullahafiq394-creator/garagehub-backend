import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Wrench } from "lucide-react";
import { useLocation } from "wouter";

export default function MarketplaceLanding() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-primary/10 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">GarageHub Marketplace</h1>
          <p className="text-lg text-muted-foreground">Choose supplier type to browse</p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          <Card 
            className="hover:shadow-lg transition-all cursor-pointer hover-elevate active-elevate-2"
            onClick={() => navigate("/workshop/marketplace/oem")}
            data-testid="card-marketplace-oem"
          >
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4 shrink-0">
                <Package className="w-10 h-10 text-primary shrink-0" strokeWidth={2} />
              </div>
              <CardTitle className="text-2xl">OEM Parts</CardTitle>
              <CardDescription>
                Original Equipment Manufacturer parts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Browse genuine OEM parts from verified suppliers across Malaysia
              </p>
              <Button className="w-full" data-testid="button-browse-oem">
                Browse OEM Suppliers
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-lg transition-all cursor-pointer hover-elevate active-elevate-2"
            onClick={() => navigate("/workshop/marketplace/halfcut")}
            data-testid="card-marketplace-halfcut"
          >
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4 shrink-0">
                <Wrench className="w-10 h-10 text-primary shrink-0" strokeWidth={2} />
              </div>
              <CardTitle className="text-2xl">Halfcut Parts</CardTitle>
              <CardDescription>
                Quality used parts from halfcut vehicles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Find affordable halfcut parts from trusted dismantlers nationwide
              </p>
              <Button className="w-full" data-testid="button-browse-halfcut">
                Browse Halfcut Suppliers
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
