import Decimal from 'decimal.js';
import { Invoice, InvoiceItem } from '../types';

// ── Configure Decimal.js for financial precision ──
Decimal.set({
  precision: 20,
  rounding: Decimal.ROUND_HALF_UP,
});

export const calculateSubtotal = (items: InvoiceItem[]): number => {
  const result = items.reduce(
    (sum, item) => sum.plus(new Decimal(item.rate || 0)),
    new Decimal(0)
  );
  return result.toDecimalPlaces(2).toNumber();
};

export interface InvoiceTotals {
  subtotal: number;
  grandTotal: number;
}

export function computeInvoiceTotals(invoice: Invoice): InvoiceTotals {
  const subtotal = calculateSubtotal(invoice.items || []);
  return {
    subtotal,
    grandTotal: subtotal,
  };
}
