import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Invoice } from '../types';
import { generateId } from '../lib/utils';
import { Send, FileText, CheckCircle2, Sparkles, Languages, Bot } from 'lucide-react';
import { useStore } from '../store/useStore';

interface AIFormProps {
  onGenerate: (data: Partial<Invoice>) => void;
}

export function AIAssistantSidebar({ onGenerate }: AIFormProps) {
  const { id } = useParams();
  const { invoices, updateInvoice } = useStore();
  const invoice = invoices.find(inv => inv.id === id);

  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [auditMessage, setAuditMessage] = useState('');
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    setError('');

    try {
      const response = await fetch('/api/generate-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate');
      }

      const data = await response.json();
      
      const mappedData: Partial<Invoice> = {
        customerInfo: data.customerInfo,
        items: data.items.map((item: any) => ({
          ...item,
          id: generateId()
        })),
        taxRate: data.taxRate || 0,
        notes: data.notes || '',
      };

      onGenerate(mappedData);
      setPrompt('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAudit = () => {
    if (!invoice) return;
    
    let issues = [];
    if (!invoice.customerInfo.name) issues.push('Missing Client Name');
    if (!invoice.customerInfo.email) issues.push('Missing Client Email');
    if (invoice.items.length === 0) issues.push('No items added');
    if (invoice.items.some(i => i.quantity <= 0)) issues.push('Item quantity cannot be zero');
    if (!invoice.businessInfo.taxId) issues.push('Your Tax ID is recommended');
    
    if (issues.length === 0) {
      setAuditMessage('Invoice looks compliant and ready to send!');
    } else {
      setAuditMessage(`Please fix: ${issues.join(', ')}`);
    }
    setTimeout(() => setAuditMessage(''), 5000);
  };

  const handleRewriteNotes = async () => {
    if (!invoice || !invoice.notes) return;
    setIsRewriting(true);
    setError('');
    
    try {
      const response = await fetch('/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: invoice.notes, 
          context: 'Rewrite this invoice note to be more professional, polite, and persuasive for quick payment.' 
        }),
      });

      if (!response.ok) throw new Error('Rewrite failed');
      
      const data = await response.json();
      updateInvoice(invoice.id, { notes: data.text });
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsRewriting(false);
    }
  };

  return (
    <div className="w-[320px] border-r border-zinc-800 flex flex-col bg-zinc-900/40 flex-shrink-0 h-full overflow-hidden shadow-xl z-20 relative">
      <div className="p-6 flex-1 flex flex-col overflow-y-auto custom-scrollbar">
        <div className="mb-8">
          <label className="text-xs font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2 mb-4">
            <Bot className="w-4 h-4 text-indigo-400" /> AI Workbench
          </label>
          <div className="space-y-3">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Create an invoice for Acme Corp for website redesign..."
              className="w-full text-sm bg-zinc-900 border border-zinc-700/50 rounded-xl p-4 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 min-h-[140px] transition-colors shadow-sm"
            />
            {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
            
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="w-full text-left p-4 rounded-xl bg-indigo-600/10 border border-indigo-500/20 hover:bg-indigo-600/20 hover:border-indigo-500/50 transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group shadow-sm"
            >
              <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:text-indigo-300 transition-colors">
                {isGenerating ? (
                   <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                   </svg>
                ) : (
                   <Sparkles className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="text-sm font-semibold text-indigo-100">{isGenerating ? 'Generating...' : 'Generate with AI'}</div>
                <div className="text-xs text-indigo-300/70 mt-1">Extract full details clearly</div>
              </div>
            </button>

            <button onClick={handleRewriteNotes} disabled={isRewriting || !invoice?.notes} className="w-full text-left p-4 rounded-xl bg-zinc-800/40 border border-zinc-700/50 hover:bg-zinc-800/80 hover:border-zinc-500 transition-all flex items-center gap-3 group disabled:opacity-50 shadow-sm">
              <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-zinc-700/50 flex items-center justify-center text-emerald-400 group-hover:text-emerald-300 transition-colors">
                {isRewriting ? <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <Languages className="w-5 h-5" />}
              </div>
              <div>
                <div className="text-sm font-semibold text-zinc-200">Polish Notes (AI)</div>
                <div className="text-xs text-zinc-500 mt-1">Make notes professional</div>
              </div>
            </button>

            <button onClick={handleAudit} className="w-full text-left p-4 rounded-xl bg-zinc-800/40 border border-zinc-700/50 hover:bg-zinc-800/80 hover:border-zinc-500 transition-all flex items-center gap-3 group shadow-sm">
              <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-zinc-700/50 flex items-center justify-center text-amber-400 group-hover:text-amber-300 transition-colors">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-zinc-200">Audit Compliance</div>
                <div className="text-xs text-zinc-500 mt-1">Tax & terms validation</div>
              </div>
            </button>
            {auditMessage && <div className="p-3 mt-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs">{auditMessage}</div>}
          </div>
        </div>

        <div className="mt-auto pt-8">
          <div className="bg-gradient-to-br from-indigo-900/30 to-zinc-900/50 rounded-2xl p-5 border border-indigo-500/20 shadow-inner">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/50 text-white">
                 <Sparkles className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm font-bold text-zinc-100">Gemini Pro</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed italic">"I automatically structure your prompt into clean line items. I can also polish your notes to ensure prompt payment."</p>
          </div>
        </div>
      </div>
    </div>
  );
}
