import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Invoice } from '../types';

const MAX_HISTORY_DEPTH = 50;

interface StoreState {
  invoices: Invoice[];
  businessInfo: Invoice['businessInfo'];
  history: { past: Invoice[][]; future: Invoice[][] };

  addInvoice: (invoice: Invoice) => void;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  updateBusinessInfo: (info: Invoice['businessInfo']) => void;
  setInvoices: (invoices: Invoice[]) => void;

  undo: () => void;
  redo: () => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      invoices: [],
      businessInfo: {
        name: '',
        address: '',
        taxId: '',
      },
      history: { past: [], future: [] },

      addInvoice: (invoice) => {
        set((state) => ({
          invoices: [...state.invoices, invoice],
          history: { past: [...state.history.past, state.invoices].slice(-MAX_HISTORY_DEPTH), future: [] },
        }));
      },

      updateInvoice: (id, updates) => {
        set((state) => {
          const newInvoices = state.invoices.map((inv) => {
            if (inv.id === id) {
              return { ...inv, ...updates, updatedAt: new Date().toISOString() };
            }
            return inv;
          });
          return {
            invoices: newInvoices,
            history: { past: [...state.history.past, state.invoices].slice(-MAX_HISTORY_DEPTH), future: [] },
          };
        });
      },

      deleteInvoice: (id) => {
        set((state) => ({
          invoices: state.invoices.filter((inv) => inv.id !== id),
          history: { past: [...state.history.past, state.invoices].slice(-MAX_HISTORY_DEPTH), future: [] },
        }));
      },

      updateBusinessInfo: (info) => {
        set((state) => ({
          businessInfo: info,
          history: {
            past: [...state.history.past, state.invoices].slice(-MAX_HISTORY_DEPTH),
            future: [],
          },
        }));
      },

      setInvoices: (invoices) => set({ invoices }),

      undo: () => set((state) => {
        if (state.history.past.length === 0) return state;
        const previous = state.history.past[state.history.past.length - 1];
        const newPast = state.history.past.slice(0, -1);
        return {
          invoices: previous,
          history: { past: newPast, future: [state.invoices, ...state.history.future] },
        };
      }),

      redo: () => set((state) => {
        if (state.history.future.length === 0) return state;
        const next = state.history.future[0];
        const newFuture = state.history.future.slice(1);
        return {
          invoices: next,
          history: { past: [...state.history.past, state.invoices].slice(-MAX_HISTORY_DEPTH), future: newFuture },
        };
      }),
    }),
    {
      name: 'voice-to-invoice-storage',
      partialize: (state) => ({
        invoices: state.invoices,
        businessInfo: state.businessInfo,
      }),
    }
  )
);
