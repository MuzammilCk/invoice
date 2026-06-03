import React, { useState } from 'react';
import { TEMPLATES, InvoiceTemplate } from '../lib/templates';
import { useStore } from '../store/useStore';
import { Check, Sparkles } from 'lucide-react';

export function TemplatesPage() {
  const { invoices } = useStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Count usage of each template
  const usageCounts = new Map<string, number>();
  for (const inv of invoices) {
    const count = usageCounts.get(inv.templateId) || 0;
    usageCounts.set(inv.templateId, count + 1);
  }

  return (
    <div className="flex-1 min-h-screen bg-zinc-950 text-zinc-100 p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Templates</h1>
          <p className="text-sm text-zinc-500 mt-1">{TEMPLATES.length} professional invoice templates</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {TEMPLATES.map((template) => {
            const usage = usageCounts.get(template.id) || 0;
            const isSelected = selectedId === template.id;

            return (
              <button
                key={template.id}
                onClick={() => setSelectedId(isSelected ? null : template.id)}
                className={`group relative bg-zinc-900 border rounded-xl p-4 text-left transition-all hover:border-zinc-600 ${
                  isSelected ? 'border-indigo-500 ring-1 ring-indigo-500/50' : 'border-zinc-800'
                }`}
              >
                {/* Template Preview Thumbnail */}
                <div className="aspect-[210/297] bg-white rounded-lg mb-3 overflow-hidden shadow-inner relative">
                  {/* Accent bar */}
                  {template.styles.accentStyle !== 'none' && (
                    <div
                      className="h-1.5 w-full"
                      style={{
                        backgroundColor: template.styles.accentStyle === 'solid' ? '#4f46e5' : undefined,
                        backgroundImage: template.styles.accentStyle === 'gradient'
                          ? 'linear-gradient(135deg, #4f46e5, #111827)'
                          : undefined,
                      }}
                    />
                  )}
                  {/* Skeleton layout */}
                  <div className="p-2 space-y-1.5">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="w-4 h-4 bg-indigo-100 rounded-sm" style={{ borderRadius: template.styles.borderRadius }} />
                        <div className="w-14 h-1.5 bg-slate-200 rounded" />
                        <div className="w-8 h-1 bg-slate-100 rounded" />
                      </div>
                      <div className="text-right space-y-1">
                        <div className="w-10 h-1 bg-slate-100 rounded ml-auto" />
                        <div className="w-14 h-1.5 bg-slate-200 rounded" />
                      </div>
                    </div>
                    <div className="border-t border-slate-100 pt-1.5 space-y-1">
                      <div className="flex gap-1">
                        <div className="flex-1 h-1 bg-slate-100 rounded" />
                        <div className="w-4 h-1 bg-slate-100 rounded" />
                        <div className="w-6 h-1 bg-slate-100 rounded" />
                      </div>
                      <div className="flex gap-1">
                        <div className="flex-1 h-1 bg-slate-50 rounded" />
                        <div className="w-4 h-1 bg-slate-50 rounded" />
                        <div className="w-6 h-1 bg-slate-50 rounded" />
                      </div>
                    </div>
                    <div className="flex justify-end pt-1">
                      <div className="w-12 h-2 bg-indigo-100 rounded" />
                    </div>
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-zinc-200">{template.name}</h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">{template.description}</p>

                {usage > 0 && (
                  <div className="mt-2 inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 rounded text-[10px] text-indigo-400 font-medium">
                    <Sparkles className="w-2.5 h-2.5" />
                    Used in {usage} invoice{usage !== 1 ? 's' : ''}
                  </div>
                )}

                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
