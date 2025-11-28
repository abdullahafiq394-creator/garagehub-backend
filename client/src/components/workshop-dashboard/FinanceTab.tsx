import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, TrendingUp, TrendingDown, Calendar, BarChart3 } from "lucide-react";
import { format, subDays } from "date-fns";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FinanceTabProps {
  workshopId: string;
}

interface FinancialSummary {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
}

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  source: string;
  amount: number;
  date: string;
  description: string;
}

export default function FinanceTab({ workshopId }: FinanceTabProps) {
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
  });

  // Fetch financial summary
  const { data: summary, isLoading: summaryLoading } = useQuery<FinancialSummary>({
    queryKey: ['/api/finance/summary', { startDate: dateRange.start, endDate: dateRange.end }],
  });

  // Fetch transactions for charts
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ['/api/finance/transactions', { startDate: dateRange.start, endDate: dateRange.end }],
  });

  // Process data for charts
  interface DailyChartData {
    date: string;
    income: number;
    expense: number;
  }
  
  const dailyData = transactions.reduce((acc: DailyChartData[], transaction) => {
    const date = format(new Date(transaction.date), 'MMM dd');
    const existing = acc.find(item => item.date === date);
    
    if (existing) {
      if (transaction.type === 'income') {
        existing.income += transaction.amount;
      } else {
        existing.expense += transaction.amount;
      }
    } else {
      acc.push({
        date,
        income: transaction.type === 'income' ? transaction.amount : 0,
        expense: transaction.type === 'expense' ? transaction.amount : 0,
      });
    }
    
    return acc;
  }, []);

  // Process data for source breakdown
  interface SourceChartData {
    name: string;
    value: number;
  }
  
  const sourceData = transactions.reduce((acc: SourceChartData[], transaction) => {
    const existing = acc.find(item => item.name === transaction.source);
    
    if (existing) {
      existing.value += transaction.amount;
    } else {
      acc.push({
        name: transaction.source,
        value: transaction.amount,
      });
    }
    
    return acc;
  }, []);

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--secondary))', '#8884d8', '#82ca9d', '#ffc658'];

  const isLoading = summaryLoading || transactionsLoading;

  return (
    <div className="space-y-6">
      {/* Date Range Filter */}
      <Card className="card-glow" data-testid="card-date-filter">
        <CardHeader className="flex flex-col items-center text-center gap-4 space-y-0">
          <div className="w-full flex flex-col items-center gap-3">
            <Calendar className="h-8 w-8" />
            <div className="text-center">
              <CardTitle className="glow-text text-foreground">Date Range</CardTitle>
              <CardDescription className="mt-2">Filter financial data by date range</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                data-testid="input-start-date"
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                data-testid="input-end-date"
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setDateRange({
                start: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
                end: format(new Date(), 'yyyy-MM-dd'),
              })}
              data-testid="button-last-7-days"
            >
              Last 7 Days
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setDateRange({
                start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
                end: format(new Date(), 'yyyy-MM-dd'),
              })}
              data-testid="button-last-30-days"
            >
              Last 30 Days
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="card-glow" data-testid="card-total-income">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium glow-text">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold glow-text" data-testid="text-total-income">
                  RM {summary?.totalIncome ? Number(summary.totalIncome).toFixed(2) : '0.00'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Revenue from all sources
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="card-glow" data-testid="card-total-expense">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium glow-text">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold glow-text" data-testid="text-total-expense">
                  RM {summary?.totalExpense ? Number(summary.totalExpense).toFixed(2) : '0.00'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  All operational costs
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="card-glow" data-testid="card-net-profit">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium glow-text">Net Profit</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div
                  className={`text-2xl font-bold ${
                    (summary?.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                  data-testid="text-net-profit"
                >
                  RM {summary?.netProfit ? Number(summary.netProfit).toFixed(2) : '0.00'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Income minus expenses
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Income vs Expenses Over Time */}
        <Card className="card-glow" data-testid="card-income-expense-chart">
          <CardHeader>
            <CardTitle className="glow-text">Income vs Expenses</CardTitle>
            <CardDescription>Daily comparison over selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="income" fill="hsl(var(--primary))" name="Income" />
                  <Bar dataKey="expense" fill="hsl(var(--destructive))" name="Expense" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center px-4">
                <BarChart3 className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <p className="text-sm text-muted-foreground text-center">
                  No transaction data for selected period
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Source Breakdown */}
        <Card className="card-glow" data-testid="card-source-breakdown">
          <CardHeader>
            <CardTitle className="glow-text">Transaction Sources</CardTitle>
            <CardDescription>Breakdown by source type</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : sourceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: RM ${Number(entry.value).toFixed(2)}`}
                    outerRadius={80}
                    fill="hsl(var(--primary))"
                    dataKey="value"
                  >
                    {sourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center px-4">
                <TrendingUp className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <p className="text-sm text-muted-foreground text-center">
                  No transaction data for selected period
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="card-glow" data-testid="card-recent-transactions">
        <CardHeader>
          <CardTitle className="glow-text">Recent Transactions</CardTitle>
          <CardDescription>Last 10 financial transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : transactions.length > 0 ? (
            <div className="space-y-2">
              {transactions.slice(0, 10).map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover-elevate"
                  data-testid={`transaction-${transaction.id}`}
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{transaction.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {transaction.source} • {format(new Date(transaction.date), 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <div
                    className={`text-lg font-bold ${
                      transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {transaction.type === 'income' ? '+' : '-'}RM {Number(transaction.amount).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <DollarSign className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <p className="text-lg font-semibold text-muted-foreground mb-2">
                No transactions yet
              </p>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                No transactions found for selected period
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
