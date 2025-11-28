import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FileText, Download, Trash2, Plus, X, Eye, Edit2, Send } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { format } from "date-fns";

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface ManualInvoice {
  id: string;
  invoiceType: 'quotation' | 'receipt';
  invoiceNumber: string;
  customerName: string;
  customerPhone: string | null;
  customerAddress: string | null;
  items: InvoiceItem[];
  subtotal: string;
  taxRate: string;
  taxAmount: string;
  totalAmount: string;
  notes: string | null;
  terms: string | null;
  status: 'draft' | 'sent' | 'paid' | 'void';
  issueDate: string;
  dueDate: string | null;
  createdAt: string;
}

interface WorkshopCustomer {
  id: string;
  name: string;
  phone: string;
  plateNo: string;
  vehicleModel: string;
}

const invoiceItemSchema = z.object({
  description: z.string().min(1, "Description required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Unit price must be positive"),
});

const invoiceFormSchema = z.object({
  invoiceType: z.enum(['quotation', 'receipt']),
  customerId: z.string().optional(),
  customerName: z.string().min(1, "Customer name required"),
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, "At least one item required"),
  taxRate: z.number().min(0).max(100),
  notes: z.string().optional(),
  terms: z.string().optional(),
  issueDate: z.string(),
  dueDate: z.string().optional(),
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

export default function ManualInvoices() {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<ManualInvoice | null>(null);

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      invoiceType: 'quotation',
      customerName: '',
      customerPhone: '',
      customerAddress: '',
      items: [{ description: "", quantity: 1, unitPrice: 0 }],
      taxRate: 0,
      notes: '',
      terms: '',
      issueDate: format(new Date(), "yyyy-MM-dd"),
      dueDate: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const { data: invoices = [], isLoading } = useQuery<ManualInvoice[]>({
    queryKey: ['/api/workshop-dashboard/manual-invoices'],
  });

  const { data: customers = [] } = useQuery<WorkshopCustomer[]>({
    queryKey: ['/api/workshop-dashboard/customers'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InvoiceFormValues) => {
      const itemsWithTotals = data.items.map(item => ({
        ...item,
        total: item.quantity * item.unitPrice,
      }));
      const subtotal = itemsWithTotals.reduce((sum, item) => sum + item.total, 0);
      const taxAmount = (subtotal * data.taxRate) / 100;
      const totalAmount = subtotal + taxAmount;

      const invoiceNumber = `${data.invoiceType === 'quotation' ? 'QUO' : 'REC'}-${Date.now().toString().slice(-8)}`;

      const payload: any = {
        ...data,
        invoiceNumber,
        items: itemsWithTotals,
        subtotal: subtotal.toFixed(2),
        taxRate: data.taxRate.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        totalAmount: totalAmount.toFixed(2),
      };

      if (!data.dueDate || data.dueDate === '') {
        delete payload.dueDate;
      }

      return apiRequest('/api/workshop-dashboard/manual-invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workshop-dashboard/manual-invoices'] });
      setShowCreateDialog(false);
      form.reset();
      toast({
        title: "Invoice created",
        description: "Manual invoice has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Creation failed",
        description: "Failed to create invoice. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/workshop-dashboard/manual-invoices/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/workshop-dashboard/manual-invoices'] });
      toast({
        title: "Invoice deleted",
        description: "Invoice has been deleted successfully.",
      });
    },
  });

  const handleAddItem = () => {
    append({ description: "", quantity: 1, unitPrice: 0 });
  };

  const handleRemoveItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const handleCustomerSelect = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      form.setValue('customerName', customer.name);
      form.setValue('customerPhone', customer.phone);
      form.setValue('customerId', customer.id);
    }
  };

  const handleDownloadPDF = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/workshop-dashboard/manual-invoices/${invoiceId}/pdf`);
      if (!response.ok) throw new Error('Failed to generate PDF');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Failed to download PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const watchItems = form.watch('items');
  const subtotal = watchItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const taxRate = form.watch('taxRate') || 0;
  const taxAmount = (subtotal * taxRate) / 100;
  const totalAmount = subtotal + taxAmount;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-500';
      case 'sent': return 'bg-blue-500';
      case 'paid': return 'bg-green-500';
      case 'void': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-2xl">Manual Invoices</CardTitle>
              <CardDescription>Create and manage custom quotations and receipts</CardDescription>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-invoice">
                  <FileText className="mr-2 h-4 w-4" />
                  Create Invoice
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Manual Invoice</DialogTitle>
                  <DialogDescription>
                    Create a custom quotation or receipt for your customer
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="invoiceType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Invoice Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-invoice-type">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="quotation">Quotation</SelectItem>
                                <SelectItem value="receipt">Receipt</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormItem>
                        <FormLabel>Select Customer (Optional)</FormLabel>
                        <Select onValueChange={handleCustomerSelect}>
                          <SelectTrigger data-testid="select-customer">
                            <SelectValue placeholder="Choose existing customer" />
                          </SelectTrigger>
                          <SelectContent>
                            {customers.map((customer) => (
                              <SelectItem key={customer.id} value={customer.id}>
                                {customer.name} ({customer.plateNo})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="customerName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Customer Name*</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-customer-name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="customerPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input {...field} data-testid="input-customer-phone" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="customerAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Textarea {...field} data-testid="textarea-customer-address" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Items</h3>
                        <Button type="button" onClick={handleAddItem} size="sm" data-testid="button-add-item">
                          <Plus className="h-4 w-4 mr-1" />
                          Add Item
                        </Button>
                      </div>

                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Description</TableHead>
                              <TableHead className="w-24">Qty</TableHead>
                              <TableHead className="w-32">Unit Price</TableHead>
                              <TableHead className="w-32">Total</TableHead>
                              <TableHead className="w-16"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {fields.map((field, index) => {
                              const itemTotal = (watchItems[index]?.quantity || 0) * (watchItems[index]?.unitPrice || 0);
                              return (
                                <TableRow key={field.id}>
                                  <TableCell>
                                    <FormField
                                      control={form.control}
                                      name={`items.${index}.description`}
                                      render={({ field }) => (
                                        <Input
                                          {...field}
                                          placeholder="Item description"
                                          data-testid={`input-item-description-${index}`}
                                        />
                                      )}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <FormField
                                      control={form.control}
                                      name={`items.${index}.quantity`}
                                      render={({ field }) => (
                                        <Input
                                          type="number"
                                          min="1"
                                          {...field}
                                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                          data-testid={`input-item-quantity-${index}`}
                                        />
                                      )}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <FormField
                                      control={form.control}
                                      name={`items.${index}.unitPrice`}
                                      render={({ field }) => (
                                        <Input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          {...field}
                                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                          data-testid={`input-item-price-${index}`}
                                        />
                                      )}
                                    />
                                  </TableCell>
                                  <TableCell className="font-semibold">
                                    RM {itemTotal.toFixed(2)}
                                  </TableCell>
                                  <TableCell>
                                    {fields.length > 1 && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemoveItem(index)}
                                        data-testid={`button-remove-item-${index}`}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>

                      <div className="flex justify-end">
                        <div className="w-64 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Subtotal:</span>
                            <span className="font-semibold">RM {subtotal.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm">Tax Rate (%):</span>
                            <FormField
                              control={form.control}
                              name="taxRate"
                              render={({ field }) => (
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  className="w-24"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                  data-testid="input-tax-rate"
                                />
                              )}
                            />
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Tax Amount:</span>
                            <span className="font-semibold">RM {taxAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-lg font-bold pt-2 border-t">
                            <span>Total:</span>
                            <span>RM {totalAmount.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="issueDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Issue Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} data-testid="input-issue-date" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="dueDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Due Date (Optional)</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} data-testid="input-due-date" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Additional notes" data-testid="textarea-notes" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="terms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Terms / Validity</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Payment terms or quotation validity period" data-testid="textarea-terms" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-invoice">
                        {createMutation.isPending ? "Creating..." : "Create Invoice"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading invoices...</div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="mx-auto h-12 w-12 mb-4 opacity-20" />
              <p>No invoices created yet</p>
              <p className="text-sm">Create your first quotation or receipt</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>
                        <Badge variant={invoice.invoiceType === 'quotation' ? 'outline' : 'default'}>
                          {invoice.invoiceType === 'quotation' ? 'Quotation' : 'Receipt'}
                        </Badge>
                      </TableCell>
                      <TableCell>{invoice.customerName}</TableCell>
                      <TableCell className="font-semibold">RM {parseFloat(invoice.totalAmount).toFixed(2)}</TableCell>
                      <TableCell>{format(new Date(invoice.issueDate), "dd MMM yyyy")}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(invoice.status)}>
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownloadPDF(invoice.id)}
                            data-testid={`button-download-${invoice.id}`}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(invoice.id)}
                            data-testid={`button-delete-${invoice.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
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
    </div>
  );
}
