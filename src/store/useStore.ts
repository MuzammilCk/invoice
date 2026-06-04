import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Invoice } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { apiClient } from '../lib/apiClient';

const MAX_HISTORY_DEPTH = 50;

// ── B-12 + Auth: Onboarding and auth state ──
interface AuthUser {
  id: string;
  email: string;
  name: string;
}

interface StoreState {
  invoices: Invoice[];
  businessInfo: Invoice['businessInfo'];
  history: { past: Invoice[][]; future: Invoice[][] };
  
  // Sync state
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error' | 'offline';
  lastSyncedAt: string | null;
  syncError: string | null;

  // B-12: Onboarding state (replaces localStorage)
  onboardingComplete: boolean;
  setOnboardingComplete: (complete: boolean) => void;

  // Auth state (B-03/B-04/B-05)
  authUser: AuthUser | null;
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;

  addInvoice: (invoice: Invoice) => void;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  updateBusinessInfo: (info: Invoice['businessInfo']) => void;
  setInvoices: (invoices: Invoice[]) => void;
  
  undo: () => void;
  redo: () => void;

  syncToCloud: () => Promise<void>;
  loadFromCloud: () => Promise<void>;
  setSyncStatus: (status: StoreState['syncStatus']) => void;
}

let syncTimeout: ReturnType<typeof setTimeout> | null = null;
function debouncedSync(syncFn: () => Promise<void>, delayMs = 2000) {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    try {
      await syncFn();
    } catch (err) {
      console.error('[sync] Debounced sync failed:', err);
    }
  }, delayMs);
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
      
      syncStatus: 'idle',
      lastSyncedAt: null,
      syncError: null,

      // B-12: Onboarding state
      onboardingComplete: false,
      setOnboardingComplete: (complete) => set({ onboardingComplete: complete }),

      // Auth state
      authUser: null,
      isAuthenticated: false,
      accessToken: null,
      refreshToken: null,
      setAuth: (user, accessToken, refreshToken) => set({
        authUser: user,
        isAuthenticated: true,
        accessToken,
        refreshToken,
      }),
      clearAuth: () => set({
        authUser: null,
        isAuthenticated: false,
        accessToken: null,
        refreshToken: null,
        invoices: [],
      }),

      setSyncStatus: (status) => set({ syncStatus: status }),

      addInvoice: (invoice) => {
        set((state) => {
          const newInvoices = [...state.invoices, invoice];
          return {
            invoices: newInvoices,
            history: { past: [...state.history.past, state.invoices].slice(-MAX_HISTORY_DEPTH), future: [] }
          };
        });
        debouncedSync(() => get().syncToCloud());
      },

      updateInvoice: (id, updates) => {
        set((state) => {
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
        });
        debouncedSync(() => get().syncToCloud());
      },

      deleteInvoice: (id) => {
        set((state) => {
          const newInvoices = state.invoices.filter((inv) => inv.id !== id);
          return {
            invoices: newInvoices,
            history: { past: [...state.history.past, state.invoices].slice(-MAX_HISTORY_DEPTH), future: [] }
          };
        });
        debouncedSync(() => get().syncToCloud());
      },

      updateBusinessInfo: (info) => {
        set((state) => ({
          businessInfo: info,
          history: {
            past: [...state.history.past, state.invoices].slice(-MAX_HISTORY_DEPTH),
            future: []
          }
        }));
        debouncedSync(() => get().syncToCloud());
      },

      setInvoices: (invoices) => {
        set({ invoices });
      },

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
          history: { past: [...state.history.past, state.invoices].slice(-MAX_HISTORY_DEPTH), future: newFuture }
        };
      }),

      syncToCloud: async () => {
        const state = get();
        if (!state.isAuthenticated || !state.authUser) {
          set({ syncStatus: 'offline' });
          return;
        }

        set({ syncStatus: 'syncing' });

        try {
          const invoices = state.invoices;

          const response = await apiClient('/api/v1/sync/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invoices }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Sync failed');
          }

          set({
            syncStatus: 'synced',
            lastSyncedAt: new Date().toISOString(),
            syncError: null,
          });
        } catch (err: any) {
          console.error('[sync] Cloud sync failed:', err);
          set({
            syncStatus: 'error',
            syncError: err.message || 'Sync failed',
          });
        }
      },

      loadFromCloud: async () => {
        const state = get();
        if (!state.isAuthenticated || !state.authUser) return;

        try {
          set({ syncStatus: 'syncing' });

          const response = await apiClient('/api/v1/sync/pull');
          if (!response.ok) {
            throw new Error('Failed to fetch from cloud');
          }

          const { invoices } = await response.json();

          if (invoices && invoices.length > 0) {
            const mapped = invoices.map((inv: any) => ({
              id: inv.id,
              invoiceNumber: inv.invoice_number,
              title: inv.title,
              status: inv.status,
              currency: inv.currency,
              taxRate: parseFloat(inv.tax_rate),
              discountRate: parseFloat(inv.discount_rate),
              discountType: inv.discount_type,
              shipping: parseFloat(inv.shipping),
              issueDate: inv.issue_date,
              dueDate: inv.due_date,
              notes: inv.notes,
              templateId: inv.template_id,
              themeColor: inv.theme_color,
              businessInfo: {
                name: inv.business_name,
                address: inv.business_address,
                taxId: inv.business_tax_id,
              },
              customerInfo: {
                name: inv.customer_name,
                email: inv.customer_email,
                address: inv.customer_address,
              },
              displaySettings: inv.display_settings,
              items: (inv.invoice_items || [])
                .sort((a: any, b: any) => a.sort_order - b.sort_order)
                .map((item: any) => ({
                  id: item.id,
                  description: item.description,
                  quantity: parseFloat(item.quantity),
                  rate: parseFloat(item.rate),
                })),
              updatedAt: inv.updated_at,
              createdAt: inv.created_at,
            }));

            set({
              invoices: mapped,
              syncStatus: 'synced',
              lastSyncedAt: new Date().toISOString(),
            });
          } else {
             set({ syncStatus: 'synced' });
          }
        } catch (err: any) {
          console.error('[sync] Load from cloud failed:', err);
          set({ syncStatus: 'error', syncError: err.message });
        }
      },
    }),
    {
      name: `invoice-studio-storage-${(import.meta as any).env?.MODE ?? 'production'}`,
      partialize: (state) => ({
        invoices: state.invoices,
        businessInfo: state.businessInfo,
        onboardingComplete: state.onboardingComplete,
        authUser: state.authUser,
        isAuthenticated: state.isAuthenticated,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }), // Persist auth + onboarding, but not history or sync transient state
    }
  )
);
