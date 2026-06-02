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

export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'overdue';

export interface Invoice {
  id: string;
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
  notes: string;
  templateId: string;
  themeColor: string;
  currency: string;
}

