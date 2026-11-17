import React from 'react';
import { Invoice } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import { computeInvoiceTotals } from '../lib/calculations';

interface InvoicePreviewProps {
  invoice: Invoice;
}

export function InvoicePreview({ invoice }: InvoicePreviewProps) {
  const totals = computeInvoiceTotals(invoice);

  return (
    <div className="bg-white text-slate-900 shadow-2xl rounded flex flex-col mx-auto" style={{ width: '210mm', minHeight: '297mm', padding: '15mm' }}>
      <div className="h-full flex flex-col">
        <div className="flex justify-between items-start mb-12">
          <div>
            <h2 className="text-3xl font-light tracking-tight">{invoice.businessInfo.name || 'Invoice'}</h2>
            <p className="text-slate-400 text-xs mt-1">#{(invoice.invoiceNumber || 'DRAFT').toUpperCase()}</p>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Billed To</div>
            <div className="text-base font-semibold">{invoice.customerInfo.name}</div>
            {invoice.customerInfo.address && (
              <div className="text-xs text-slate-500 mt-1 whitespace-pre-wrap">{invoice.customerInfo.address}</div>
            )}
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
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Date</p>
            <p className="text-sm font-medium text-slate-800">{formatDate(invoice.issueDate)}</p>
          </div>
        </div>

        <div className="flex-1">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Description</th>
                <th className="py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Price</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {invoice.items.map((item, index) => (
                <tr key={item.id || index} className="border-b border-slate-50">
                  <td className="py-4 font-medium">{item.description}</td>
                  <td className="py-4 text-right font-semibold">{formatCurrency(item.rate, invoice.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between pt-4 border-t border-slate-200">
              <span className="text-sm font-bold">Total</span>
              <span className="text-2xl font-bold">{formatCurrency(totals.grandTotal, invoice.currency)}</span>
            </div>
          </div>
        </div>

        {invoice.notes && (
          <div className="mt-12 pt-6 border-t border-slate-100 flex justify-between items-end">
            <div className="text-[10px] text-slate-400 leading-tight italic whitespace-pre-wrap max-w-sm">
              {invoice.notes}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
