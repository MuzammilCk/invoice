import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Invoice } from '../types';

interface StoreState {
  invoices: Invoice[];
  businessInfo: Invoice['businessInfo'];
  history: { past: Invoice[][]; future: Invoice[][] };
  
  addInvoice: (invoice: Invoice) => void;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  updateBusinessInfo: (info: Invoice['businessInfo']) => void;
  
  undo: () => void;
  redo: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      invoices: [],
      businessInfo: {
        name: 'NexaGlobal Enterprise Inc.',
        address: '405 Madison Ave, Floor 18\nNew York, NY 10174',
        taxId: 'TAX-987654321',
      },
      history: { past: [], future: [] },

      addInvoice: (invoice) => set((state) => {
        const newInvoices = [...state.invoices, invoice];
        return {
          invoices: newInvoices,
          history: { past: [...state.history.past, state.invoices], future: [] }
        };
      }),

      updateInvoice: (id, updates) => set((state) => {
        const newInvoices = state.invoices.map((inv) => inv.id === id ? { ...inv, ...updates, updatedAt: new Date().toISOString() } : inv);
        return {
          invoices: newInvoices,
          history: { past: [...state.history.past, state.invoices].slice(-20), future: [] }
        };
      }),

      deleteInvoice: (id) => set((state) => {
        const newInvoices = state.invoices.filter((inv) => inv.id !== id);
        return {
          invoices: newInvoices,
          history: { past: [...state.history.past, state.invoices], future: [] }
        };
      }),

      updateBusinessInfo: (info) => set({ businessInfo: info }),

      undo: () => set((state) => {
        if (state.history.past.length === 0) return state;
        const previous = state.history.past[state.history.past.length - 1];
        const newPast = state.history.past.slice(0, -1);
        return {
          invoices: previous,
          history: { past: newPast, future: [state.invoices, ...state.history.future] }
        };
      }),

      redo: () => set((state) => {
        if (state.history.future.length === 0) return state;
        const next = state.history.future[0];
        const newFuture = state.history.future.slice(1);
        return {
          invoices: next,
          history: { past: [...state.history.past, state.invoices], future: newFuture }
        };
      }),
    }),
    {
      name: 'invoice-studio-storage',
      partialize: (state) => ({ invoices: state.invoices, businessInfo: state.businessInfo }), // Don't persist history!
    }
  )
);
