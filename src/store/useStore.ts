import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Invoice } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

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
        if (!isSupabaseConfigured() || !supabase) {
          set({ syncStatus: 'offline' });
          return;
        }

        set({ syncStatus: 'syncing' });

        try {
          const state = get();
          const invoices = state.invoices;

          for (const invoice of invoices) {
            const { error: invoiceError } = await supabase
              .from('invoices')
              .upsert({
                id: invoice.id,
                user_id: state.authUser?.id || 'local', // B-05 FIX: Use real user ID from auth state
                invoice_number: invoice.invoiceNumber,
                title: invoice.title || 'Invoice',
                status: invoice.status || 'draft',
                currency: invoice.currency,
                tax_rate: invoice.taxRate,
                discount_rate: invoice.discountRate || 0,
                discount_type: invoice.discountType || 'percentage',
                shipping: invoice.shipping || 0,
                issue_date: invoice.issueDate,
                due_date: invoice.dueDate,
                notes: invoice.notes,
                template_id: invoice.templateId,
                theme_color: invoice.themeColor,
                business_name: invoice.businessInfo?.name || '',
                business_address: invoice.businessInfo?.address || '',
                business_tax_id: invoice.businessInfo?.taxId || '',
                customer_name: invoice.customerInfo?.name || '',
                customer_email: invoice.customerInfo?.email || '',
                customer_address: invoice.customerInfo?.address || '',
                display_settings: invoice.displaySettings,
                updated_at: new Date().toISOString(),
              }, { onConflict: 'id' });

            if (invoiceError) throw invoiceError;

            await supabase
              .from('invoice_items')
              .delete()
              .eq('invoice_id', invoice.id);

            if (invoice.items.length > 0) {
              const { error: itemsError } = await supabase
                .from('invoice_items')
                .insert(invoice.items.map((item, index) => ({
                  id: item.id,
                  invoice_id: invoice.id,
                  description: item.description,
                  quantity: item.quantity,
                  rate: item.rate,
                  sort_order: index,
                })));

              if (itemsError) throw itemsError;
            }
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
        if (!isSupabaseConfigured() || !supabase) return;

        try {
          set({ syncStatus: 'syncing' });

          const { data: invoices, error } = await supabase
            .from('invoices')
            .select(`
              *,
              invoice_items (*)
            `)
            .is('deleted_at', null)
            .order('updated_at', { ascending: false });

          if (error) throw error;

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
