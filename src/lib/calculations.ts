import { InvoiceItem } from '../types';

export const calculateSubtotal = (items: InvoiceItem[]): number => {
  return items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
};

export const calculateTax = (subtotal: number, taxRate: number): number => {
  return subtotal * (taxRate / 100);
};

export const calculateTotal = (subtotal: number, tax: number): number => {
  return subtotal + tax;
};
