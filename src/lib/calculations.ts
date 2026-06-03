import Decimal from 'decimal.js';
import { Invoice, InvoiceItem } from '../types';

// ── Configure Decimal.js for financial precision ──
Decimal.set({
  precision: 20,
  rounding: Decimal.ROUND_HALF_UP,
});

// ── Base calculation functions (Decimal internally, number at boundaries) ──

export const calculateSubtotal = (items: InvoiceItem[]): number => {
  const result = items.reduce(
    (sum, item) => sum.plus(new Decimal(item.quantity).times(new Decimal(item.rate))),
    new Decimal(0)
  );
  return result.toDecimalPlaces(2).toNumber();
};

export const calculateDiscount = (subtotal: number, discountRate: number = 0): number => {
  const sub = new Decimal(subtotal);
  const rate = new Decimal(discountRate).dividedBy(100);
  const discount = sub.times(rate);
  // Cap discount so it can never exceed subtotal
  return Decimal.min(discount, sub).toDecimalPlaces(2).toNumber();
};

export const calculateTax = (amountToTax: number, taxRate: number): number => {
  const amount = new Decimal(amountToTax);
  const rate = new Decimal(taxRate).dividedBy(100);
  return amount.times(rate).toDecimalPlaces(2).toNumber();
};

export const calculateTotal = (
  subtotal: number,
  tax: number,
  discount: number = 0,
  shipping: number = 0
): number => {
  const sub = new Decimal(subtotal);
  const disc = Decimal.min(new Decimal(discount), sub);
  const total = sub.minus(disc).plus(new Decimal(tax)).plus(new Decimal(shipping));
  return Decimal.max(total, new Decimal(0)).toDecimalPlaces(2).toNumber();
};

// ── Single source-of-truth calculation ──
// Used by EditableInvoice, InvoicePreview, AND Dashboard.

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

  // Tax is applied AFTER discount (correct behavior)
  const taxableAmount = new Decimal(subtotal)
    .minus(new Decimal(discountAmount))
    .toDecimalPlaces(2)
    .toNumber();
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
