import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: any, decimals: number = 2): string {
  if (value === null || value === undefined || value === '') {
    return '0.00';
  }
  
  const num = Number(value);
  
  if (isNaN(num)) {
    return '0.00';
  }
  
  return num.toFixed(decimals);
}
