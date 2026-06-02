import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Sparkles, LayoutTemplate, MoreVertical, FileText, CalendarDays } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatDate, formatCurrency, generateId } from '../lib/utils';
import { motion } from 'motion/react';

export function Dashboard() {
  const navigate = useNavigate();
  const { invoices, businessInfo, addInvoice } = useStore();
  const [isAICreateOpen, setIsAICreateOpen] = useState(false);

  const createBlankInvoice = () => {
    const newInvoice = {
      id: generateId().toUpperCase(),
      title: 'Untitled Invoice',
      status: 'draft' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      issueDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      businessInfo,
      customerInfo: { name: '', email: '', address: '' },
      items: [{ id: generateId(), description: '', quantity: 1, rate: 0 }],
      taxRate: 0,
      notes: 'Thank you for your business. Terms: Net 30 days.',
      templateId: 'minimal',
      themeColor: '#6366f1',
      currency: 'USD',
    };
    addInvoice(newInvoice);
    navigate(`/editor/${newInvoice.id}`);
  };

  return (
    <div className="flex-1 p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <h1 className="text-3xl font-light tracking-tight mb-2">Projects</h1>
          <p className="text-zinc-500 text-sm">Manage your invoices, quotes, and billing documents.</p>
        </header>

        {/* Quick Actions */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <button 
            onClick={createBlankInvoice}
            className="flex flex-col items-center justify-center p-8 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-zinc-700 hover:bg-zinc-800/50 transition-all group"
          >
            <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 group-hover:text-zinc-200 group-hover:scale-110 transition-all mb-4">
              <Plus className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-sm">Blank Project</h3>
            <p className="text-xs text-zinc-500 mt-1">Start from scratch</p>
          </button>

          <button 
            onClick={() => setIsAICreateOpen(true)}
            className="flex flex-col items-center justify-center p-8 bg-gradient-to-b from-indigo-950/40 to-zinc-900 border border-indigo-500/20 rounded-2xl hover:border-indigo-500/50 hover:from-indigo-900/40 transition-all group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Sparkles className="w-24 h-24 text-indigo-400" />
            </div>
            <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400 group-hover:text-indigo-300 group-hover:scale-110 transition-all mb-4 z-10">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-sm text-indigo-100 z-10">Create with AI</h3>
            <p className="text-xs text-indigo-300/70 mt-1 z-10">Generate from prompt</p>
          </button>

          <button className="flex flex-col items-center justify-center p-8 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-zinc-700 hover:bg-zinc-800/50 transition-all group">
            <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 group-hover:text-zinc-200 group-hover:scale-110 transition-all mb-4">
              <LayoutTemplate className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-sm">Templates</h3>
            <p className="text-xs text-zinc-500 mt-1">Choose a starting point</p>
          </button>
        </section>

        {/* Recent Projects */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Recent Projects</h2>
          </div>
          
          {invoices.length === 0 ? (
            <div className="text-center py-16 bg-zinc-900/50 border border-zinc-800/50 rounded-2xl border-dashed">
              <FileText className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-400 font-medium">No projects yet</p>
              <p className="text-zinc-600 text-sm mt-1">Create your first invoice to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {invoices.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).map(invoice => (
                <div key={invoice.id} onClick={() => navigate(`/editor/${invoice.id}`)} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 hover:bg-zinc-800/80 cursor-pointer transition-colors group">
                   <div className="flex justify-between items-start mb-4">
                     <div>
                       <div className="flex items-center gap-2 mb-1">
                         <span className="bg-zinc-800 text-zinc-300 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">{invoice.status}</span>
                       </div>
                       <h3 className="font-medium truncate pr-4 text-zinc-200">{invoice.title || 'Untitled'}</h3>
                       <p className="text-xs text-zinc-500 mt-1">#{invoice.id}</p>
                     </div>
                     <button className="text-zinc-500 hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                       <MoreVertical className="w-4 h-4" />
                     </button>
                   </div>
                   <div className="flex justify-between items-end border-t border-zinc-800/50 pt-4 mt-4">
                     <div>
                       <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold mb-1">Client</p>
                       <p className="text-xs text-zinc-400 truncate max-w-[120px]">{invoice.customerInfo.name || 'Not specified'}</p>
                     </div>
                     <div className="text-right">
                        <p className="text-sm font-semibold">{formatCurrency(invoice.items.reduce((s, i) => s + (i.rate * i.quantity), 0) * (1 + invoice.taxRate/100), invoice.currency)}</p>
                        <p className="text-[10px] text-zinc-500 flex items-center justify-end gap-1 mt-1"><CalendarDays className="w-3 h-3"/> {formatDate(invoice.updatedAt)}</p>
                     </div>
                   </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      
      {/* AI Generate Modal */}
      {isAICreateOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <motion.div 
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             exit={{ opacity: 0, scale: 0.95 }}
             className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl"
           >
             <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-lg text-zinc-100">Create with AI</h2>
                    <p className="text-xs text-zinc-500">Describe your project, and AI will build the invoice.</p>
                  </div>
                </div>
                <button onClick={() => setIsAICreateOpen(false)} className="text-zinc-500 hover:text-zinc-300">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
             </div>
             
             {/* Note: In a real app we'd reuse the generate logic or put it in context. For now we will just create a basic one and send them to editor. */}
             <textarea 
               placeholder="e.g. Create an invoice for web development services for Acme Corp, 80 hours at $100/hr, add 5% tax."
               className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500 min-h-[120px] resize-none mb-6"
             ></textarea>
             
             <div className="flex justify-end gap-3">
               <button onClick={() => setIsAICreateOpen(false)} className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200">Cancel</button>
               <button onClick={() => {
                 // For now, act as "Blank" then they can use AI sidebar
                 createBlankInvoice();
                 setIsAICreateOpen(false);
               }} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg flex items-center gap-2">
                 <Sparkles className="w-4 h-4" /> Start Generating
               </button>
             </div>
           </motion.div>
        </div>
      )}
    </div>
  );
}
