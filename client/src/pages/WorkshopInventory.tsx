import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, Search, AlertTriangle } from "lucide-react";
import { useState } from "react";
import type { Inventory, Part } from "@shared/schema";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

interface InventoryWithPart extends Inventory {
  part?: Part;
}

export default function WorkshopInventory() {
  const [searchQuery, setSearchQuery] = useState("");
  const { t } = useLanguage();

  const { data: inventory = [], isLoading } = useQuery<InventoryWithPart[]>({
    queryKey: ['/api/inventory'],
  });

  const filteredInventory = inventory.filter(item => {
    if (!item.part) return false;
    const searchLower = searchQuery.toLowerCase();
    return (
      item.part.name.toLowerCase().includes(searchLower) ||
      item.part.sku?.toLowerCase().includes(searchLower) ||
      item.part.category.toLowerCase().includes(searchLower)
    );
  });

  const lowStockItems = filteredInventory.filter(item => item.quantity <= 5);
  const totalValue = filteredInventory.reduce(
    (sum, item) => sum + (item.part ? parseFloat(item.part.price) * item.quantity : 0),
    0
  );

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">{t("workshop.inventory.loading")}</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b p-4 space-y-4">
        <div>
          <h1 className="text-2xl font-semibold" data-testid="text-inventory-title">{t("workshop.inventory.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("workshop.inventory.subtitle")}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("workshop.inventory.totalItems")}</CardTitle>
              <Package className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-items">{filteredInventory.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("workshop.inventory.lowStockItems")}</CardTitle>
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600" data-testid="text-low-stock-count">
                {lowStockItems.length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("workshop.inventory.totalValue")}</CardTitle>
              <Package className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-value">
                ${totalValue.toFixed(2)}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={t("workshop.inventory.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-inventory"
            />
          </div>
          <Link href="/workshop/marketplace">
            <Button data-testid="button-order-parts">{t("workshop.inventory.browseMarketplace")}</Button>
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {filteredInventory.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="w-12 h-12 text-muted-foreground opacity-50 mb-4" />
              <p className="text-muted-foreground mb-4" data-testid="text-no-inventory">
                {inventory.length === 0 ? t("workshop.inventory.noItems") : t("workshop.inventory.noMatches")}
              </p>
              {inventory.length === 0 && (
                <Link href="/workshop/marketplace">
                  <Button>{t("workshop.inventory.browseMarketplace")}</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredInventory.map(item => (
              <Card key={item.id} data-testid={`card-inventory-${item.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold" data-testid={`text-part-name-${item.id}`}>
                          {item.part?.name || 'Unknown Part'}
                        </h3>
                        <Badge variant="outline" data-testid={`badge-category-${item.id}`}>
                          {item.part?.category}
                        </Badge>
                        {item.quantity <= 5 && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {t("workshop.inventory.lowStock")}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t("common.sku")}: {item.part?.sku}
                      </p>
                    </div>

                    <div className="text-right space-y-1">
                      <div className="text-2xl font-bold" data-testid={`text-quantity-${item.id}`}>
                        {item.quantity}
                      </div>
                      <div className="text-sm text-muted-foreground">{t("workshop.inventory.units")}</div>
                    </div>

                    <div className="text-right space-y-1">
                      <div className="text-lg font-semibold" data-testid={`text-value-${item.id}`}>
                        RM {item.part ? (parseFloat(item.part.price) * item.quantity).toFixed(2) : '0.00'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        RM {item.part?.price || '0.00'} {t("workshop.inventory.each")}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
