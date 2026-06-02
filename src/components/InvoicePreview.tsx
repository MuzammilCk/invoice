import React from 'react';
import { Invoice } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import { calculateSubtotal, calculateTax, calculateTotal } from '../lib/calculations';

interface InvoicePreviewProps {
  invoice: Invoice;
}

export function InvoicePreview({ invoice }: InvoicePreviewProps) {
  const subtotal = calculateSubtotal(invoice.items);
  const tax = calculateTax(subtotal, invoice.taxRate);
  const total = calculateTotal(subtotal, tax);

  return (
    <div className="bg-white text-slate-900 shadow-2xl rounded shadow-indigo-500/10 flex flex-col mx-auto" style={{ width: '210mm', minHeight: '297mm', padding: '15mm' }}>
      <div className="h-full flex flex-col">
        <div className="flex justify-between items-start mb-12">
          <div>
            <div className="h-12 w-12 mb-4 rounded flex items-center justify-center text-white font-serif italic text-2xl" style={{ backgroundColor: invoice.themeColor }}>
              {invoice.businessInfo.name.charAt(0).toUpperCase()}
            </div>
            <h2 className="text-3xl font-light tracking-tight">Invoice</h2>
            <p className="text-slate-400 text-xs mt-1">#{invoice.id.toUpperCase()}</p>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Billed To</div>
            <div className="text-base font-semibold">{invoice.customerInfo.name}</div>
            <div className="text-xs text-slate-500 mt-1 whitespace-pre-wrap">{invoice.customerInfo.address}</div>
            <div className="text-xs text-slate-500 mt-1">{invoice.customerInfo.email}</div>
          </div>
        </div>

        <div className="flex justify-between mb-12 border-b border-slate-100 pb-8">
          <div>
             <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">From</div>
             <div className="text-sm font-semibold">{invoice.businessInfo.name}</div>
             <div className="text-xs text-slate-500 mt-1 whitespace-pre-wrap">{invoice.businessInfo.address}</div>
             {invoice.businessInfo.taxId && (
               <div className="text-xs text-slate-500 mt-1">Tax ID: {invoice.businessInfo.taxId}</div>
             )}
          </div>
          <div className="text-right flex gap-12">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Issue Date</p>
              <p className="text-sm font-medium text-slate-800">{formatDate(invoice.issueDate)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Due Date</p>
              <p className="text-sm font-medium text-slate-800">{formatDate(invoice.dueDate)}</p>
            </div>
          </div>
        </div>

        <div className="flex-1">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Description</th>
                <th className="py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Qty</th>
                <th className="py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Rate</th>
                <th className="py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {invoice.items.map((item, index) => (
                <tr key={item.id || index} className="border-b border-slate-50">
                  <td className="py-4 font-medium">{item.description}</td>
                  <td className="py-4 text-right text-slate-600">{item.quantity}</td>
                  <td className="py-4 text-right text-slate-600">{formatCurrency(item.rate)}</td>
                  <td className="py-4 text-right font-semibold">{formatCurrency(item.quantity * item.rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Tax ({invoice.taxRate}%)</span>
              <span>{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between pt-4 border-t border-slate-200">
              <span className="text-sm font-bold">Total Due</span>
              <span className="text-2xl font-bold">{formatCurrency(total)}</span>
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
          {invoice.notes && (
            <div className="text-[10px] text-slate-400 text-right leading-tight italic whitespace-pre-wrap max-w-sm">
              {invoice.notes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
