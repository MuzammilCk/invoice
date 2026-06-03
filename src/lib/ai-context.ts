import { Invoice } from '../types';
import { computeInvoiceTotals } from './calculations';

interface ClientContext {
  clientName: string;
  totalInvoiceCount: number;
  totalBilled: number;
  currency: string;
  lastInvoiceDate: string;
  commonItems: { description: string; rate: number; frequency: number }[];
  averageTaxRate: number;
  preferredTemplate: string;
  lastNotes: string;
}

/**
 * Build a context summary for AI injection based on invoice history.
 * This provides the AI with historical context about a specific client,
 * enabling smarter, faster, and more accurate invoice generation.
 */
export function buildClientContext(
  invoices: Invoice[],
  clientIdentifier: string
): ClientContext | null {
  // Find all invoices for this client (match by name or email)
  const identifier = clientIdentifier.toLowerCase();
  const clientInvoices = invoices.filter(
    inv =>
      inv.customerInfo.name?.toLowerCase().includes(identifier) ||
      inv.customerInfo.email?.toLowerCase().includes(identifier)
  );

  if (clientInvoices.length === 0) return null;

  // Sort by date (newest first)
  const sorted = [...clientInvoices].sort(
    (a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()
  );

  // Extract common items (items appearing in >30% of invoices)
  const itemCounts = new Map<string, { rate: number; count: number }>();
  for (const inv of sorted) {
    for (const item of inv.items) {
      const key = item.description.toLowerCase().trim();
      const existing = itemCounts.get(key);
      if (existing) {
        existing.count++;
        existing.rate = item.rate; // Use most recent rate
      } else {
        itemCounts.set(key, { rate: item.rate, count: 1 });
      }
    }
  }

  const commonItems = Array.from(itemCounts.entries())
    .filter(([, v]) => v.count >= Math.max(1, sorted.length * 0.3))
    .map(([desc, v]) => ({
      description: desc,
      rate: v.rate,
      frequency: v.count,
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10);

  // Calculate averages
  const totalBilled = sorted.reduce(
    (sum, inv) => sum + computeInvoiceTotals(inv).grandTotal,
    0
  );
  const avgTax = sorted.reduce((sum, inv) => sum + inv.taxRate, 0) / sorted.length;

  // Most common template
  const templateCounts = new Map<string, number>();
  for (const inv of sorted) {
    templateCounts.set(inv.templateId, (templateCounts.get(inv.templateId) || 0) + 1);
  }
  const preferredTemplate = Array.from(templateCounts.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'minimal-executive';

  return {
    clientName: sorted[0]?.customerInfo.name || '',
    totalInvoiceCount: sorted.length,
    totalBilled,
    currency: sorted[0]?.currency || 'USD',
    lastInvoiceDate: sorted[0]?.issueDate || '',
    commonItems,
    averageTaxRate: Math.round(avgTax * 100) / 100,
    preferredTemplate,
    lastNotes: sorted[0]?.notes || '',
  };
}

/**
 * Format client context for AI prompt injection.
 * Returns a compact string suitable for system prompt augmentation.
 */
export function formatClientContextForPrompt(context: ClientContext): string {
  const itemList = context.commonItems
    .map(i => `"${i.description}" at $${i.rate} (used ${i.frequency}× before)`)
    .join('; ');

  return `CLIENT HISTORY FOR "${context.clientName}":
- Total invoices: ${context.totalInvoiceCount}
- Total billed: $${context.totalBilled.toFixed(2)} (${context.currency})
- Average tax rate: ${context.averageTaxRate}%
- Commonly billed items: ${itemList || 'None'}
- Preferred template: ${context.preferredTemplate}
- Last invoice notes: "${context.lastNotes}"
USE THIS HISTORY to pre-fill rates and descriptions where applicable. Maintain consistency.`;
}
