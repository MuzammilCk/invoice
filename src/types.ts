export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
}

export interface CustomerInfo {
  name: string;
  email: string;
  address: string;
}

export interface BusinessInfo {
  name: string;
  address: string;
  taxId: string;
}

// Issue 2.4: Expanded InvoiceStatus for enterprise workflows
export type InvoiceStatus =
  | 'draft'
  | 'pending'
  | 'sent'
  | 'viewed'
  | 'partially-paid'
  | 'paid'
  | 'overdue'
  | 'disputed'
  | 'in-review'
  | 'approved'
  | 'cancelled'
  | 'void';

// Issue 2.5: Validated currency codes
export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'JPY', 'SGD', 'AED'] as const;
export type CurrencyCode = typeof SUPPORTED_CURRENCIES[number];

// Issue 2.6: Payment terms
export type PaymentTerms = 'net-7' | 'net-15' | 'net-30' | 'net-60' | 'due-on-receipt' | 'custom';

// Issue 2.3: Proper discount types
export type DiscountType = 'percentage' | 'flat';

export interface DisplaySettings {
  showTitle: boolean;
  showInvoiceId: boolean;
  showLogo: boolean;
  showFrom: boolean;
  showBilledTo: boolean;
  showIssueDate: boolean;
  showDueDate: boolean;
  showDiscount: boolean;
  showTax: boolean;
  showShipping: boolean;
  showNotes: boolean;
  showPaymentMethods: boolean;
}

export interface Invoice {
  id: string;                    // Issue 2.1: Internal UUID — NOT user-editable
  invoiceNumber: string;         // Issue 2.1: User-editable display field (e.g. "INV-2024-0042")
  title: string;
  status: InvoiceStatus;
  createdAt: string;
  updatedAt: string;
  issueDate: string;
  dueDate: string;
  businessInfo: BusinessInfo;
  customerInfo: CustomerInfo;
  items: InvoiceItem[];
  taxRate: number;
  discountType?: DiscountType;   // Issue 2.3: Replaced discountContent
  discountRate?: number;
  discountLabel?: string;        // Issue 2.3: Optional display label
  shipping?: number;
  notes: string;
  templateId: string;
  themeColor: string;
  currency: CurrencyCode | string; // Accept CurrencyCode for new invoices; string for backward compat
  paymentTerms?: PaymentTerms;   // Issue 2.6
  customPaymentTerms?: string;   // Issue 2.6: Used when paymentTerms === 'custom'
  displaySettings: DisplaySettings;
}
