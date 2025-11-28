import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BarChart3, DollarSign, TrendingUp, TrendingDown, CalendarIcon, Download } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { useToast } from "@/hooks/use-toast";

interface ReportsTabProps {
  workshopId: string;
}

interface FinancialSummary {
  totalSales: number;
  totalExpenses: number;
  profit: number;
  zakatAmount: number;
  taxAmount: number;
  zakatRate: number;
  taxRate: number;
}

interface DailyReport {
  id: string;
  reportDate: Date;
  totalJobs: number;
  totalSales: string;
  totalExpenses: string;
  profit: string;
  zakatAmount: string;
  taxAmount: string;
}

export default function ReportsTab({ workshopId }: ReportsTabProps) {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  // Fetch financial summary
  const { data: summary, isLoading: summaryLoading, error: summaryError } = useQuery<FinancialSummary>({
    queryKey: [
      '/api/workshop/financial/summary',
      { 
        cacheKey: { workshopId }, 
        params: { startDate: dateRange.from.toISOString(), endDate: dateRange.to.toISOString() } 
      }
    ],
    enabled: !!workshopId,
  });

  // Fetch daily reports for chart
  const { data: dailyReports, isLoading: reportsLoading, error: reportsError } = useQuery<DailyReport[]>({
    queryKey: ['/api/workshop/reports/daily', { cacheKey: { workshopId } }],
    enabled: !!workshopId,
  });

  const handleDateSelect = (range: { from: Date | undefined; to: Date | undefined }) => {
    if (range.from && range.to) {
      setDateRange({ from: range.from, to: range.to });
    }
  };

  const handleQuickSelect = (days: number) => {
    const today = new Date();
    setDateRange({
      from: subDays(today, days),
      to: today,
    });
  };

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString(),
      });

      const response = await fetch(`/api/workshop/reports/export/csv?${params}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to export CSV' }));
        throw new Error(errorData.message || 'Failed to export CSV');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financial-reports-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "CSV Exported Successfully",
        description: `Financial reports have been downloaded.`,
      });
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export CSV. Please try again.",
      });
    }
  };

  // Prepare chart data from daily reports
  const chartData = dailyReports?.slice(-30).map(report => ({
    date: format(new Date(report.reportDate), 'MMM dd'),
    sales: parseFloat(report.totalSales),
    expenses: parseFloat(report.totalExpenses),
    profit: parseFloat(report.profit),
  })) || [];

  if (summaryLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (summaryError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error Loading Financial Data</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">
            Failed to load financial summary. Please try refreshing the page.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Error: {summaryError instanceof Error ? summaryError.message : 'Unknown error'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Date Range Picker */}
      <div className="flex flex-col items-center text-center gap-4 pb-2">
        <div className="w-full">
          <h2 className="text-2xl font-bold tracking-tight text-foreground" data-testid="heading-financial-reports">Financial Reports</h2>
          <p className="text-muted-foreground mt-2">
            Track your workshop's financial performance with Zakat & Tax calculations
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 w-full">
          <Button
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => handleQuickSelect(7)}
            data-testid="button-quick-7days"
          >
            Last 7 Days
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => handleQuickSelect(30)}
            data-testid="button-quick-30days"
          >
            Last 30 Days
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            onClick={() => setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) })}
            data-testid="button-quick-month"
          >
            This Month
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full sm:w-auto justify-start text-left font-normal",
                  !dateRange.from && "text-muted-foreground"
                )}
                data-testid="button-date-range"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "MMM dd, yyyy")} - {format(dateRange.to, "MMM dd, yyyy")}
                    </>
                  ) : (
                    format(dateRange.from, "MMM dd, yyyy")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={handleDateSelect as any}
                numberOfMonths={2}
                data-testid="calendar-date-range"
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-total-sales">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground" data-testid="text-total-sales">
              RM {(summary?.totalSales ?? 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd')}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-total-expenses">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground" data-testid="text-total-expenses">
              RM {(summary?.totalExpenses ?? 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Operating costs
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-net-profit">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-net-profit">
              RM {(summary?.profit ?? 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Sales - Expenses
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-zakat-tax">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Zakat & Tax</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground" data-testid="text-zakat-tax-total">
              RM {((summary?.zakatAmount || 0) + (summary?.taxAmount || 0)).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Combined obligations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Zakat & Tax Breakdown */}
      <Card data-testid="card-breakdown">
        <CardHeader>
          <CardTitle>Zakat & Tax Breakdown</CardTitle>
          <CardDescription>Islamic charitable contribution and government tax obligations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Zakat (Islamic Charity)</p>
                <p className="text-sm text-muted-foreground">{summary?.zakatRate}% of net profit</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-foreground" data-testid="text-zakat-amount">
                  RM {(summary?.zakatAmount ?? 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground">
                  RM {(summary?.profit ?? 0).toLocaleString('en-MY', { maximumFractionDigits: 0 })} × {summary?.zakatRate ?? 0}%
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Tax (Government)</p>
                <p className="text-sm text-muted-foreground">{summary?.taxRate}% of net profit</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-foreground" data-testid="text-tax-amount">
                  RM {(summary?.taxAmount ?? 0).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground">
                  RM {(summary?.profit ?? 0).toLocaleString('en-MY', { maximumFractionDigits: 0 })} × {summary?.taxRate ?? 0}%
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg bg-primary/10 border border-primary/20">
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Profit After Deductions</p>
                <p className="text-sm text-muted-foreground">Net profit - Zakat - Tax</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary" data-testid="text-profit-after-deductions">
                  RM {((summary?.profit || 0) - (summary?.zakatAmount || 0) - (summary?.taxAmount || 0)).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card data-testid="card-revenue-expenses-chart">
          <CardHeader>
            <CardTitle>Revenue vs Expenses</CardTitle>
            <CardDescription>Daily comparison for the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {reportsLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : reportsError ? (
              <div className="flex items-center justify-center h-64 text-center">
                <div>
                  <p className="text-destructive font-medium">Failed to load daily reports</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {reportsError instanceof Error ? reportsError.message : 'Unknown error'}
                  </p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `RM ${value.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`} />
                  <Legend />
                  <Bar dataKey="sales" fill="hsl(var(--primary))" name="Sales" />
                  <Bar dataKey="expenses" fill="hsl(var(--destructive))" name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-profit-trend-chart">
          <CardHeader>
            <CardTitle>Profit Trend</CardTitle>
            <CardDescription>Daily profit tracking for the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {reportsLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : reportsError ? (
              <div className="flex items-center justify-center h-64 text-center">
                <div>
                  <p className="text-destructive font-medium">Failed to load daily reports</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {reportsError instanceof Error ? reportsError.message : 'Unknown error'}
                  </p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `RM ${value.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`} />
                  <Legend />
                  <Line type="monotone" dataKey="profit" stroke="hsl(var(--primary))" strokeWidth={2} name="Profit" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Daily Reports Table */}
      <Card data-testid="card-daily-reports">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Daily Reports History</CardTitle>
              <CardDescription>Auto-generated reports at 11:59 PM daily</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportCSV} data-testid="button-download-reports">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {reportsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : reportsError ? (
            <div className="text-center py-12">
              <p className="text-destructive font-medium">Failed to load daily reports</p>
              <p className="text-sm text-muted-foreground mt-1">
                {reportsError instanceof Error ? reportsError.message : 'Unknown error'}
              </p>
            </div>
          ) : !dailyReports || dailyReports.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No daily reports available yet. Reports are generated automatically at 11:59 PM every day.
            </div>
          ) : (
            <div className="rounded-md border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-3 text-left text-sm font-medium">Date</th>
                      <th className="p-3 text-right text-sm font-medium">Jobs</th>
                      <th className="p-3 text-right text-sm font-medium">Sales</th>
                      <th className="p-3 text-right text-sm font-medium">Expenses</th>
                      <th className="p-3 text-right text-sm font-medium">Profit</th>
                      <th className="p-3 text-right text-sm font-medium">Zakat</th>
                      <th className="p-3 text-right text-sm font-medium">Tax</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyReports.slice(0, 10).map((report, index) => (
                      <tr key={report.id} className="border-b hover-elevate" data-testid={`row-report-${index}`}>
                        <td className="p-3 text-sm" data-testid={`text-date-${index}`}>
                          {format(new Date(report.reportDate), 'MMM dd, yyyy')}
                        </td>
                        <td className="p-3 text-right text-sm font-mono" data-testid={`text-jobs-${index}`}>
                          {report.totalJobs}
                        </td>
                        <td className="p-3 text-right text-sm font-mono" data-testid={`text-sales-${index}`}>
                          RM {parseFloat(report.totalSales).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right text-sm font-mono" data-testid={`text-expenses-${index}`}>
                          RM {parseFloat(report.totalExpenses).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right text-sm font-mono text-green-600" data-testid={`text-profit-${index}`}>
                          RM {parseFloat(report.profit).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right text-sm font-mono" data-testid={`text-zakat-${index}`}>
                          RM {parseFloat(report.zakatAmount || '0').toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 text-right text-sm font-mono" data-testid={`text-tax-${index}`}>
                          RM {parseFloat(report.taxAmount || '0').toLocaleString('en-MY', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
