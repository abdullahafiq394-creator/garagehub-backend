import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Package, Search, AlertTriangle, TrendingUp, DollarSign, ShoppingCart, FileText } from "lucide-react";
import type { Part, Order, WorkshopPurchase } from "@shared/schema";
import { format } from "date-fns";
import { useInvoiceDownload } from "@/hooks/use-invoice-download";
import { useLanguage } from "@/contexts/LanguageContext";

interface InventoryTabProps {
  workshopId: string;
}

export default function InventoryTab({ workshopId }: InventoryTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { t } = useLanguage();
  const downloadInvoice = useInvoiceDownload();

  // Fetch parts inventory
  const { data: parts, isLoading: partsLoading } = useQuery<Part[]>({
    queryKey: ["/api/parts", workshopId],
  });

  // Fetch workshop orders
  const { data: orders, isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders", workshopId],
  });

  // Fetch workshop purchases
  const { data: purchases, isLoading: purchasesLoading } = useQuery<WorkshopPurchase[]>({
    queryKey: ["/api/workshop-dashboard/purchases"],
  });

  // Filter workshop orders only
  const workshopOrders = orders?.filter(o => o.workshopId === workshopId) || [];

  // Filter parts by search
  const filteredParts = parts?.filter(
    (part) =>
      part.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (part.sku && part.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || [];

  // Identify low stock parts
  const lowStockParts = filteredParts.filter(p => p.stockQuantity < 10);

  // Calculate stats
  const totalValue = filteredParts.reduce((sum, p) => sum + (p.stockQuantity * Number(p.price)), 0);
  const totalOrders = workshopOrders.length;
  const pendingOrders = workshopOrders.filter(o => o.status === "created").length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("workshop.inventory.totalItems")}</p>
                <p className="text-2xl font-bold">{filteredParts.length}</p>
              </div>
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("workshop.inventory.lowStockItems")}</p>
                <p className="text-2xl font-bold text-destructive">{lowStockParts.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("workshop.inventory.totalValue")}</p>
                <p className="text-2xl font-bold font-mono">RM {totalValue.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("workshop.inventory.pendingOrders")}</p>
                <p className="text-2xl font-bold">{pendingOrders}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alerts */}
      {lowStockParts.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <CardTitle>{t("workshop.inventory.lowStockItems")}</CardTitle>
            </div>
            <CardDescription>
              {t("workshop.inventory.lowStockAlertsDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockParts.slice(0, 5).map((part) => (
                <div key={part.id} className="flex items-center justify-between p-3 bg-destructive/10 rounded-md">
                  <div>
                    <div className="font-medium">{part.name}</div>
                    <div className="text-sm text-muted-foreground">{t("common.sku")}: {part.sku}</div>
                  </div>
                  <Badge variant="destructive">{part.stockQuantity} {t("workshop.inventory.left")}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("workshop.inventory.searchParts")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-inventory"
            />
          </div>
        </CardContent>
      </Card>

      {/* Parts Inventory */}
      <Card>
        <CardHeader>
          <CardTitle>{t("workshop.inventory.partsInventory")}</CardTitle>
          <CardDescription>
            {t("workshop.inventory.partsInventoryDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {partsLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredParts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery ? t("workshop.inventory.noPartsFound") : t("workshop.inventory.noPartsInInventory")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("workshop.inventory.tableHeaders.sku")}</TableHead>
                    <TableHead>{t("workshop.inventory.tableHeaders.name")}</TableHead>
                    <TableHead>{t("workshop.inventory.tableHeaders.category")}</TableHead>
                    <TableHead>{t("workshop.inventory.tableHeaders.stock")}</TableHead>
                    <TableHead>{t("workshop.inventory.tableHeaders.price")}</TableHead>
                    <TableHead>{t("workshop.inventory.tableHeaders.value")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredParts.map((part) => (
                    <TableRow key={part.id} data-testid={`part-row-${part.id}`}>
                      <TableCell className="font-mono text-sm">{part.sku}</TableCell>
                      <TableCell className="font-medium">{part.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{part.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={part.stockQuantity < 10 ? "destructive" : "default"}>
                          {part.stockQuantity} {t("workshop.inventory.units")}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">RM {Number(part.price).toFixed(2)}</TableCell>
                      <TableCell className="font-mono font-semibold">
                        RM {(part.stockQuantity * Number(part.price)).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Purchase History */}
      <Card>
        <CardHeader>
          <CardTitle>{t("workshop.inventory.purchaseHistory")}</CardTitle>
          <CardDescription>
            {t("workshop.inventory.purchaseHistoryDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {purchasesLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !purchases || purchases.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {t("workshop.inventory.noPurchaseRecords")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("workshop.inventory.tableHeaders.date")}</TableHead>
                    <TableHead>{t("workshop.inventory.tableHeaders.item")}</TableHead>
                    <TableHead>{t("workshop.inventory.tableHeaders.category")}</TableHead>
                    <TableHead>{t("workshop.inventory.tableHeaders.quantity")}</TableHead>
                    <TableHead>{t("workshop.inventory.tableHeaders.costUnit")}</TableHead>
                    <TableHead>{t("workshop.inventory.tableHeaders.totalCost")}</TableHead>
                    <TableHead className="text-right">{t("workshop.inventory.tableHeaders.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.map((purchase) => (
                    <TableRow key={purchase.id} data-testid={`purchase-row-${purchase.id}`}>
                      <TableCell>
                        {purchase.date ? format(new Date(purchase.date), "MMM dd, yyyy") : "—"}
                      </TableCell>
                      <TableCell className="font-medium">{purchase.itemName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{purchase.category}</Badge>
                      </TableCell>
                      <TableCell>{purchase.quantity} {t("workshop.inventory.units")}</TableCell>
                      <TableCell className="font-mono">RM {Number(purchase.costPrice).toFixed(2)}</TableCell>
                      <TableCell className="font-mono font-semibold">
                        RM {Number(purchase.totalCost).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            downloadInvoice.mutate({
                              endpoint: `/api/invoices/purchase/${purchase.id}`,
                              filename: `purchase-invoice-${purchase.id}.pdf`,
                            });
                          }}
                          disabled={downloadInvoice.isPending}
                          data-testid={`button-invoice-${purchase.id}`}
                        >
                          <FileText className="h-3 w-3 mr-1" />
                          {downloadInvoice.isPending ? t("workshop.inventory.generating") : t("workshop.inventory.invoice")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>{t("workshop.inventory.recentOrders")}</CardTitle>
          <CardDescription>
            {t("workshop.inventory.recentOrdersDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : workshopOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {t("workshop.inventory.noOrdersFound")}
            </div>
          ) : (
            <div className="space-y-4">
              {workshopOrders.slice(0, 10).map((order) => (
                <Card key={order.id} data-testid={`order-${order.id}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-muted-foreground">
                            #{order.id.slice(0, 8)}
                          </span>
                          <Badge
                            variant={
                              order.status === "delivered" ? "default" :
                              order.status === "delivering" ? "secondary" :
                              "outline"
                            }
                          >
                            {order.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {order.createdAt && format(new Date(order.createdAt), "MMM dd, yyyy 'at' h:mm a")}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold font-mono">
                          RM {Number(order.totalAmount).toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground">{t("workshop.inventory.totalAmount")}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
