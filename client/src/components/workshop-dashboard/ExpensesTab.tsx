import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DollarSign, Plus, Search, Edit, Trash2, TrendingDown, Calendar, PieChart } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { WorkshopExpense } from "@shared/schema";
import { format, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

interface ExpensesTabProps {
  workshopId: string;
}

// Form validation schema
const expenseFormSchema = z.object({
  category: z.string().min(1, "Category is required").max(100),
  amount: z.string().min(1, "Amount is required"),
  description: z.string().optional(),
  expenseDate: z.string().min(1, "Date is required"),
});

type ExpenseFormData = z.infer<typeof expenseFormSchema>;

export default function ExpensesTab({ workshopId }: ExpensesTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<WorkshopExpense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<WorkshopExpense | null>(null);
  const { toast } = useToast();

  // Fetch expenses with date range (default last 30 days)
  const [dateRange, setDateRange] = useState({
    start: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
  });

  const { data: expenses, isLoading } = useQuery<WorkshopExpense[]>({
    queryKey: ["/api/expenses", { startDate: dateRange.start, endDate: dateRange.end }],
  });

  // Create expense mutation
  const createExpenseMutation = useMutation({
    mutationFn: async (data: ExpenseFormData) => {
      const payload = {
        ...data,
        workshopId,
        amount: data.amount,
        date: new Date(data.expenseDate).toISOString(),
      };
      return apiRequest("/api/expenses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({ title: "Expense added successfully" });
      setIsAddDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add expense", description: error.message, variant: "destructive" });
    },
  });

  // Update expense mutation
  const updateExpenseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ExpenseFormData }) => {
      const payload = {
        ...data,
        amount: data.amount,
        date: new Date(data.expenseDate).toISOString(),
      };
      return apiRequest(`/api/expenses/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({ title: "Expense updated successfully" });
      setEditingExpense(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update expense", description: error.message, variant: "destructive" });
    },
  });

  // Delete expense mutation
  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/expenses/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({ title: "Expense deleted successfully" });
      setDeletingExpense(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete expense", description: error.message, variant: "destructive" });
    },
  });

  // Filter expenses by search
  const filteredExpenses = expenses?.filter(
    (expense) =>
      expense.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (expense.description && expense.description.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || [];

  // Calculate stats
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const thisMonthExpenses = filteredExpenses.filter(e => 
    e.date && isWithinInterval(new Date(e.date), { start: monthStart, end: monthEnd })
  );

  const thisMonthTotal = thisMonthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  // Group by category
  const expensesByCategory = filteredExpenses.reduce((acc, expense) => {
    const category = expense.category;
    if (!acc[category]) {
      acc[category] = { count: 0, total: 0 };
    }
    acc[category].count++;
    acc[category].total += Number(expense.amount);
    return acc;
  }, {} as Record<string, { count: number; total: number }>);

  const categoryStats = Object.entries(expensesByCategory)
    .map(([category, stats]) => ({ category, ...stats }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="card-glow">
        <CardHeader className="flex flex-col items-center text-center gap-4 space-y-0 pb-4">
          <div className="w-full flex flex-col items-center gap-3">
            <DollarSign className="h-8 w-8" />
            <div className="text-center">
              <CardTitle className="glow-text text-foreground">Expense Management</CardTitle>
              <CardDescription className="mt-2">
                Track and categorize business expenses
              </CardDescription>
            </div>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} className="w-full sm:w-auto" data-testid="button-add-expense">
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
        </CardHeader>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="card-glow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold font-mono text-destructive">RM {thisMonthTotal.toFixed(2)}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="card-glow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold font-mono text-destructive">RM {totalExpenses.toFixed(2)}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card className="card-glow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Categories</p>
                <p className="text-2xl font-bold">{categoryStats.length}</p>
              </div>
              <PieChart className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      {categoryStats.length > 0 && (
        <Card className="card-glow">
          <CardHeader>
            <CardTitle className="glow-text glow-text">Expense by Category</CardTitle>
            <CardDescription>
              Breakdown of expenses across different categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {categoryStats.map((stat) => (
                <div key={stat.category} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <Badge variant="outline">{stat.category}</Badge>
                    <span className="text-sm text-muted-foreground">{stat.count} expenses</span>
                  </div>
                  <div className="font-mono font-semibold">RM {stat.total.toFixed(2)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search Bar */}
      <Card className="card-glow">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by category or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-expenses"
            />
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card className="card-glow">
        <CardHeader>
          <CardTitle className="glow-text glow-text">All Expenses</CardTitle>
          <CardDescription>
            Complete list of recorded expenses
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchQuery ? "No expenses found matching your search" : "No expenses recorded yet"}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense) => (
                    <TableRow key={expense.id} data-testid={`expense-row-${expense.id}`}>
                      <TableCell>
                        {expense.date ? format(new Date(expense.date), "MMM dd, yyyy") : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{expense.category}</Badge>
                      </TableCell>
                      <TableCell>{expense.description || "—"}</TableCell>
                      <TableCell className="font-mono font-semibold text-destructive">
                        RM {Number(expense.amount).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingExpense(expense)}
                            data-testid={`button-edit-${expense.id}`}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeletingExpense(expense)}
                            data-testid={`button-delete-${expense.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Expense Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <ExpenseForm
            onSubmit={(data) => createExpenseMutation.mutate(data)}
            isSubmitting={createExpenseMutation.isPending}
            onCancel={() => setIsAddDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Expense Dialog */}
      {editingExpense && (
        <Dialog open={true} onOpenChange={() => setEditingExpense(null)}>
          <DialogContent>
            <ExpenseForm
              expense={editingExpense}
              onSubmit={(data) => updateExpenseMutation.mutate({ id: editingExpense.id, data })}
              isSubmitting={updateExpenseMutation.isPending}
              onCancel={() => setEditingExpense(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {deletingExpense && (
        <AlertDialog open={true} onOpenChange={() => setDeletingExpense(null)}>
          <AlertDialogContent data-testid="dialog-delete-expense-confirmation">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Expense</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this expense? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteExpenseMutation.mutate(deletingExpense.id)}
                className="bg-destructive text-destructive-foreground hover-elevate"
                data-testid="button-confirm-delete"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

// Expense Form Component
interface ExpenseFormProps {
  expense?: WorkshopExpense;
  onSubmit: (data: ExpenseFormData) => void;
  isSubmitting: boolean;
  onCancel: () => void;
}

function ExpenseForm({ expense, onSubmit, isSubmitting, onCancel }: ExpenseFormProps) {
  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      category: expense?.category || "",
      amount: expense?.amount || "",
      description: expense?.description || "",
      expenseDate: expense?.date ? format(new Date(expense.date), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    },
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>{expense ? "Edit Expense" : "Add New Expense"}</DialogTitle>
        <DialogDescription>
          {expense ? "Update expense details" : "Record a new business expense"}
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Input placeholder="Rent, Utilities, Equipment, etc." {...field} data-testid="input-category" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (RM)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} data-testid="input-amount" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="expenseDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} data-testid="input-expense-date" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description (optional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="Additional details about this expense..." {...field} data-testid="input-description" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel-form">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} data-testid="button-submit-expense">
              {isSubmitting ? "Saving..." : expense ? "Update Expense" : "Add Expense"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
