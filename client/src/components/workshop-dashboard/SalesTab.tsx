import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Receipt, Search, TrendingUp, DollarSign, FileText, Calendar } from "lucide-react";
import { useInvoiceDownload } from "@/hooks/use-invoice-download";
import type { WorkshopSale, WorkshopJob } from "@shared/schema";
import { format, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

interface SalesTabProps {
  workshopId: string;
}

export default function SalesTab({ workshopId }: SalesTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const downloadInvoice = useInvoiceDownload();

  // Fetch sales records
  const { data: sales, isLoading: salesLoading } = useQuery<WorkshopSale[]>({
    queryKey: ["/api/workshop-dashboard/sales"],
  });

  // Fetch completed jobs for revenue tracking
  const { data: jobs } = useQuery<WorkshopJob[]>({
    queryKey: ["/api/workshop-dashboard/jobs"],
  });

  const completedJobs = jobs?.filter(j => j.status === "completed") || [];

  // Filter sales by search
  const filteredSales = sales?.filter((sale) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      sale.notes?.toLowerCase().includes(query) ||
      sale.receiptNumber?.toLowerCase().includes(query)
    );
  }) || [];

  // Calculate current month stats
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const thisMonthSales = filteredSales.filter(s => 
    s.date && isWithinInterval(new Date(s.date), { start: monthStart, end: monthEnd })
  );

  const thisMonthRevenue = thisMonthSales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
  const thisMonthJobs = completedJobs.filter(j => 
    j.endTime && isWithinInterval(new Date(j.endTime), { start: monthStart, end: monthEnd })
  );
  const thisMonthJobRevenue = thisMonthJobs.reduce((sum, j) => sum + Number(j.actualCost || 0), 0);

  // Calculate all-time stats
  const totalRevenue = filteredSales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
  const totalJobRevenue = completedJobs.reduce((sum, j) => sum + Number(j.actualCost || 0), 0);
  const averageSale = filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold font-mono">RM {thisMonthRevenue.toFixed(2)}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold font-mono">RM {totalRevenue.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Average Sale</p>
                <p className="text-2xl font-bold font-mono">RM {averageSale.toFixed(2)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Sales</p>
                <p className="text-2xl font-bold">{filteredSales.length}</p>
              </div>
              <Receipt className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by receipt number or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-sales"
            />
          </div>
        </CardContent>
      </Card>

      {/* Sales Records */}
      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="all" data-testid="tab-all-sales">
                All Sales ({filteredSales.length})
              </TabsTrigger>
              <TabsTrigger value="month" data-testid="tab-month-sales">
                This Month ({thisMonthSales.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-6">
              <SalesList sales={filteredSales} isLoading={salesLoading} downloadInvoice={downloadInvoice} />
            </TabsContent>
            <TabsContent value="month" className="mt-6">
              <SalesList sales={thisMonthSales} isLoading={salesLoading} downloadInvoice={downloadInvoice} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Job Revenue Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Service Revenue Summary</CardTitle>
          <CardDescription>
            Revenue from completed service jobs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-muted-foreground mb-2">This Month</div>
              <div className="text-3xl font-bold font-mono">RM {thisMonthJobRevenue.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {thisMonthJobs.length} completed jobs
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-2">All Time</div>
              <div className="text-3xl font-bold font-mono">RM {totalJobRevenue.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {completedJobs.length} completed jobs
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Sales List Component
interface SalesListProps {
  sales: WorkshopSale[];
  isLoading: boolean;
  downloadInvoice: ReturnType<typeof useInvoiceDownload>;
}

function SalesList({ sales, isLoading, downloadInvoice }: SalesListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (sales.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No sales records found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Receipt #</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead>Payment Method</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sales.map((sale) => (
            <TableRow key={sale.id} data-testid={`sale-row-${sale.id}`}>
              <TableCell className="font-mono">
                {sale.receiptNumber || `RCP-${sale.id.slice(0, 8)}`}
              </TableCell>
              <TableCell>
                {sale.date ? format(new Date(sale.date), "MMM dd, yyyy") : "—"}
              </TableCell>
              <TableCell>{sale.notes || "—"}</TableCell>
              <TableCell>
                <Badge variant="outline">{sale.paymentMethod}</Badge>
              </TableCell>
              <TableCell className="font-mono font-semibold">
                RM {Number(sale.totalAmount).toFixed(2)}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    downloadInvoice.mutate({
                      endpoint: `/api/invoices/sales/${sale.id}`,
                      filename: `sales-invoice-${sale.receiptNumber || sale.id}.pdf`,
                    });
                  }}
                  disabled={downloadInvoice.isPending}
                  data-testid={`button-invoice-${sale.id}`}
                >
                  <FileText className="h-3 w-3 mr-1" />
                  {downloadInvoice.isPending ? "Generating..." : "Invoice"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
