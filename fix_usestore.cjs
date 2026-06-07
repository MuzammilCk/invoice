const fs = require('fs');

let content = fs.readFileSync('d:/projects/invoice/src/store/useStore.ts', 'utf8');

// 1. Add dirtyInvoiceIds and deletedInvoiceIds to StoreState
content = content.replace(
  '  syncError: string | null;\n',
  `  syncError: string | null;\n\n  // P1-2: Tracking for optimized sync\n  dirtyInvoiceIds: Set<string>;\n  deletedInvoiceIds: Set<string>;\n`
);

// 2. Initialize dirty and deleted sets
content = content.replace(
  '      syncError: null,\n',
  `      syncError: null,\n      dirtyInvoiceIds: new Set(),\n      deletedInvoiceIds: new Set(),\n`
);

// 3. update addInvoice
content = content.replace(
  /      addInvoice: \(invoice\) => {\n        set\(\(state\) => {\n          const newInvoices = \[\.\.\.state\.invoices, invoice\];\n          return {\n            invoices: newInvoices,\n            history: \{ past: \[\.\.\.state\.history\.past, state\.invoices\]\.slice\(-MAX_HISTORY_DEPTH\), future: \[\] \}\n          };\n        }\);\n        debouncedSync\(\(\) => get\(\)\.syncToCloud\(\)\);\n      },/g,
  `      addInvoice: (invoice) => {\n        set((state) => {\n          const newInvoices = [...state.invoices, invoice];\n          const newDirty = new Set(state.dirtyInvoiceIds);\n          newDirty.add(invoice.id);\n          return {\n            invoices: newInvoices,\n            dirtyInvoiceIds: newDirty,\n            history: { past: [...state.history.past, state.invoices].slice(-MAX_HISTORY_DEPTH), future: [] }\n          };\n        });\n        debouncedSync(() => get().syncToCloud());\n      },`
);

// 4. update updateInvoice
content = content.replace(
  /      updateInvoice: \(id, updates\) => {\n        set\(\(state\) => {\n          const newInvoices = state\.invoices\.map\(\(inv\) => {\n            if \(inv\.id === id\) {[\s\S]*?            return inv;\n          }\);\n          return {\n            invoices: newInvoices,\n            history: \{ past: \[\.\.\.state\.history\.past, state\.invoices\]\.slice\(-MAX_HISTORY_DEPTH\), future: \[\] \}\n          };\n        }\);\n        debouncedSync\(\(\) => get\(\)\.syncToCloud\(\)\);\n      },/g,
  `      updateInvoice: (id, updates) => {\n        set((state) => {\n          const newInvoices = state.invoices.map((inv) => {\n            if (inv.id === id) {\n              return {\n                ...inv,\n                ...updates,\n                displaySettings: {\n                  ...(inv.displaySettings || {\n                    showTitle: true, showInvoiceId: true,\n                    showLogo: true, showFrom: true, showBilledTo: true,\n                    showIssueDate: true, showDueDate: true, showDiscount: true,\n                    showTax: true, showShipping: true, showNotes: true, showPaymentMethods: true\n                  }),\n                  ...(updates.displaySettings || {})\n                },\n                updatedAt: new Date().toISOString()\n              };\n            }\n            return inv;\n          });\n          const newDirty = new Set(state.dirtyInvoiceIds);\n          newDirty.add(id);\n          return {\n            invoices: newInvoices,\n            dirtyInvoiceIds: newDirty,\n            history: { past: [...state.history.past, state.invoices].slice(-MAX_HISTORY_DEPTH), future: [] }\n          };\n        });\n        debouncedSync(() => get().syncToCloud());\n      },`
);

// 5. update deleteInvoice
content = content.replace(
  /      deleteInvoice: \(id\) => {\n        set\(\(state\) => {\n          const newInvoices = state\.invoices\.filter\(\(inv\) => inv\.id !== id\);\n          return {\n            invoices: newInvoices,\n            history: \{ past: \[\.\.\.state\.history\.past, state\.invoices\]\.slice\(-MAX_HISTORY_DEPTH\), future: \[\] \}\n          };\n        }\);\n        debouncedSync\(\(\) => get\(\)\.syncToCloud\(\)\);\n      },/g,
  `      deleteInvoice: (id) => {\n        set((state) => {\n          const newInvoices = state.invoices.filter((inv) => inv.id !== id);\n          const newDeleted = new Set(state.deletedInvoiceIds);\n          newDeleted.add(id);\n          return {\n            invoices: newInvoices,\n            deletedInvoiceIds: newDeleted,\n            history: { past: [...state.history.past, state.invoices].slice(-MAX_HISTORY_DEPTH), future: [] }\n          };\n        });\n        debouncedSync(() => get().syncToCloud());\n      },`
);

// 6. update updateBusinessInfo
content = content.replace(
  /      updateBusinessInfo: \(info\) => {\n        set\(\(state\) => \(\{[\s\S]*?\n          \}\n        \}\)\);\n        debouncedSync\(\(\) => get\(\)\.syncToCloud\(\)\);\n      },/g,
  `      updateBusinessInfo: (info) => {\n        set((state) => {\n          const newDirty = new Set(state.dirtyInvoiceIds);\n          state.invoices.forEach(inv => newDirty.add(inv.id));\n          return {\n            businessInfo: info,\n            dirtyInvoiceIds: newDirty,\n            history: {\n              past: [...state.history.past, state.invoices].slice(-MAX_HISTORY_DEPTH),\n              future: []\n            }\n          };\n        });\n        debouncedSync(() => get().syncToCloud());\n      },`
);

