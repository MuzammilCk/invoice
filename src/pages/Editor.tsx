import React, { useRef, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AIAssistantSidebar } from '../components/AIAssistantSidebar';
import { EditableInvoice } from '../components/EditableInvoice';
import { useStore } from '../store/useStore';
import { Printer, Save, FileSignature, ArrowLeft, Palette } from 'lucide-react';
import { motion } from 'motion/react';
import { Invoice } from '../types';

export function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { invoices, updateInvoice } = useStore();
  const printRef = useRef<HTMLDivElement>(null);
  
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
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-900 border-r border-zinc-800">
        <header className="h-16 px-8 flex justify-between items-center bg-zinc-900/30 border-b border-zinc-800 flex-shrink-0 z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="text-zinc-500 hover:text-zinc-300">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="h-6 w-px bg-zinc-800"></div>
            <div className="flex flex-col">
              <input 
                value={invoice.title} 
                onChange={(e) => updateInvoice(invoice.id, { title: e.target.value })}
                className="bg-transparent text-sm font-medium text-zinc-100 hover:bg-zinc-800 focus:bg-zinc-800 px-2 py-0.5 rounded outline-none transition-colors"
              />
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-400 border border-zinc-700">{invoice.status}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-zinc-950 bg-zinc-100 rounded-lg hover:bg-white transition-colors"
            >
              <Printer className="w-4 h-4" />
              Export PDF
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 flex justify-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="print:p-0 print:m-0 print-shadow-none"
            ref={printRef}
          >
            <EditableInvoice 
              invoice={invoice} 
              updateInvoice={(updates) => updateInvoice(invoice.id, updates)} 
            />
          </motion.div>
        </div>
        
        <footer className="h-10 px-6 flex flex-shrink-0 items-center justify-between border-t border-zinc-800 bg-zinc-950 text-[10px] text-zinc-500">
          <div className="flex gap-4">
            <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div> Saved</span>
            <span>ID: {invoice.id}</span>
          </div>
        </footer>
      </div>

      {/* Right Properties Sidebar */}
      <div className="w-72 bg-zinc-900/20 flex flex-col overflow-y-auto flex-shrink-0">
         <div className="p-6">
           <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-4 flex items-center gap-2">
             <Palette className="w-3 h-3" /> Design & Settings
           </label>
           
           <div className="space-y-6">
             <div className="space-y-2">
               <span className="text-xs text-zinc-400">Template Style</span>
               <select 
                 value={invoice.templateId}
                 onChange={(e) => updateInvoice(invoice.id, { templateId: e.target.value })}
                 className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs rounded-lg p-2.5 focus:outline-none focus:border-indigo-500"
               >
                 <option value="minimal">Minimal Executive</option>
                 <option value="corporate">Corporate Classic</option>
                 <option value="modern">Modern Bold</option>
               </select>
             </div>
             
             <div className="space-y-2">
               <span className="text-xs text-zinc-400">Theme Color</span>
               <div className="flex gap-2">
                 {['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0f172a'].map(color => (
                   <button 
                     key={color}
                     onClick={() => updateInvoice(invoice.id, { themeColor: color })}
                     className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
                     style={{ backgroundColor: color, borderColor: invoice.themeColor === color ? 'white' : 'transparent' }}
                   />
                 ))}
               </div>
             </div>
             
             <div className="space-y-2">
               <span className="text-xs text-zinc-400">Currency</span>
               <select 
                 value={invoice.currency}
                 onChange={(e) => updateInvoice(invoice.id, { currency: e.target.value })}
                 className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs rounded-lg p-2.5 focus:outline-none focus:border-indigo-500"
               >
                 <option value="USD">USD ($)</option>
                 <option value="EUR">EUR (€)</option>
                 <option value="GBP">GBP (£)</option>
                 <option value="INR">INR (₹)</option>
               </select>
             </div>
             
             <div className="pt-6 border-t border-zinc-800">
               <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-4">Invoice Status</label>
               <select 
                 value={invoice.status}
                 onChange={(e) => updateInvoice(invoice.id, { status: e.target.value as any })}
                 className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs rounded-lg p-2.5 focus:outline-none focus:border-indigo-500 appearance-none"
               >
                 <option value="draft">Draft</option>
                 <option value="pending">Pending Payment</option>
                 <option value="paid">Paid successfully</option>
                 <option value="overdue">Overdue</option>
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
        }
      `}} />
    </div>
  );
}
