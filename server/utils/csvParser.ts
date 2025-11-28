import type { InsertPart } from "@shared/schema";

export interface CSVProductRow {
  name: string;
  sku?: string;
  description?: string;
  category: string;
  price: string;
  stockQuantity: number;
  imageUrl?: string;
}

export interface CSVParseError {
  row: number;
  field: string;
  value: string;
  message: string;
}

export interface CSVParseResult {
  products: CSVProductRow[];
  errors: CSVParseError[];
  totalRows: number;
  successfulRows: number;
}

export function parseProductCSV(csvContent: string): CSVParseResult {
  const errors: CSVParseError[] = [];
  const products: CSVProductRow[] = [];
  
  const lines = csvContent.trim().split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    throw new Error("CSV file is empty");
  }

  if (lines.length === 1) {
    throw new Error("CSV file contains only headers, no data rows");
  }

  // Parse header
  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
  
  // Validate required headers
  const requiredHeaders = ['name', 'category', 'price', 'stockquantity'];
  const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
  
  if (missingHeaders.length > 0) {
    throw new Error(`Missing required columns: ${missingHeaders.join(', ')}. Found: ${headers.join(', ')}`);
  }

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    
    if (values.length !== headers.length) {
      errors.push({
        row: i + 1,
        field: 'all',
        value: lines[i],
        message: `Column count mismatch. Expected ${headers.length}, got ${values.length}`,
      });
      continue;
    }

    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || '';
    });

    // Validate and transform with detailed error tracking
    const rowErrors: CSVParseError[] = [];

    // Validate name
    if (!row.name || row.name.trim().length === 0) {
      rowErrors.push({
        row: i + 1,
        field: 'name',
        value: row.name,
        message: 'Product name is required',
      });
    }

    // Note: category is optional here - defaults to "General" in convertToInsertParts

    // Validate price
    const price = parseFloat(row.price);
    if (isNaN(price) || price < 0) {
      rowErrors.push({
        row: i + 1,
        field: 'price',
        value: row.price,
        message: 'Price must be a valid positive number',
      });
    }

    // Validate stock quantity
    const stockQuantity = parseInt(row.stockquantity);
    if (isNaN(stockQuantity) || stockQuantity < 0) {
      rowErrors.push({
        row: i + 1,
        field: 'stockQuantity',
        value: row.stockquantity,
        message: 'Stock quantity must be a valid non-negative integer',
      });
    }

    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
      continue;
    }

    // All validations passed (category can be empty - will default to "General" in convertToInsertParts)
    products.push({
      name: row.name.trim(),
      sku: row.sku?.trim() || '',
      description: row.description?.trim() || '',
      category: row.category?.trim() || '',
      price: price.toFixed(2),
      stockQuantity,
      imageUrl: row.imageurl?.trim() || '',
    });
  }

  return {
    products,
    errors,
    totalRows: lines.length - 1, // Exclude header
    successfulRows: products.length,
  };
}

/**
 * Parse a CSV line handling quoted fields with commas and escaped quotes (RFC 4180)
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote ("")
        current += '"';
        i += 2;
        continue;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
        continue;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
      i++;
      continue;
    } else {
      current += char;
      i++;
    }
  }
  
  result.push(current);
  return result;
}

/**
 * Map category string to partCategory enum
 * Maps common automotive categories to the required enum values
 */
function mapCategoryToPartCategory(category: string): 'engine' | 'transmission' | 'brake' | 'suspension' | 'electrical' | 'cooling' | 'body' | 'interior' | 'exterior' | 'wheel_tyre' | 'fluids' | 'service' {
  const lower = category.toLowerCase();
  
  if (lower.includes('engine') || lower.includes('motor')) return 'engine';
  if (lower.includes('transmission') || lower.includes('gearbox')) return 'transmission';
  if (lower.includes('brake') || lower.includes('pad')) return 'brake';
  if (lower.includes('suspension') || lower.includes('shock')) return 'suspension';
  if (lower.includes('electrical') || lower.includes('battery') || lower.includes('alternator')) return 'electrical';
  if (lower.includes('cooling') || lower.includes('radiator')) return 'cooling';
  if (lower.includes('body')) return 'body';
  if (lower.includes('interior') || lower.includes('seat')) return 'interior';
  if (lower.includes('exterior') || lower.includes('bumper')) return 'exterior';
  if (lower.includes('wheel') || lower.includes('tyre') || lower.includes('tire')) return 'wheel_tyre';
  if (lower.includes('fluid') || lower.includes('oil') || lower.includes('coolant')) return 'fluids';
  if (lower.includes('service') || lower.includes('filter')) return 'service';
  
  // Default to service if no match
  return 'service';
}

/**
 * Convert CSV product rows to InsertPart objects
 */
export function convertToInsertParts(
  products: CSVProductRow[],
  supplierId: string
): InsertPart[] {
  if (!supplierId || supplierId.trim().length === 0) {
    throw new Error("Supplier ID is required");
  }

  return products.map(product => {
    // Ensure non-empty category (required by insertPartSchema)
    const category = (product.category && product.category.trim().length > 0) 
      ? product.category.trim()
      : "General";

    return {
      supplierId,
      name: product.name,
      sku: product.sku || null,
      description: product.description || null,
      category,
      partCategory: mapCategoryToPartCategory(category),
      price: product.price,
      stockQuantity: product.stockQuantity,
      imageUrl: product.imageUrl || null,
    };
  });
}
