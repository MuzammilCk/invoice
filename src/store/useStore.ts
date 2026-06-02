import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Invoice } from '../types';

// Issue 3.1: Uniform history depth constant
const MAX_HISTORY_DEPTH = 50;

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

      // Issue 3.1: Uniform history cap applied
      addInvoice: (invoice) => set((state) => {
        const newInvoices = [...state.invoices, invoice];
        return {
          invoices: newInvoices,
          history: { past: [...state.history.past, state.invoices].slice(-MAX_HISTORY_DEPTH), future: [] }
        };
      }),

      updateInvoice: (id, updates) => set((state) => {
        const newInvoices = state.invoices.map((inv) => {
          if (inv.id === id) {
            return {
              ...inv,
              ...updates,
              displaySettings: {
                ...(inv.displaySettings || {
                  showTitle: true, showInvoiceId: true,
                  showLogo: true, showFrom: true, showBilledTo: true,
                  showIssueDate: true, showDueDate: true, showDiscount: true,
                  showTax: true, showShipping: true, showNotes: true, showPaymentMethods: true
                }),
                ...(updates.displaySettings || {})
              },
              updatedAt: new Date().toISOString()
            };
          }
          return inv;
        });
        return {
          invoices: newInvoices,
          history: { past: [...state.history.past, state.invoices].slice(-MAX_HISTORY_DEPTH), future: [] }
        };
      }),

      // Issue 3.1: History cap applied (was missing)
      deleteInvoice: (id) => set((state) => {
        const newInvoices = state.invoices.filter((inv) => inv.id !== id);
        return {
          invoices: newInvoices,
          history: { past: [...state.history.past, state.invoices].slice(-MAX_HISTORY_DEPTH), future: [] }
        };
      }),

      // Issue 3.2: Now tracks undo history (was a direct set() with no snapshot)
      updateBusinessInfo: (info) => set((state) => ({
        businessInfo: info,
        history: {
          past: [...state.history.past, state.invoices].slice(-MAX_HISTORY_DEPTH),
          future: []
        }
      })),

      undo: () => set((state) => {
        if (state.history.past.length === 0) return state;
        const previous = state.history.past[state.history.past.length - 1];
        const newPast = state.history.past.slice(0, -1);
        return {
          invoices: previous,
          history: { past: newPast, future: [state.invoices, ...state.history.future] }
        };
      }),

      // Issue 3.1: History cap applied on redo
      redo: () => set((state) => {
        if (state.history.future.length === 0) return state;
        const next = state.history.future[0];
        const newFuture = state.history.future.slice(1);
        return {
          invoices: next,
          history: { past: [...state.history.past, state.invoices].slice(-MAX_HISTORY_DEPTH), future: newFuture }
        };
      }),
    }),
    {
      // Issue 3.4: Env-scoped localStorage key
      name: `invoice-studio-storage-${(import.meta as any).env?.MODE ?? 'production'}`,
      partialize: (state) => ({ invoices: state.invoices, businessInfo: state.businessInfo }), // Don't persist history!
    }
  )
);
