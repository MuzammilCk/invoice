import React, { useRef, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AIAssistantSidebar } from '../components/AIAssistantSidebar';
import { EditableInvoice } from '../components/EditableInvoice';
import { useStore } from '../store/useStore';
import { TEMPLATES } from '../lib/templates';
import { Printer, Save, FileSignature, ArrowLeft, Palette, ZoomIn, ZoomOut, CheckCircle2, Undo2, Redo2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Invoice } from '../types';

export function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { invoices, updateInvoice, undo, redo, history } = useStore();
  const printRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.8);
  
  const invoice = invoices.find(inv => inv.id === id);

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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left AI Sidebar */}
      <AIAssistantSidebar onGenerate={handleHandleAIGeneration} />

      {/* Main Area */}
      <div className="flex-1 flex flex-col h-full bg-zinc-950">
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
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-zinc-950 bg-white rounded-lg hover:bg-zinc-200 transition-colors shadow-lg shadow-white/10"
            >
              <Printer className="w-3.5 h-3.5" />
              Export PDF
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto bg-zinc-950 relative p-8 custom-scrollbar pt-12" style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
          {/* Floating Zoom Controls */}
          <div className="fixed bottom-16 right-80 mr-8 flex items-center bg-zinc-800/90 backdrop-blur-sm rounded-full p-1 border border-zinc-700 shadow-2xl z-20 print:hidden hidden md:flex">
             <button onClick={() => setZoom(Math.max(0.3, zoom - 0.1))} className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700 transition-colors">
               <ZoomOut className="w-4 h-4" />
             </button>
             <span className="text-[11px] font-mono w-14 text-center text-zinc-300 font-medium">{Math.round(zoom * 100)}%</span>
             <button onClick={() => setZoom(Math.min(2, zoom + 0.1))} className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700 transition-colors">
               <ZoomIn className="w-4 h-4" />
             </button>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="print:p-0 print:m-0 print-shadow-none origin-top transition-transform h-max"
            style={{ 
              transform: `scale(${zoom})`, 
              transformOrigin: 'top center',
              marginBottom: `-${(1 - zoom) * 297}mm`,
              marginRight: `-${(1 - zoom) * 210}mm`, 
              marginLeft: `-${(1 - zoom) * 210}mm`
            }}
            ref={printRef}
          >
            <EditableInvoice 
              invoice={invoice} 
              updateInvoice={(updates) => updateInvoice(invoice.id, updates)} 
            />
          </motion.div>
        </div>
        
        <footer className="h-10 px-6 flex flex-shrink-0 items-center justify-between border-t border-zinc-800 bg-zinc-900 text-[10px] text-zinc-500">
          <div className="flex gap-4">
            <span className="flex items-center gap-1.5 font-medium text-zinc-400"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div> Saved</span>
            <span className="text-zinc-500 hidden sm:inline">Project ID: {invoice.id}</span>
          </div>
        </footer>
      </div>

      {/* Right Properties Sidebar */}
      <div className="w-[320px] bg-zinc-900/40 flex flex-col h-full border-l border-zinc-800 flex-shrink-0 relative z-20 shadow-xl">
         <div className="h-16 border-b border-zinc-800/50 flex items-center px-6 bg-zinc-900/50">
           <label className="text-xs font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2">
             <Palette className="w-4 h-4 text-indigo-400" /> Document Settings
           </label>
         </div>
         
         <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
           <div className="space-y-3">
             <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Design Family</span>
             <select 
               value={invoice.templateId}
               onChange={(e) => updateInvoice(invoice.id, { templateId: e.target.value })}
               className="w-full bg-zinc-900 border border-zinc-700/50 text-zinc-200 text-sm rounded-xl p-3 focus:outline-none focus:border-indigo-500 transition-colors shadow-sm"
             >
               {TEMPLATES.map(tpl => (
                 <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
               ))}
             </select>
           </div>
           
           <div className="space-y-3 flex flex-col">
             <div className="flex justify-between items-center">
               <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Accent Color</span>
               <input type="color" className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer" value={invoice.themeColor} onChange={(e) => updateInvoice(invoice.id, { themeColor: e.target.value })} title="Custom Color" />
             </div>
             
             <div className="grid grid-cols-5 gap-2 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50 object-cover">
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
           
           <div className="space-y-3">
             <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Currency Profile</span>
             <select 
               value={invoice.currency}
               onChange={(e) => updateInvoice(invoice.id, { currency: e.target.value })}
               className="w-full bg-zinc-900 border border-zinc-700/50 text-zinc-200 text-sm rounded-xl p-3 focus:outline-none focus:border-indigo-500 transition-colors shadow-sm"
             >
               <option value="USD">USD ($) - United States</option>
               <option value="EUR">EUR (€) - European Union</option>
               <option value="GBP">GBP (£) - United Kingdom</option>
               <option value="INR">INR (₹) - India</option>
               <option value="AUD">AUD ($) - Australia</option>
               <option value="CAD">CAD ($) - Canada</option>
             </select>
           </div>
           
           <div className="pt-8 border-t border-zinc-800/50">
             <div className="space-y-3">
               <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Document State</label>
               <select 
                 value={invoice.status}
                 onChange={(e) => updateInvoice(invoice.id, { status: e.target.value as any })}
                 className="w-full bg-zinc-900 border border-zinc-700/50 text-zinc-200 text-sm rounded-xl p-3 focus:outline-none focus:border-indigo-500 shadow-sm font-medium transition-colors"
               >
                 <option value="draft">Draft - Unsent</option>
                 <option value="pending">Pending - Waiting Payment</option>
                 <option value="paid">Paid - Completed</option>
                 <option value="overdue">Overdue - Action Required</option>
               </select>
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

