import { InvoiceItem } from '../types';

export const calculateSubtotal = (items: InvoiceItem[]): number => {
  return items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
};

export const calculateDiscount = (subtotal: number, discountRate: number = 0): number => {
  return subtotal * (discountRate / 100);
};

export const calculateTax = (amountToTax: number, taxRate: number): number => {
  return amountToTax * (taxRate / 100);
};

export const calculateTotal = (subtotal: number, tax: number, discount: number = 0, shipping: number = 0): number => {
  return subtotal - discount + tax + shipping;
};
