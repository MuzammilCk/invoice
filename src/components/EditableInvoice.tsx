import React from 'react';
import { Invoice } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import { calculateSubtotal, calculateTax, calculateTotal } from '../lib/calculations';

interface EditableInvoiceProps {
  invoice: Invoice;
  updateInvoice: (updates: Partial<Invoice>) => void;
}

export function EditableInvoice({ invoice, updateInvoice }: EditableInvoiceProps) {
  const subtotal = calculateSubtotal(invoice.items);
  const tax = calculateTax(subtotal, invoice.taxRate);
  const total = calculateTotal(subtotal, tax);

  const updateBusinessInfo = (field: string, value: string) => {
    updateInvoice({ businessInfo: { ...invoice.businessInfo, [field]: value } });
  };

  const updateCustomerInfo = (field: string, value: string) => {
    updateInvoice({ customerInfo: { ...invoice.customerInfo, [field]: value } });
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...invoice.items];
    newItems[index] = { ...newItems[index], [field]: value };
    updateInvoice({ items: newItems });
  };

  const addItem = () => {
    updateInvoice({ items: [...invoice.items, { id: Math.random().toString(), description: 'New Item', quantity: 1, rate: 0 }] });
  };

  const Input = ({ value, onChange, className = '', placeholder = '', multiline = false, ...props }: any) => {
    const clazz = `bg-transparent border border-transparent hover:border-slate-200 focus:border-indigo-500 rounded px-1 transition-colors w-full focus:outline-none focus:ring-1 focus:ring-indigo-500 print:border-none print:shadow-none print:ring-0 print:p-0 ${className}`;
    if (multiline) {
      return <textarea value={value} onChange={onChange} className={clazz} placeholder={placeholder} rows={2} {...props} />;
    }
    return <input value={value} onChange={onChange} className={clazz} placeholder={placeholder} {...props} />;
  };

  return (
    <div className="bg-white text-slate-900 shadow-2xl rounded shadow-indigo-500/10 flex flex-col mx-auto transition-all" style={{ width: '210mm', minHeight: '297mm', padding: '15mm' }}>
      <div className="h-full flex flex-col">
        <div className="flex justify-between items-start mb-12">
          <div>
            <div className="h-12 w-12 mb-4 rounded flex items-center justify-center text-white font-serif italic text-2xl" style={{ backgroundColor: invoice.themeColor }}>
              {invoice.businessInfo.name ? invoice.businessInfo.name.charAt(0).toUpperCase() : 'B'}
            </div>
            <h2 className="text-3xl font-light tracking-tight">Invoice</h2>
            <div className="flex items-center gap-1 mt-1 text-slate-500">
              <span className="text-xs">#</span>
              <Input value={invoice.id} onChange={(e: any) => updateInvoice({ id: e.target.value })} className="text-xs" />
            </div>
          </div>
          <div className="text-right w-64">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Billed To</div>
            <Input value={invoice.customerInfo.name} onChange={(e: any) => updateCustomerInfo('name', e.target.value)} className="text-base font-semibold text-right" placeholder="Client Name" />
            <Input value={invoice.customerInfo.address} onChange={(e: any) => updateCustomerInfo('address', e.target.value)} multiline className="text-xs text-slate-500 mt-1 text-right" placeholder="Client Address" />
            <Input value={invoice.customerInfo.email} onChange={(e: any) => updateCustomerInfo('email', e.target.value)} className="text-xs text-slate-500 text-right" placeholder="Client Email" />
          </div>
        </div>

        <div className="flex justify-between mb-12 border-b border-slate-100 pb-8">
          <div className="w-64">
             <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">From</div>
             <Input value={invoice.businessInfo.name} onChange={(e: any) => updateBusinessInfo('name', e.target.value)} className="text-sm font-semibold" placeholder="Your Business Name" />
             <Input value={invoice.businessInfo.address} onChange={(e: any) => updateBusinessInfo('address', e.target.value)} multiline className="text-xs text-slate-500 mt-1" placeholder="Your Address" />
             <div className="flex items-center text-xs mt-1 text-slate-500">
               <span>Tax ID:</span>
               <Input value={invoice.businessInfo.taxId} onChange={(e: any) => updateBusinessInfo('taxId', e.target.value)} placeholder="Tax ID" />
             </div>
          </div>
          <div className="text-right flex gap-8">
            <div className="w-32">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Issue Date</p>
              <Input type="date" value={invoice.issueDate.split('T')[0]} onChange={(e: any) => updateInvoice({ issueDate: new Date(e.target.value).toISOString() })} className="text-sm font-medium text-slate-800 text-right" />
            </div>
            <div className="w-32">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Due Date</p>
              <Input type="date" value={invoice.dueDate.split('T')[0]} onChange={(e: any) => updateInvoice({ dueDate: new Date(e.target.value).toISOString() })} className="text-sm font-medium text-slate-800 text-right" />
            </div>
          </div>
        </div>

        <div className="flex-1">
          <table className="w-full text-left table-fixed">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 w-1/2">Description</th>
                <th className="py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right w-1/6">Qty</th>
                <th className="py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right w-1/6">Rate</th>
                <th className="py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right w-1/6">Amount</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {invoice.items.map((item, index) => (
                <tr key={item.id} className="border-b border-slate-50 group">
                  <td className="py-2 pr-2">
                    <Input value={item.description} onChange={(e: any) => updateItem(index, 'description', e.target.value)} placeholder="Item description" className="font-medium" />
                  </td>
                  <td className="py-2">
                    <Input type="number" value={item.quantity} onChange={(e: any) => updateItem(index, 'quantity', Number(e.target.value))} className="text-right text-slate-600" />
                  </td>
                  <td className="py-2">
                    <Input type="number" value={item.rate} onChange={(e: any) => updateItem(index, 'rate', Number(e.target.value))} className="text-right text-slate-600" />
                  </td>
                  <td className="py-2 text-right font-semibold pr-2 align-middle">
                    {formatCurrency(item.quantity * item.rate, invoice.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={addItem} className="mt-4 text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 opacity-50 hover:opacity-100 transition-opacity">
            + Add Line Item
          </button>
        </div>

        <div className="mt-8 flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm items-center">
              <span className="text-slate-400">Subtotal</span>
              <span>{formatCurrency(subtotal, invoice.currency)}</span>
            </div>
            <div className="flex justify-between text-sm items-center">
              <span className="text-slate-400 flex items-center gap-1">Tax <Input type="number" value={invoice.taxRate} onChange={(e: any) => updateInvoice({ taxRate: Number(e.target.value) })} className="w-16 text-right" />%</span>
              <span>{formatCurrency(tax, invoice.currency)}</span>
            </div>
            <div className="flex justify-between pt-4 border-t border-slate-200 items-baseline">
              <span className="text-sm font-bold">Total Due</span>
              <span className="text-2xl font-bold">{formatCurrency(total, invoice.currency)}</span>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-100 flex justify-between items-end">
          <div>
            <div className="text-[9px] font-bold uppercase text-slate-400 tracking-widest mb-2">Payment Methods</div>
            <div className="flex gap-2">
              <div className="w-10 h-6 bg-slate-100 rounded"></div>
              <div className="w-10 h-6 bg-slate-100 rounded"></div>
              <div className="w-10 h-6 bg-slate-100 rounded"></div>
            </div>
          </div>
          <div className="w-64">
            <Input value={invoice.notes} onChange={(e: any) => updateInvoice({ notes: e.target.value })} multiline className="text-[10px] text-slate-400 text-right leading-tight italic" placeholder="Notes & Terms" />
          </div>
        </div>
      </div>
    </div>
  );
}