// 7. update syncToCloud
content = content.replace(
  /      syncToCloud: async \(\) => {\n        const state = get\(\);\n        if \(\!state\.isAuthenticated \|\| \!state\.authUser\) {\n          set\(\(\{ syncStatus: 'offline' \}\);\n          return;\n        }\n\n        set\(\{ syncStatus: 'syncing' \}\);\n\n        try {[\s\S]*?            syncError: err\.message \|\| 'Sync failed',\n          \}\);\n        }\n      },/g,
  `      syncToCloud: async () => {\n        const state = get();\n        if (!state.isAuthenticated || !state.authUser) {\n          set({ syncStatus: 'offline' });\n          return;\n        }\n\n        const dirtyIds = state.dirtyInvoiceIds;\n        const deletedIds = state.deletedInvoiceIds;\n\n        if (dirtyIds.size === 0 && deletedIds.size === 0) return;\n\n        set({ syncStatus: 'syncing' });\n\n        try {\n          const invoicesToSync = state.invoices.filter(inv => dirtyIds.has(inv.id));\n          const deletedToSync = Array.from(deletedIds);\n\n          const response = await apiClient('/api/v1/sync/push', {\n            method: 'POST',\n            headers: { 'Content-Type': 'application/json' },\n            body: JSON.stringify({ invoices: invoicesToSync, deletedInvoiceIds: deletedToSync }),\n          });\n\n          if (!response.ok) {\n            const errorData = await response.json().catch(() => ({}));\n            throw new Error(errorData.error || 'Sync failed');\n          }\n\n          set((s) => {\n            const newDirty = new Set(s.dirtyInvoiceIds);\n            const newDeleted = new Set(s.deletedInvoiceIds);\n            dirtyIds.forEach(id => newDirty.delete(id));\n            deletedIds.forEach(id => newDeleted.delete(id));\n            return {\n              syncStatus: 'synced',\n              lastSyncedAt: new Date().toISOString(),\n              syncError: null,\n              dirtyInvoiceIds: newDirty,\n              deletedInvoiceIds: newDeleted\n            };\n          });\n        } catch (err: any) {\n          console.error('[sync] Cloud sync failed:', err);\n          set({\n            syncStatus: 'error',\n            syncError: err.message || 'Sync failed',\n          });\n        }\n      },`
);

// 8. Remove tokens from Zustand partialize
content = content.replace(
  /        accessToken: state\.accessToken,\n        refreshToken: state\.refreshToken,\n/g,
  ``
);

fs.writeFileSync('d:/projects/invoice/src/store/useStore.ts', content);
console.log('Fixed useStore.ts');
