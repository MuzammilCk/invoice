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
    <div className="flex-1 min-h-screen bg-[#0f1115] bg-texture-canvas text-[#fcf6ba] p-8 overflow-y-auto font-sans">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-serif italic gold-gradient-text">Templates</h1>
          <p className="text-sm font-serif italic text-[#a09e91] mt-2">{TEMPLATES.length} professional invoice templates</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {TEMPLATES.map((template) => {
            const usage = usageCounts.get(template.id) || 0;
            const isSelected = selectedId === template.id;

            return (
              <button
                key={template.id}
                onClick={() => setSelectedId(isSelected ? null : template.id)}
                className={`group relative bg-[#15171c]/50 p-4 text-left transition-all hover:shadow-[0_0_15px_rgba(191,149,63,0.1)] ${
                  isSelected ? 'border border-[#bf953f] shadow-[0_0_20px_rgba(191,149,63,0.15)]' : 'sketched-border border-[#bf953f]/20 hover:border-[#bf953f]/50'
                }`}
              >
                {/* Template Preview Thumbnail */}
                <div className="aspect-[210/297] bg-[#fcf6ba] rounded-sm mb-4 overflow-hidden shadow-[inset_0_0_10px_rgba(0,0,0,0.1)] relative border border-[#bf953f]/20">
                  {/* Accent bar */}
                  {template.styles.accentStyle !== 'none' && (
                    <div
                      className="h-1.5 w-full"
                      style={{
                        backgroundColor: template.styles.accentStyle === 'solid' ? '#aa771c' : undefined,
                        backgroundImage: template.styles.accentStyle === 'gradient'
                          ? 'linear-gradient(135deg, #bf953f, #111827)'
                          : undefined,
                      }}
                    />
                  )}
                  {/* Skeleton layout */}
                  <div className="p-2 space-y-1.5 opacity-80 mix-blend-multiply">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="w-4 h-4 bg-[#bf953f]/20 rounded-sm" style={{ borderRadius: template.styles.borderRadius }} />
                        <div className="w-14 h-1.5 bg-black/20 rounded" />
                        <div className="w-8 h-1 bg-black/10 rounded" />
                      </div>
                      <div className="text-right space-y-1">
                        <div className="w-10 h-1 bg-black/10 rounded ml-auto" />
                        <div className="w-14 h-1.5 bg-black/20 rounded" />
                      </div>
                    </div>
                    <div className="border-t border-black/10 pt-1.5 space-y-1">
                      <div className="flex gap-1">
                        <div className="flex-1 h-1 bg-black/10 rounded" />
                        <div className="w-4 h-1 bg-black/10 rounded" />
                        <div className="w-6 h-1 bg-black/10 rounded" />
                      </div>
                      <div className="flex gap-1">
                        <div className="flex-1 h-1 bg-black/5 rounded" />
                        <div className="w-4 h-1 bg-black/5 rounded" />
                        <div className="w-6 h-1 bg-black/5 rounded" />
                      </div>
                    </div>
                    <div className="flex justify-end pt-1">
                      <div className="w-12 h-2 bg-[#bf953f]/20 rounded" />
                    </div>
                  </div>
                </div>

                <h3 className="text-sm font-serif italic font-bold text-[#fcf6ba]">{template.name}</h3>
                <p className="text-[11px] font-serif italic text-[#a09e91] mt-1">{template.description}</p>

                {usage > 0 && (
                  <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-1 bg-[#bf953f]/10 border border-[#bf953f]/30 text-[10px] text-[#fcf6ba] font-serif italic uppercase tracking-widest">
                    <Sparkles className="w-3 h-3 text-[#bf953f]" />
                    Used in {usage} invoice{usage !== 1 ? 's' : ''}
                  </div>
                )}

                {isSelected && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-gradient-to-r from-[#bf953f] to-[#aa771c] rounded-full flex items-center justify-center historical-shadow">
                    <Check className="w-3.5 h-3.5 text-[#0f1115]" />
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
