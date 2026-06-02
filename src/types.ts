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

export interface DisplaySettings {
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
  discountContent?: string;
  discountRate?: number;
  shipping?: number;
  notes: string;
  templateId: string;
  themeColor: string;
  currency: string;
  displaySettings: DisplaySettings;
}

