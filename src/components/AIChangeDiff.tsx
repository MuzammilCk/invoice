import React, { useState } from 'react';
import { Invoice } from '../types';
import { Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FieldChange {
  field: string;
  label: string;
  before: any;
  after: any;
  accepted: boolean;
}

interface AIChangeDiffProps {
  currentInvoice: Invoice;
  proposedChanges: Partial<Invoice>;
  onApply: (acceptedChanges: Partial<Invoice>) => void;
  onReject: () => void;
}

function formatFieldValue(value: any): string {
  if (value === undefined || value === null) return '(empty)';
  if (Array.isArray(value)) return `${value.length} item(s)`;
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

export function AIChangeDiff({ currentInvoice, proposedChanges, onApply, onReject }: AIChangeDiffProps) {
  const [expanded, setExpanded] = useState(true);

  // Build field-level diff
  const buildChanges = (): FieldChange[] => {
    const changes: FieldChange[] = [];
    const fieldLabels: Record<string, string> = {
      'customerInfo.name': 'Client Name',
      'customerInfo.email': 'Client Email',
      'customerInfo.address': 'Client Address',
      items: 'Line Items',
      taxRate: 'Tax Rate',
      discountRate: 'Discount Rate',
      notes: 'Notes',
      templateId: 'Template',
      currency: 'Currency',
      title: 'Title',
      themeColor: 'Theme Color',
      dueDate: 'Due Date',
      paymentTerms: 'Payment Terms',
      shipping: 'Shipping',
    };

    for (const [key, value] of Object.entries(proposedChanges)) {
      if (value === undefined) continue;

      if (key === 'customerInfo' && typeof value === 'object') {
        for (const [subKey, subValue] of Object.entries(value as any)) {
          const fullKey = `customerInfo.${subKey}`;
          const currentValue = (currentInvoice.customerInfo as any)?.[subKey];
          if (currentValue !== subValue) {
            changes.push({
              field: fullKey,
              label: fieldLabels[fullKey] || fullKey,
              before: currentValue,
              after: subValue,
              accepted: true,
            });
          }
        }
      } else {
        const currentValue = (currentInvoice as any)[key];
        if (JSON.stringify(currentValue) !== JSON.stringify(value)) {
          changes.push({
            field: key,
            label: fieldLabels[key] || key,
            before: currentValue,
            after: value,
            accepted: true,
          });
        }
      }
    }

    return changes;
  };

  const [changes, setChanges] = useState<FieldChange[]>(buildChanges);

  const toggleField = (index: number) => {
    setChanges(prev => prev.map((c, i) => i === index ? { ...c, accepted: !c.accepted } : c));
  };

  const handleApply = () => {
    const acceptedChanges: Partial<Invoice> = {};
    for (const change of changes) {
      if (!change.accepted) continue;

      if (change.field.startsWith('customerInfo.')) {
        const subKey = change.field.split('.')[1] as string;
        if (!acceptedChanges.customerInfo) {
          acceptedChanges.customerInfo = { ...currentInvoice.customerInfo };
        }
        (acceptedChanges.customerInfo as any)[subKey] = change.after;
      } else {
        (acceptedChanges as any)[change.field] = change.after;
      }
    }
    onApply(acceptedChanges);
  };

  const acceptedCount = changes.filter(c => c.accepted).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-zinc-800/80 backdrop-blur-sm rounded-xl border border-indigo-500/30 overflow-hidden shadow-lg"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
          <span className="text-sm font-semibold text-zinc-100">
            AI Proposed {changes.length} Change{changes.length !== 1 ? 's' : ''}
          </span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
              {changes.map((change, index) => (
                <div
                  key={change.field}
                  className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                    change.accepted ? 'bg-indigo-500/10 border border-indigo-500/20' : 'bg-zinc-900/50 border border-zinc-700/30 opacity-50'
                  }`}
                >
                  <button
                    onClick={() => toggleField(index)}
                    className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
                      change.accepted ? 'bg-indigo-500 text-white' : 'bg-zinc-700 text-zinc-500'
                    }`}
                  >
                    {change.accepted && <Check className="w-3 h-3" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-zinc-300">{change.label}</div>
                    <div className="flex gap-2 mt-1 text-[11px]">
                      <span className="text-red-400/70 line-through truncate max-w-[120px]">{formatFieldValue(change.before)}</span>
                      <span className="text-zinc-500">→</span>
                      <span className="text-emerald-400 truncate max-w-[120px]">{formatFieldValue(change.after)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2 px-4 pb-4">
              <button
                onClick={handleApply}
                disabled={acceptedCount === 0}
                className="flex-1 py-2 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Apply {acceptedCount} Change{acceptedCount !== 1 ? 's' : ''}
              </button>
              <button
                onClick={onReject}
                className="py-2 px-4 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                Reject All
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
