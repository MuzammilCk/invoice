import React from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { Invoice } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import { computeInvoiceTotals } from '../lib/calculations';
import { Trash2, Plus } from 'lucide-react';
import { generateId } from '../lib/utils';

interface EditableInvoiceProps {
  invoice: Invoice;
  updateInvoice: (updates: Partial<Invoice>) => void;
  isExporting?: boolean;
}

export const Input = ({ value, onChange, className = '', placeholder = '', multiline = false, ...props }: any) => {
  const clazz = `bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 rounded px-2 py-1 transition-colors w-full focus:outline-none focus:ring-1 focus:ring-indigo-500 print:border-none print:shadow-none print:ring-0 print:p-0 text-slate-900 resize-none ${className}`;
  if (multiline) {
    return <TextareaAutosize value={value} onChange={onChange} className={clazz} placeholder={placeholder} {...props} />;
  }
  return <input value={value} onChange={onChange} className={clazz} placeholder={placeholder} {...props} />;
};

export function EditableInvoice({ invoice, updateInvoice, isExporting = false }: EditableInvoiceProps) {
  const totals = computeInvoiceTotals(invoice);

  const updateCustomerInfo = (field: string, value: string) => {
    updateInvoice({ customerInfo: { ...invoice.customerInfo, [field]: value } });
  };

  const updateBusinessInfo = (field: string, value: string) => {
    updateInvoice({ businessInfo: { ...invoice.businessInfo, [field]: value } });
  };

  const addItem = () => {
    updateInvoice({
      items: [...invoice.items, { id: generateId(), description: '', quantity: 1, rate: 0 }],
    });
  };

  const updateItem = (index: number, field: string, value: string | number) => {
    const newItems = invoice.items.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    );
    updateInvoice({ items: newItems });
  };

  const removeItem = (index: number) => {
    updateInvoice({ items: invoice.items.filter((_, i) => i !== index) });
  };

  return (
    <div
      className={`bg-white shadow-2xl overflow-hidden flex flex-col mx-auto transition-all relative font-sans ${isExporting ? 'export-mode' : ''}`}
      style={{ width: '210mm', minHeight: '297mm', padding: '15mm', color: '#111827' }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-10">
        {/* Business info (From) */}
        <div className="flex-1 min-w-0 pr-8">
          <Input
            value={invoice.businessInfo.name}
            onChange={(e: any) => updateBusinessInfo('name', e.target.value)}
            className="text-lg font-bold text-slate-800"
            placeholder="Business Name"
          />
          <Input
            value={invoice.businessInfo.address}
            onChange={(e: any) => updateBusinessInfo('address', e.target.value)}
            multiline
            className="text-xs text-slate-500 mt-1"
            placeholder="Business Address"
          />
        </div>

        {/* Invoice meta */}
        <div className="text-right flex-shrink-0 w-48">
          <h2 className="text-3xl font-light tracking-tight text-slate-700 mb-3 uppercase">Invoice</h2>
          <div className="text-xs text-slate-500 space-y-1">
            <div className="flex justify-end items-center gap-2">
              <span className="font-bold uppercase tracking-wider text-slate-400">#</span>
              <Input
                value={invoice.invoiceNumber}
                onChange={(e: any) => updateInvoice({ invoiceNumber: e.target.value })}
                className="text-sm font-mono font-medium text-right"
              />
            </div>
            <div className="flex justify-end items-center gap-2">
              <span className="font-bold uppercase tracking-wider text-slate-400">Date</span>
              <Input
                type="date"
                value={invoice.issueDate ? invoice.issueDate.split('T')[0] : ''}
                onChange={(e: any) => updateInvoice({ issueDate: new Date(e.target.value).toISOString() })}
                className="text-sm text-right"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Billed To */}
      <div className="mb-10 border-b border-slate-100 pb-6">
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Billed To</div>
        <Input
          value={invoice.customerInfo.name}
          onChange={(e: any) => updateCustomerInfo('name', e.target.value)}
          className="text-base font-bold text-slate-800"
          placeholder="Client Name"
        />
        <Input
          value={invoice.customerInfo.address}
          onChange={(e: any) => updateCustomerInfo('address', e.target.value)}
          multiline
          className="text-xs text-slate-500 mt-1"
          placeholder="Client Address"
        />
      </div>

      {/* Items Table */}
      <div className="flex-1">
        <table className="w-full text-sm mb-2">
          <thead>
            <tr className="border-b-2 border-slate-200">
              <th className="text-left pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 w-full">Description</th>
              <th className="text-right pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 w-32 pl-4">Amount (₹)</th>
              {!isExporting && <th className="w-8"></th>}
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, i) => (
              <tr key={item.id} className="border-b border-slate-50 group">
                <td className="py-2 pr-4">
                  <Input
                    value={item.description}
                    onChange={(e: any) => updateItem(i, 'description', e.target.value)}
                    placeholder="Item description"
                  />
                </td>
                <td className="py-2 pl-4 w-32">
                  <Input
                    type="number"
                    value={item.rate}
                    onChange={(e: any) => updateItem(i, 'rate', parseFloat(e.target.value) || 0)}
                    className="text-right font-mono"
                    placeholder="0.00"
                  />
                </td>
                {!isExporting && (
                  <td className="py-2 pl-2">
                    <button
                      onClick={() => removeItem(i)}
                      className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {!isExporting && (
          <button
            onClick={addItem}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-500 transition-colors mt-2 print:hidden"
          >
            <Plus className="w-3.5 h-3.5" />
            Add item
          </button>
        )}
      </div>

      {/* Total */}
      <div className="mt-8 flex justify-end">
        <div className="w-56 space-y-2">
          <div className="flex justify-between text-sm font-bold border-t-2 border-slate-800 pt-3">
            <span className="uppercase tracking-widest text-slate-700">Total</span>
            <span className="text-xl font-bold text-slate-900">
              {formatCurrency(totals.grandTotal, invoice.currency || 'INR')}
            </span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {(invoice.notes || !isExporting) && (
        <div className="mt-10 pt-6 border-t border-slate-100">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Notes</div>
          <Input
            value={invoice.notes}
            onChange={(e: any) => updateInvoice({ notes: e.target.value })}
            multiline
            className="text-xs text-slate-500 leading-relaxed min-h-[40px]"
            placeholder="Thank you for your business."
          />
        </div>
      )}
    </div>
  );
}
