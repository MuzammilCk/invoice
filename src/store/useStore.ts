import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Invoice } from '../types';

interface StoreState {
  invoices: Invoice[];
  businessInfo: Invoice['businessInfo'];
  addInvoice: (invoice: Invoice) => void;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  updateBusinessInfo: (info: Invoice['businessInfo']) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      invoices: [],
      businessInfo: {
        name: 'NexaGlobal Enterprise Inc.',
        address: '405 Madison Ave, Floor 18\nNew York, NY 10174',
        taxId: 'TAX-987654321',
      },
      addInvoice: (invoice) => set((state) => ({ invoices: [...state.invoices, invoice] })),
      updateInvoice: (id, updates) => set((state) => ({
        invoices: state.invoices.map((inv) => inv.id === id ? { ...inv, ...updates, updatedAt: new Date().toISOString() } : inv)
      })),
      deleteInvoice: (id) => set((state) => ({
        invoices: state.invoices.filter((inv) => inv.id !== id)
      })),
      updateBusinessInfo: (info) => set({ businessInfo: info }),
    }),
    {
      name: 'invoice-studio-storage',
    }
  )
);
