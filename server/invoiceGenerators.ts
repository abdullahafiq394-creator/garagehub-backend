import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface InvoiceHeader {
  workshopName: string;
  workshopAddress?: string;
  workshopPhone?: string;
  workshopEmail?: string;
  invoiceNumber: string;
  invoiceDate: Date;
  invoiceType: string;
}

interface JobInvoiceData extends InvoiceHeader {
  customerName: string;
  customerPhone?: string;
  vehiclePlate: string;
  vehicleModel?: string;
  jobDescription: string;
  laborCost: number;
  partsCost: number;
  partsUsed?: Array<{ name: string; quantity: number; price: number }>;
  totalAmount: number;
  taxAmount?: number;
  finalAmount: number;
}

interface SalesInvoiceData extends InvoiceHeader {
  customerName?: string;
  customerPhone?: string;
  items: Array<{ 
    productName: string; 
    productCode?: string;
    quantity: number; 
    unitPrice: number; 
    total: number 
  }>;
  subtotal: number;
  taxAmount?: number;
  totalAmount: number;
}

interface PayrollInvoiceData extends InvoiceHeader {
  staffName: string;
  staffPosition?: string;
  staffId?: string;
  payPeriodStart: Date;
  payPeriodEnd: Date;
  baseSalary: number;
  commission: number;
  deductions?: number;
  totalPaid: number;
  remarks?: string;
}

interface PurchaseInvoiceData extends InvoiceHeader {
  supplierName: string;
  supplierAddress?: string;
  supplierPhone?: string;
  items: Array<{
    partName: string;
    partCode?: string;
    quantity: number;
    unitCost: number;
    total: number;
  }>;
  subtotal: number;
  taxAmount?: number;
  totalAmount: number;
}

