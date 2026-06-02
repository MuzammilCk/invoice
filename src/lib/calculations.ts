import { Invoice, InvoiceItem } from '../types';

// ── Base calculation functions ──

export const calculateSubtotal = (items: InvoiceItem[]): number => {
  return items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
};

export const calculateDiscount = (subtotal: number, discountRate: number = 0): number => {
  // Issue 4.3: Cap discount so it can never exceed subtotal
  const discount = subtotal * (discountRate / 100);
  return Math.min(discount, subtotal);
};

export const calculateTax = (amountToTax: number, taxRate: number): number => {
  return amountToTax * (taxRate / 100);
};

export const calculateTotal = (
  subtotal: number,
  tax: number,
  discount: number = 0,
  shipping: number = 0
): number => {
  // Issue 4.3: Cap discount at subtotal, floor total at 0
  const cappedDiscount = Math.min(discount, subtotal);
  return Math.max(0, subtotal - cappedDiscount + tax + shipping);
};

// ── Issue 4.1: Single source-of-truth calculation ──
// Used by EditableInvoice, InvoicePreview, AND Dashboard.
// Eliminates the tax discrepancy bug where preview calculated tax on full subtotal.

export interface InvoiceTotals {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  shippingAmount: number;
  grandTotal: number;
}

export function computeInvoiceTotals(invoice: Invoice): InvoiceTotals {
  const subtotal = calculateSubtotal(invoice.items);

  const settings = invoice.displaySettings;

  // Discount (only if showDiscount is enabled)
  const actualDiscountRate = settings?.showDiscount ? (invoice.discountRate || 0) : 0;
  const discountAmount = calculateDiscount(subtotal, actualDiscountRate);

  // Tax is applied AFTER discount (the correct behavior)
  const taxableAmount = subtotal - discountAmount;
  const actualTaxRate = settings?.showTax ? invoice.taxRate : 0;
  const taxAmount = calculateTax(taxableAmount, actualTaxRate);

  // Shipping
  const shippingAmount = settings?.showShipping ? (invoice.shipping || 0) : 0;

  // Grand total with floor at 0
  const grandTotal = calculateTotal(subtotal, taxAmount, discountAmount, shippingAmount);

  return {
    subtotal,
    discountAmount,
    taxableAmount,
    taxAmount,
    shippingAmount,
    grandTotal,
  };
}
