import React from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { Invoice } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import { calculateSubtotal, calculateTax, calculateTotal } from '../lib/calculations';
import { TEMPLATES } from '../lib/templates';
import { SortableInvoiceTable } from './SortableInvoiceTable';
import { AnimatePresence, motion } from 'motion/react';
import { EyeOff, Trash2 } from 'lucide-react';

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
  const settings = invoice.displaySettings || {
    showTitle: true, showInvoiceId: true,
    showLogo: true, showFrom: true, showBilledTo: true,
    showIssueDate: true, showDueDate: true, showDiscount: true,
    showTax: true, showShipping: true, showNotes: true, showPaymentMethods: true
  };
  const subtotal = calculateSubtotal(invoice.items);
  
  const actualDiscountRate = settings.showDiscount ? (invoice.discountRate || 0) : 0;
  const discountAmount = subtotal * actualDiscountRate / 100;
  
  const taxableAmount = subtotal - discountAmount;
  const actualTaxRate = settings.showTax ? invoice.taxRate : 0;
  const tax = calculateTax(taxableAmount, actualTaxRate);
  
  const actualShipping = settings.showShipping ? (invoice.shipping || 0) : 0;
  const total = calculateTotal(subtotal, tax, discountAmount, actualShipping);
  
  const activeTemplate = TEMPLATES.find(t => t.id === invoice.templateId) || TEMPLATES[0];

  const updateBusinessInfo = (field: string, value: string) => {
    updateInvoice({ businessInfo: { ...invoice.businessInfo, [field]: value } });
  };

  const updateCustomerInfo = (field: string, value: string) => {
    updateInvoice({ customerInfo: { ...invoice.customerInfo, [field]: value } });
  };

  const updateSetting = (key: keyof typeof settings, value: boolean) => {
    updateInvoice({ displaySettings: { ...settings, [key]: value } });
  };

  const HideButton = ({ settingKey }: { settingKey: keyof typeof settings }) => {
    if (isExporting) return null;
    return (
      <button 
        onClick={() => updateSetting(settingKey, false)}
        className="absolute top-1 right-1 p-1 bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg opacity-0 group-hover/section:opacity-100 transition-all print:hidden shadow-lg z-10"
        title="Hide Section"
      >
        <EyeOff className="w-3.5 h-3.5" />
      </button>
    );
  };

  return (
    <div className={`bg-white shadow-2xl overflow-hidden flex flex-col mx-auto transition-all relative group/canvas ${activeTemplate.styles.fontFamily} ${isExporting ? 'export-mode' : ''}`} style={{ width: '210mm', minHeight: '297mm', padding: '15mm', borderRadius: activeTemplate.styles.borderRadius, color: activeTemplate.styles.tableStyle === 'modern' ? '#111827' : '#000' }}>
      
      {/* Template Color Accents */}
      {activeTemplate.styles.accentStyle === 'solid' && (
         <div className="absolute top-0 left-0 w-full h-4" style={{ backgroundColor: invoice.themeColor }}></div>
      )}
      {activeTemplate.styles.accentStyle === 'gradient' && (
         <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-r opacity-80" style={{ from: invoice.themeColor, backgroundImage: `linear-gradient(to right, ${invoice.themeColor}, #000000)` }}></div>
      )}

      <div className="h-full flex flex-col pt-4">
        {/* Header Dynamically styled based on template */}
        <div className={`flex justify-between items-start mb-12 ${activeTemplate.styles.headerLayout === 'col' ? 'flex-col gap-8' : ''} ${activeTemplate.styles.headerLayout === 'row-reverse' ? 'flex-row-reverse' : ''} ${activeTemplate.styles.headerLayout === 'col-reverse' ? 'flex-col-reverse gap-8' : ''}`}>
          <div className={`${activeTemplate.styles.headerLayout.includes('col') ? 'w-full' : 'flex-1 min-w-0 pr-4'}`}>
            <AnimatePresence>
              {settings.showLogo && (
                <motion.div key="logo" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="relative group/section">
                  <div className="h-16 w-16 mb-6 rounded flex items-center justify-center text-white font-serif italic text-3xl shadow-lg" style={{ backgroundColor: invoice.themeColor, borderRadius: activeTemplate.styles.borderRadius }}>
                    {invoice.businessInfo.name ? invoice.businessInfo.name.charAt(0).toUpperCase() : 'B'}
                  </div>
                  <HideButton settingKey="showLogo" />
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {settings.showTitle && (
                <motion.div key="title" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="relative group/section">
                  <h2 className="text-4xl font-light tracking-tight mb-2 uppercase break-words w-full"><Input value={invoice.title || "Invoice"} onChange={(e: any) => updateInvoice({ title: e.target.value })} className="text-4xl font-light tracking-tight uppercase" placeholder="INVOICE" /></h2>
                  <HideButton settingKey="showTitle" />
                </motion.div>
              )}
              {settings.showInvoiceId && (
                <motion.div key="invoiceId" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="relative group/section">
                  <div className="flex items-center gap-2 mt-2 text-slate-500 bg-slate-50 p-2 rounded w-max">
                    <span className="text-xs font-bold uppercase tracking-wider">#</span>
                    <Input value={invoice.id} onChange={(e: any) => updateInvoice({ id: e.target.value })} className="text-sm font-mono font-medium" />
                  </div>
                  <HideButton settingKey="showInvoiceId" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <div className={`flex gap-6 flex-shrink-0 ${activeTemplate.styles.headerLayout.includes('col') ? 'w-full justify-between' : 'text-right justify-end'}`}>
            {activeTemplate.styles.headerLayout === 'split' && (
              <AnimatePresence>
               {settings.showFrom && (
                 <motion.div key="from-split" initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="overflow-hidden">
                   <div className="text-left w-44 relative group/section">
                     <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">From</div>
                     <Input value={invoice.businessInfo.name} onChange={(e: any) => updateBusinessInfo('name', e.target.value)} className="text-sm font-semibold" placeholder="Your Business Name" />
                     <Input value={invoice.businessInfo.address} onChange={(e: any) => updateBusinessInfo('address', e.target.value)} multiline className="text-xs text-slate-500 mt-1" placeholder="Your Address" />
                     <div className="flex items-center text-[10px] mt-1 text-slate-500">
                       <Input value={invoice.businessInfo.taxId} onChange={(e: any) => updateBusinessInfo('taxId', e.target.value)} placeholder="Tax ID" />
                     </div>
                     <HideButton settingKey="showFrom" />
                   </div>
                 </motion.div>
               )}
              </AnimatePresence>
            )}
            
            <AnimatePresence>
              {settings.showBilledTo && (
                <motion.div key="billed-to" initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="overflow-hidden">
                  <div className={`${activeTemplate.styles.headerLayout === 'split' ? 'text-left' : 'text-right'} w-44 relative group/section`}>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Billed To</div>
                    <Input value={invoice.customerInfo.name} onChange={(e: any) => updateCustomerInfo('name', e.target.value)} className={`text-base font-bold ${activeTemplate.styles.headerLayout === 'split' ? '' : 'text-right'}`} placeholder="Client Name" />
                    <Input value={invoice.customerInfo.address} onChange={(e: any) => updateCustomerInfo('address', e.target.value)} multiline className={`text-xs text-slate-500 mt-1 ${activeTemplate.styles.headerLayout === 'split' ? '' : 'text-right'}`} placeholder="Client Address" />
                    <Input value={invoice.customerInfo.email} onChange={(e: any) => updateCustomerInfo('email', e.target.value)} className={`text-xs text-slate-500 ${activeTemplate.styles.headerLayout === 'split' ? '' : 'text-right'}`} placeholder="Client Email" />
                    <HideButton settingKey="showBilledTo" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {activeTemplate.styles.headerLayout !== 'split' && (
          <div className="flex justify-between mb-12 border-b border-slate-100 pb-8">
            <AnimatePresence>
              {settings.showFrom && (
                <motion.div key="from" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="w-64 relative group/section">
                   <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">From</div>
                   <Input value={invoice.businessInfo.name} onChange={(e: any) => updateBusinessInfo('name', e.target.value)} className="text-sm font-semibold" placeholder="Your Business Name" />
                   <Input value={invoice.businessInfo.address} onChange={(e: any) => updateBusinessInfo('address', e.target.value)} multiline className="text-xs text-slate-500 mt-1" placeholder="Your Address" />
                   <div className="flex items-center text-[10px] mt-1 text-slate-500">
                     <Input value={invoice.businessInfo.taxId} onChange={(e: any) => updateBusinessInfo('taxId', e.target.value)} placeholder="Tax ID" />
                   </div>
                   <HideButton settingKey="showFrom" />
                </motion.div>
              )}
              {!settings.showFrom && <div className="w-64"></div>}
            </AnimatePresence>
            <div className="flex gap-8">
              <AnimatePresence>
                {settings.showIssueDate && (
                  <motion.div key="issue" initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="overflow-hidden">
                    <div className="w-32 relative group/section">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Issue Date</p>
                      <Input type="date" value={invoice.issueDate.split('T')[0]} onChange={(e: any) => updateInvoice({ issueDate: new Date(e.target.value).toISOString() })} className="text-sm font-medium text-slate-800 text-right" />
                      <HideButton settingKey="showIssueDate" />
                    </div>
                  </motion.div>
                )}
                {settings.showDueDate && (
                  <motion.div key="due" initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }} className="overflow-hidden">
                    <div className="w-32 relative group/section">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Due Date</p>
                      <Input type="date" value={invoice.dueDate.split('T')[0]} onChange={(e: any) => updateInvoice({ dueDate: new Date(e.target.value).toISOString() })} className="text-sm font-medium text-slate-800 text-right" />
                      <HideButton settingKey="showDueDate" />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Dynamic Drag-and-Drop Table component! */}
        <SortableInvoiceTable items={invoice.items} currency={invoice.currency} updateItems={(newItems: any) => updateInvoice({ items: newItems })} Input={Input} isExporting={isExporting} />

        <div className="mt-8 flex justify-end">
          <div className="w-72 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="flex justify-between text-sm items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Subtotal</span>
              <span className="font-semibold">{formatCurrency(subtotal, invoice.currency)}</span>
            </div>
            <AnimatePresence>
              {settings.showDiscount && (
                <motion.div key="discount" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex justify-between text-sm items-center py-1 relative group/section overflow-hidden">
                  <span className="text-slate-500 flex items-center gap-1 group font-medium">
                    <span className="cursor-pointer group-hover:text-slate-800 transition-colors">Discount</span> 
                    <Input type="number" value={invoice.discountRate || 0} onChange={(e: any) => updateInvoice({ discountRate: Number(e.target.value) })} className="w-16 text-right bg-white border border-slate-200" />%
                  </span>
                  <span className="text-red-500">-{formatCurrency(discountAmount, invoice.currency)}</span>
                  <HideButton settingKey="showDiscount" />
                </motion.div>
              )}
              {settings.showTax && (
                <motion.div key="tax" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex justify-between text-sm items-center py-1 relative group/section overflow-hidden">
                  <span className="text-slate-500 flex items-center gap-1 font-medium">Tax <Input type="number" value={invoice.taxRate} onChange={(e: any) => updateInvoice({ taxRate: Number(e.target.value) })} className="w-16 text-right bg-white border border-slate-200" />%</span>
                  <span className="font-medium">{formatCurrency(tax, invoice.currency)}</span>
                  <HideButton settingKey="showTax" />
                </motion.div>
              )}
              {settings.showShipping && (
                <motion.div key="shipping" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex justify-between text-sm items-center py-1 border-b border-slate-200 pb-3 relative group/section overflow-hidden">
                  <span className="text-slate-500 font-medium pt-1">
                    Shipping
                  </span>
                  <span className="flex items-center">
                     <span className="text-slate-400 mr-1">$</span>
                     <Input type="number" value={invoice.shipping || 0} onChange={(e: any) => updateInvoice({ shipping: Number(e.target.value) })} className="w-20 text-right bg-white border border-slate-200" />
                  </span>
                  <HideButton settingKey="showShipping" />
                </motion.div>
              )}
            </AnimatePresence>
            <div className={`flex justify-between pt-3 items-baseline ${!settings.showShipping ? 'border-t border-slate-200' : ''}`}>
              <span className="text-base font-bold text-slate-800 uppercase tracking-widest">Total Due</span>
              <span className="text-3xl font-bold" style={{ color: invoice.themeColor }}>{formatCurrency(total, invoice.currency)}</span>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-8 border-t border-slate-150 flex justify-between items-end">
          <div className="w-1/2 pr-8">
            <AnimatePresence>
              {settings.showNotes && (
                <motion.div key="notes" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="relative group/section overflow-hidden">
                   <div className="text-[10px] font-bold uppercase text-slate-400 tracking-widest mb-3">Notes & Terms</div>
                   <Input value={invoice.notes} onChange={(e: any) => updateInvoice({ notes: e.target.value })} multiline className="text-xs text-slate-500 leading-relaxed min-h-[60px]" placeholder="Thank you for your business." />
                   <HideButton settingKey="showNotes" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div>
            <AnimatePresence>
              {settings.showPaymentMethods && (
                <motion.div key="payment-methods" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="relative group/section overflow-hidden">
                  <div className="text-[9px] font-bold uppercase text-slate-400 tracking-widest mb-2 text-right">Protected & Verified</div>
                  <div className="flex justify-end gap-2">
                    <div className="w-12 h-8 bg-slate-100 rounded-md"></div>
                    <div className="w-16 h-8 bg-slate-100 rounded-md"></div>
                  </div>
                  <HideButton settingKey="showPaymentMethods" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