export class InvoiceGenerator {
  private static addHeader(doc: jsPDF, data: InvoiceHeader, yPos: number = 15): number {
    // Company Logo/Branding
    doc.setFillColor(255, 107, 53); // Shopee Orange
    doc.rect(15, yPos, 180, 10, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(data.workshopName.toUpperCase(), 20, yPos + 7);
    
    // Invoice Type
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(data.invoiceType, 15, yPos + 20);
    
    // Invoice Details Box
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Invoice No: ${data.invoiceNumber}`, 140, yPos + 20);
    doc.text(`Date: ${format(data.invoiceDate, 'dd/MM/yyyy')}`, 140, yPos + 26);
    
    // Workshop Info
    if (data.workshopAddress || data.workshopPhone || data.workshopEmail) {
      doc.setFontSize(9);
      let infoY = yPos + 32;
      if (data.workshopAddress) {
        doc.text(data.workshopAddress, 15, infoY);
        infoY += 5;
      }
      if (data.workshopPhone) {
        doc.text(`Tel: ${data.workshopPhone}`, 15, infoY);
        infoY += 5;
      }
      if (data.workshopEmail) {
        doc.text(`Email: ${data.workshopEmail}`, 15, infoY);
        infoY += 5;
      }
      return infoY + 5;
    }
    
    return yPos + 35;
  }

  private static formatCurrency(amount: number): string {
    return `RM ${amount.toFixed(2)}`;
  }

  static generateJobInvoice(data: JobInvoiceData): jsPDF {
    const doc = new jsPDF();
    let yPos = this.addHeader(doc, data);
    
    // Customer & Vehicle Info Box
    doc.setFillColor(245, 245, 245);
    doc.rect(15, yPos, 180, 35, 'F');
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('CUSTOMER DETAILS', 20, yPos + 7);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${data.customerName}`, 20, yPos + 14);
    if (data.customerPhone) {
      doc.text(`Phone: ${data.customerPhone}`, 20, yPos + 20);
    }
    
    doc.setFont('helvetica', 'bold');
    doc.text('VEHICLE DETAILS', 110, yPos + 7);
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Plate: ${data.vehiclePlate}`, 110, yPos + 14);
    if (data.vehicleModel) {
      doc.text(`Model: ${data.vehicleModel}`, 110, yPos + 20);
    }
    
    yPos += 40;
    
    // Job Description
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('JOB DESCRIPTION', 15, yPos);
    yPos += 6;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const splitText = doc.splitTextToSize(data.jobDescription, 180);
    doc.text(splitText, 15, yPos);
    yPos += (splitText.length * 5) + 5;
    
    // Parts Used Table (if any)
    if (data.partsUsed && data.partsUsed.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [['Part Name', 'Qty', 'Unit Price', 'Total']],
        body: data.partsUsed.map(part => [
          part.name,
          part.quantity.toString(),
          this.formatCurrency(part.price),
          this.formatCurrency(part.quantity * part.price)
        ]),
        theme: 'grid',
        headStyles: { fillColor: [255, 107, 53], textColor: 255 },
        styles: { fontSize: 9 },
      });
      yPos = (doc as any).lastAutoTable.finalY + 10;
    }
    
    // Cost Breakdown Table
    const costRows: string[][] = [
      ['Labor Cost', this.formatCurrency(data.laborCost)],
      ['Parts Cost', this.formatCurrency(data.partsCost)],
    ];
    
    if (data.taxAmount && data.taxAmount > 0) {
      costRows.push(['Subtotal', this.formatCurrency(data.totalAmount)]);
      costRows.push(['Tax (10%)', this.formatCurrency(data.taxAmount)]);
    }
    
    costRows.push(['TOTAL AMOUNT', this.formatCurrency(data.finalAmount)]);
    
    autoTable(doc, {
      startY: yPos,
      body: costRows,
      theme: 'plain',
      styles: { fontSize: 10 },
      columnStyles: {
        0: { halign: 'right', fontStyle: 'bold', cellWidth: 140 },
        1: { halign: 'right', fontStyle: 'bold', cellWidth: 40 }
      },
    });
    
    // Footer
    yPos = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('Thank you for your business!', 105, yPos, { align: 'center' });
    doc.text('Generated by GarageHub System', 105, yPos + 5, { align: 'center' });
    
    return doc;
  }

  static generateSalesInvoice(data: SalesInvoiceData): jsPDF {
    const doc = new jsPDF();
    let yPos = this.addHeader(doc, data);
    
    // Customer Info (if available)
    if (data.customerName || data.customerPhone) {
      doc.setFillColor(245, 245, 245);
      doc.rect(15, yPos, 180, 20, 'F');
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('CUSTOMER DETAILS', 20, yPos + 7);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      if (data.customerName) {
        doc.text(`Name: ${data.customerName}`, 20, yPos + 14);
      }
      if (data.customerPhone) {
        doc.text(`Phone: ${data.customerPhone}`, 110, yPos + 14);
      }
      
      yPos += 25;
    }
    
    // Items Table
    autoTable(doc, {
      startY: yPos,
      head: [['Item', 'Code', 'Qty', 'Unit Price', 'Total']],
      body: data.items.map(item => [
        item.productName,
        item.productCode || '-',
        item.quantity.toString(),
        this.formatCurrency(item.unitPrice),
        this.formatCurrency(item.total)
      ]),
      theme: 'grid',
      headStyles: { fillColor: [255, 107, 53], textColor: 255 },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 35 },
        2: { halign: 'center', cellWidth: 20 },
        3: { halign: 'right', cellWidth: 30 },
        4: { halign: 'right', cellWidth: 35 }
      }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;
    
    // Total Summary
    const summaryRows: string[][] = [
      ['Subtotal', this.formatCurrency(data.subtotal)]
    ];
    
    if (data.taxAmount && data.taxAmount > 0) {
      summaryRows.push(['Tax (10%)', this.formatCurrency(data.taxAmount)]);
    }
    
    summaryRows.push(['TOTAL AMOUNT', this.formatCurrency(data.totalAmount)]);
    
    autoTable(doc, {
      startY: yPos,
      body: summaryRows,
      theme: 'plain',
      styles: { fontSize: 10 },
      columnStyles: {
        0: { halign: 'right', fontStyle: 'bold', cellWidth: 140 },
        1: { halign: 'right', fontStyle: 'bold', cellWidth: 40 }
      },
    });
    
    // Footer
    yPos = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('Thank you for your purchase!', 105, yPos, { align: 'center' });
    doc.text('Generated by GarageHub System', 105, yPos + 5, { align: 'center' });
    
    return doc;
  }

  static generatePayrollSlip(data: PayrollInvoiceData): jsPDF {
    const doc = new jsPDF();
    let yPos = this.addHeader(doc, data);
    
    // Staff Info Box
    doc.setFillColor(245, 245, 245);
    doc.rect(15, yPos, 180, 30, 'F');
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('STAFF DETAILS', 20, yPos + 7);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${data.staffName}`, 20, yPos + 14);
    if (data.staffPosition) {
      doc.text(`Position: ${data.staffPosition}`, 20, yPos + 20);
    }
    if (data.staffId) {
      doc.text(`Staff ID: ${data.staffId}`, 110, yPos + 14);
    }
    
