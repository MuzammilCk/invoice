export interface InvoiceItem {
  id: string;
  description: string;
  rate: number;
  quantity?: number;
}

export interface CustomerInfo {
  name: string;
  email?: string;
  address?: string;
}

export interface BusinessInfo {
  name: string;
  address: string;
  taxId?: string;
  phone?: string;
  footerText?: string;
}

export type InvoiceStatus = 'draft' | 'done';

export const SUPPORTED_CURRENCIES = ['INR'] as const;
export type CurrencyCode = typeof SUPPORTED_CURRENCIES[number];

export interface Invoice {
  id: string;
  invoiceNumber: string;
  title: string;
  status: InvoiceStatus;
  createdAt: string;
  updatedAt: string;
  issueDate: string;
  businessInfo: BusinessInfo;
  customerInfo: CustomerInfo;
  items: InvoiceItem[];
  notes?: string;
  currency?: string;
}
