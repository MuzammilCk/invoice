import React, { useRef, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AIAssistantSidebar } from '../components/AIAssistantSidebar';
import { EditableInvoice } from '../components/EditableInvoice';
import { useStore } from '../store/useStore';
import { TEMPLATES } from '../lib/templates';
import { Printer, Save, FileSignature, ArrowLeft, Palette, ZoomIn, ZoomOut, CheckCircle2, Undo2, Redo2, LayoutTemplate, Loader2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Invoice } from '../types';
import * as htmlToImage from 'html-to-image';
import jsPDF from 'jspdf';

function Dropdown({ options, value, onChange, placeholder }: { options: {value: string, label: string}[], value: string, onChange: (val: string) => void, placeholder: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find(o => o.value === value) || options[0];

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-zinc-900 border border-zinc-700/50 text-zinc-200 text-sm rounded-xl p-3 flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-sm"
      >
        <span>{selected?.label || placeholder}</span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} className="text-zinc-500"><ChevronDown className="w-4 h-4" /></motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            key="dropdown-menu"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 w-full mt-2 bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl z-[100] max-h-60 overflow-auto custom-scrollbar backdrop-blur-xl"
          >
            {options.map(opt => (
              <button 
                key={opt.value}
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                className={`w-full text-left px-4 py-3 text-sm hover:bg-zinc-700 transition-colors ${value === opt.value ? 'text-indigo-400 bg-zinc-800/80' : 'text-zinc-300'}`}
              >
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { invoices, updateInvoice, undo, redo, history } = useStore();
  const printRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.8);
  
  const invoice = invoices.find(inv => inv.id === id);

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  if (!invoice) {
    return <div className="flex h-screen items-center justify-center text-zinc-400">Invoice not found.</div>;
  }

  const handleHandleAIGeneration = (generatedData: Partial<Invoice>) => {
    updateInvoice(invoice.id, {
      ...generatedData,
      customerInfo: generatedData.customerInfo || invoice.customerInfo,
      items: generatedData.items?.length ? generatedData.items : invoice.items,
      taxRate: generatedData.taxRate !== undefined ? generatedData.taxRate : invoice.taxRate,
      notes: generatedData.notes !== undefined ? generatedData.notes : invoice.notes,
    });
  };

  const handlePrint = async () => {
    if (!printRef.current || isGeneratingPDF) return;
    
    setIsGeneratingPDF(true);

    try {
      // 1. Create off-screen wrapper node to ensure perfect dimensions irrespective of current viewport/zoom
      const tempWrapper = document.createElement('div');
      tempWrapper.style.position = 'absolute';
      tempWrapper.style.top = '-9999px';
      tempWrapper.style.left = '-9999px';
      tempWrapper.style.width = '210mm';
      tempWrapper.style.minHeight = '297mm';
      
      const elementClone = printRef.current.cloneNode(true) as HTMLElement;
      
      // Preserve the values of form elements
      const originalInputs = printRef.current.querySelectorAll('input') as NodeListOf<HTMLInputElement>;
      const clonedInputs = elementClone.querySelectorAll('input') as NodeListOf<HTMLInputElement>;
      originalInputs.forEach((input, i) => { if (clonedInputs[i]) { clonedInputs[i].value = input.value; if (input.type === 'checked') clonedInputs[i].checked = input.checked; } });
      
      const originalTextareas = printRef.current.querySelectorAll('textarea') as NodeListOf<HTMLTextAreaElement>;
      const clonedTextareas = elementClone.querySelectorAll('textarea') as NodeListOf<HTMLTextAreaElement>;
      originalTextareas.forEach((ta, i) => { if (clonedTextareas[i]) clonedTextareas[i].value = ta.value; });

      const originalSelects = printRef.current.querySelectorAll('select') as NodeListOf<HTMLSelectElement>;
      const clonedSelects = elementClone.querySelectorAll('select') as NodeListOf<HTMLSelectElement>;
      originalSelects.forEach((select, i) => { if (clonedSelects[i]) clonedSelects[i].value = select.value; });

      // Strip motion styling if any
      elementClone.style.transform = 'none';

      tempWrapper.appendChild(elementClone);
      document.body.appendChild(tempWrapper);

      const imgData = await htmlToImage.toPng(tempWrapper, {
        pixelRatio: 2, 
        backgroundColor: '#ffffff'
      });
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
      pdf.save(`${invoice.title || 'Invoice'}.pdf`);
      
      tempWrapper.remove();
    } catch (error) {
      console.error("PDF generation failed", error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left AI Sidebar */}
      <AIAssistantSidebar onGenerate={handleHandleAIGeneration} />

      {/* Main Area */}
      <div className="flex-1 min-w-0 flex flex-col h-full bg-zinc-950">
        <header className="h-16 px-6 flex justify-between items-center bg-zinc-900 border-b border-zinc-800 flex-shrink-0 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="text-zinc-400 hover:text-white transition-colors bg-zinc-800/50 p-2 rounded-lg hover:bg-zinc-800">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="h-5 w-px bg-zinc-800"></div>
            <div className="flex items-center gap-3">
              <input 
                value={invoice.title} 
                onChange={(e) => updateInvoice(invoice.id, { title: e.target.value })}
                className="bg-transparent text-sm font-semibold text-zinc-100 hover:bg-zinc-800 focus:bg-zinc-800 px-3 py-1.5 rounded-lg outline-none transition-colors border border-transparent focus:border-zinc-700 w-48 truncate"
                placeholder="Invoice Title"
              />
              <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-zinc-800/80 text-zinc-400 border border-zinc-700">{invoice.status}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 mr-2">
              <button onClick={undo} disabled={history.past.length === 0} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors" title="Undo">
                <Undo2 className="w-4 h-4" />
              </button>
              <div className="h-4 w-px bg-zinc-800"></div>
              <button onClick={redo} disabled={history.future.length === 0} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors" title="Redo">
                <Redo2 className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={handlePrint}
              disabled={isGeneratingPDF}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-zinc-950 bg-white rounded-lg hover:bg-zinc-200 transition-colors shadow-lg shadow-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingPDF ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
              {isGeneratingPDF ? 'Exporting...' : 'Export PDF'}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-zinc-950/80 relative custom-scrollbar">
          {/* Floating Zoom Controls */}
          <div className="fixed bottom-16 right-[340px] flex items-center bg-zinc-800 backdrop-blur-md rounded-full p-1.5 border border-zinc-700 shadow-2xl z-[100] print:hidden hidden md:flex">
             <button onClick={() => setZoom(Math.max(0.3, zoom - 0.1))} className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700 transition-colors">
               <ZoomOut className="w-4 h-4" />
             </button>
             <span className="text-[11px] font-mono w-14 text-center text-zinc-200 font-bold">{Math.round(zoom * 100)}%</span>
             <button onClick={() => setZoom(Math.min(2, zoom + 0.1))} className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700 transition-colors">
               <ZoomIn className="w-4 h-4" />
             </button>
          </div>

          <div className="w-full min-h-max flex justify-center py-16">
            <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.2s ease-out' }}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="print:p-0 print:m-0 print-shadow-none h-max origin-top"
                ref={printRef}
              >
                <EditableInvoice 
                  invoice={invoice} 
                  updateInvoice={(updates) => updateInvoice(invoice.id, updates)} 
                />
              </motion.div>
            </div>
          </div>
        </div>
        
        <footer className="h-10 px-6 flex flex-shrink-0 items-center justify-between border-t border-zinc-800 bg-zinc-900 text-[10px] text-zinc-500">
          <div className="flex gap-4">
            <span className="flex items-center gap-1.5 font-medium text-zinc-400"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div> Saved</span>
            <span className="text-zinc-500 hidden sm:inline">Project ID: {invoice.id}</span>
          </div>
        </footer>
      </div>

      {/* Right Properties Sidebar */}
      <div className="w-[320px] bg-zinc-900 flex flex-col h-full border-l border-zinc-800 flex-shrink-0 relative z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
         <div className="h-16 border-b border-zinc-800/80 flex items-center px-6 bg-zinc-900/80 backdrop-blur-sm z-30">
           <label className="text-xs font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2">
             <Palette className="w-4 h-4 text-indigo-400" /> Document Settings
           </label>
         </div>
         
         <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar relative">
           <div className="space-y-3 relative z-40">
             <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Design Family</span>
             <Dropdown 
               value={invoice.templateId}
               onChange={(val) => updateInvoice(invoice.id, { templateId: val })}
               placeholder="Select Template"
               options={TEMPLATES.map(tpl => ({ value: tpl.id, label: tpl.name }))}
             />
           </div>
           
           <div className="space-y-3 relative z-30">
             <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Accent Color</span>
             <div className="flex justify-between items-center bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50">
               <span className="text-sm text-zinc-300">Custom Color</span>
               <input type="color" className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer" value={invoice.themeColor} onChange={(e) => updateInvoice(invoice.id, { themeColor: e.target.value })} title="Custom Color" />
             </div>
             <div className="grid grid-cols-5 gap-2 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50">
               {['#4f46e5', '#059669', '#ea580c', '#e11d48', '#7c3aed', '#0f172a', '#2563eb', '#16a34a', '#d97706', '#be123c'].map(color => (
                 <button 
                   key={color}
                   onClick={() => updateInvoice(invoice.id, { themeColor: color })}
                   className="w-full aspect-square rounded-lg border-2 transition-all hover:scale-110 flex items-center justify-center shadow-inner"
                   style={{ backgroundColor: color, borderColor: invoice.themeColor === color ? 'white' : 'transparent' }}
                 >
                    {invoice.themeColor === color && <CheckCircle2 className="w-4 h-4 text-white drop-shadow-md" />}
                 </button>
               ))}
             </div>
           </div>

           <div className="space-y-3 relative z-20">
             <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2"><LayoutTemplate className="w-4 h-4 text-indigo-400" /> Document Modules</span>
             <div className="bg-zinc-900/50 p-1.5 rounded-2xl border border-zinc-800/80 divide-y divide-zinc-800/30 shadow-inner">
               {(function() {
                 const currentSettings = invoice.displaySettings || {
                   showTitle: true, showInvoiceId: true,
                   showLogo: true, showFrom: true, showBilledTo: true,
                   showIssueDate: true, showDueDate: true, showDiscount: true,
                   showTax: true, showShipping: true, showNotes: true, showPaymentMethods: true
                 };
                 return [
                   { key: 'showTitle', label: 'Invoice Title' },
                   { key: 'showInvoiceId', label: 'Invoice ID' },
                   { key: 'showLogo', label: 'Company Logo' },
                   { key: 'showFrom', label: 'From Address' },
                   { key: 'showBilledTo', label: 'Billed To Address' },
                   { key: 'showIssueDate', label: 'Issue Date' },
                   { key: 'showDueDate', label: 'Due Date' },
                   { key: 'showDiscount', label: 'Discount Row' },
                   { key: 'showTax', label: 'Tax Row' },
                   { key: 'showShipping', label: 'Shipping Row' },
                   { key: 'showNotes', label: 'Notes & Terms' },
                   { key: 'showPaymentMethods', label: 'Payment Box' },
                 ].map((module) => (
                   <div key={module.key} className="flex justify-between items-center p-3 hover:bg-zinc-800/30 transition-colors rounded-lg">
                     <span className="text-[13px] font-medium text-zinc-300 pointer-events-none">{module.label}</span>
                     <button 
                       onClick={() => updateInvoice(invoice.id, { 
                         displaySettings: { 
                           ...currentSettings, 
                           [module.key]: !currentSettings[module.key as keyof typeof currentSettings] 
                         } 
                       })}
                       className={`w-11 h-6 rounded-full relative transition-colors shadow-inner flex items-center border border-zinc-900/50 ${currentSettings[module.key as keyof typeof currentSettings] ? 'bg-indigo-500' : 'bg-zinc-700/80'}`}
                     >
                       <motion.div 
                         layout
                         transition={{ type: "spring", stiffness: 500, damping: 30 }}
                         className="w-4 h-4 bg-white rounded-full absolute shadow-sm"
                         style={{ left: currentSettings[module.key as keyof typeof currentSettings] ? 'calc(100% - 1.25rem)' : '0.25rem' }}
                       />
                     </button>
                   </div>
                 ));
               })()}
             </div>
           </div>
           
           <div className="space-y-3 relative z-10">
             <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Currency Profile</span>
             <Dropdown 
               value={invoice.currency}
               onChange={(val) => updateInvoice(invoice.id, { currency: val })}
               placeholder="Select Currency"
               options={[
                 { value: 'USD', label: 'USD ($) - United States' },
                 { value: 'EUR', label: 'EUR (€) - European Union' },
                 { value: 'GBP', label: 'GBP (£) - United Kingdom' },
                 { value: 'INR', label: 'INR (₹) - India' },
                 { value: 'AUD', label: 'AUD ($) - Australia' },
                 { value: 'CAD', label: 'CAD ($) - Canada' }
               ]}
             />
           </div>
           
           <div className="pt-8 border-t border-zinc-800/50 relative z-0">
             <div className="space-y-3">
               <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Document State</label>
               <Dropdown 
                 value={invoice.status}
                 onChange={(val) => updateInvoice(invoice.id, { status: val as any })}
                 placeholder="Select State"
                 options={[
                   { value: 'draft', label: 'Draft - Unsent' },
                   { value: 'pending', label: 'Pending - Waiting Payment' },
                   { value: 'paid', label: 'Paid - Completed' },
                   { value: 'overdue', label: 'Overdue - Action Required' }
                 ]}
               />
             </div>
           </div>
         </div>
      </div>
      
      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:p-0, .print\\:p-0 * {
            visibility: visible;
          }
          .print\\:p-0 {
            position: absolute;
            left: 0;
            top: 0;
            margin: 0;
            padding: 0;
            box-shadow: none !important;
            width: 100%;
          }
          @page { margin: 0; }
        }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #3f3f46;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #52525b;
        }
      `}} />
    </div>
  );
}