    yPos += 35;
    
    // Pay Period
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('PAY PERIOD', 15, yPos);
    yPos += 6;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `${format(data.payPeriodStart, 'dd/MM/yyyy')} - ${format(data.payPeriodEnd, 'dd/MM/yyyy')}`,
      15,
      yPos
    );
    yPos += 10;
    
    // Earnings Table
    const earningsRows: string[][] = [
      ['Base Salary', this.formatCurrency(data.baseSalary)],
      ['Commission', this.formatCurrency(data.commission)],
    ];
    
    if (data.deductions && data.deductions > 0) {
      earningsRows.push(['Deductions', `(${this.formatCurrency(data.deductions)})`]);
    }
    
    earningsRows.push(['', '']);
    earningsRows.push(['TOTAL PAYMENT', this.formatCurrency(data.totalPaid)]);
    
    autoTable(doc, {
      startY: yPos,
      body: earningsRows,
      theme: 'grid',
      styles: { fontSize: 10 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 140 },
        1: { halign: 'right', fontStyle: 'bold', cellWidth: 40 }
      },
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;
    
    // Remarks (if any)
    if (data.remarks) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Remarks:', 15, yPos);
      yPos += 5;
      
      doc.setFont('helvetica', 'italic');
      const splitRemarks = doc.splitTextToSize(data.remarks, 180);
      doc.text(splitRemarks, 15, yPos);
      yPos += (splitRemarks.length * 5) + 10;
    }
    
    // Footer
    yPos += 10;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('This is a computer-generated payslip. No signature required.', 105, yPos, { align: 'center' });
    doc.text('Generated by GarageHub System', 105, yPos + 5, { align: 'center' });
    
    return doc;
  }

  static generatePurchaseInvoice(data: PurchaseInvoiceData): jsPDF {
    const doc = new jsPDF();
    let yPos = this.addHeader(doc, data);
    
    // Supplier Info Box
    doc.setFillColor(245, 245, 245);
    doc.rect(15, yPos, 180, 25, 'F');
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('SUPPLIER DETAILS', 20, yPos + 7);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${data.supplierName}`, 20, yPos + 14);
    if (data.supplierAddress) {
      doc.text(`Address: ${data.supplierAddress}`, 20, yPos + 20);
    }
    if (data.supplierPhone) {
      doc.text(`Phone: ${data.supplierPhone}`, 110, yPos + 14);
    }
    
    yPos += 30;
    
    // Items Table
    autoTable(doc, {
      startY: yPos,
      head: [['Part Name', 'Code', 'Qty', 'Unit Cost', 'Total']],
      body: data.items.map(item => [
        item.partName,
        item.partCode || '-',
        item.quantity.toString(),
        this.formatCurrency(item.unitCost),
        this.formatCurrency(item.total)
      ]),
      theme: 'grid',
      headStyles: { fillColor: [255, 107, 53], textColor: 255 },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 35 },
        2: { halign: 'center', cellWidth: 20 },
        3: { halign: 'right', cellWidth: 30 },
        4: { halign: 'right', cellWidth: 35 }
      }
    });
    
    yPos = (doc as any).lastAutoTable.finalY + 10;
    
    // Total Summary
    const summaryRows: string[][] = [
      ['Subtotal', this.formatCurrency(data.subtotal)]
    ];
    
    if (data.taxAmount && data.taxAmount > 0) {
      summaryRows.push(['Tax (10%)', this.formatCurrency(data.taxAmount)]);
    }
    
    summaryRows.push(['TOTAL AMOUNT', this.formatCurrency(data.totalAmount)]);
    
    autoTable(doc, {
      startY: yPos,
      body: summaryRows,
      theme: 'plain',
      styles: { fontSize: 10 },
      columnStyles: {
        0: { halign: 'right', fontStyle: 'bold', cellWidth: 140 },
        1: { halign: 'right', fontStyle: 'bold', cellWidth: 40 }
      },
    });
    
    // Footer
    yPos = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text('Purchase Order - For Internal Records', 105, yPos, { align: 'center' });
    doc.text('Generated by GarageHub System', 105, yPos + 5, { align: 'center' });
    
    return doc;
  }
}
