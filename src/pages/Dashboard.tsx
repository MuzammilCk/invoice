import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Sparkles, LayoutTemplate, MoreVertical, FileText, CalendarDays, Mic, Type } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatDate, formatCurrency, generateId } from '../lib/utils';
import { computeInvoiceTotals } from '../lib/calculations';
import { TEMPLATES } from '../lib/templates';
import { motion, AnimatePresence } from 'motion/react';
import { z } from 'zod';

const AIResponseSchema = z.object({
  customerInfo: z.object({
    name: z.string().max(200).optional().catch(undefined),
    email: z.string().max(200).optional().catch(undefined),
    address: z.string().max(500).optional().catch(undefined),
  }).optional(),
  items: z.array(z.object({
    description: z.string().max(500),
    quantity: z.number().positive().max(100_000),
    rate: z.number().min(0).max(1_000_000),
  })).min(1).max(100),
  taxRate: z.number().min(0).max(100).optional().default(0),
  notes: z.string().max(2000).optional().default(''),
});

export function Dashboard() {
  const navigate = useNavigate();
  const { invoices, businessInfo, addInvoice } = useStore();
  const [isAICreateOpen, setIsAICreateOpen] = useState(false);
  const [aiMode, setAiMode] = useState<'text' | 'voice'>('text');
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const startBlank = (templateId = 'minimal-executive') => {
    const newInvoice = {
      id: generateId(),
      invoiceNumber: `INV-${Date.now().toString(36).toUpperCase()}`,
      title: 'Untitled Document',
      status: 'draft' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      issueDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      businessInfo,
      customerInfo: { name: '', email: '', address: '' },
      items: [{ id: generateId(), description: '', quantity: 1, rate: 0 }],
      taxRate: 0,
      notes: '',
      templateId,
      themeColor: '#6366f1',
      currency: 'USD',
      displaySettings: {
        showTitle: true, showInvoiceId: true,
        showLogo: true, showFrom: true, showBilledTo: true,
        showIssueDate: true, showDueDate: true, showDiscount: true,
        showTax: true, showShipping: true, showNotes: true, showPaymentMethods: true
      }
    };
    addInvoice(newInvoice);
    navigate(`/editor/${newInvoice.id}`);
  };

  const handleCreateAI = async () => {
    setIsGenerating(true);
    try {
      let generatedData = null;
      if (aiMode === 'voice' && audioBlob) {
        const formData = new FormData();
        formData.append('audio', audioBlob, 'voice.webm');
        const res = await fetch('/api/v1/audio-to-invoice', { method: 'POST', body: formData });
        if (!res.ok) throw new Error('Audio generation failed');
        generatedData = await res.json();
      } else if (aiMode === 'text' && prompt) {
        const res = await fetch('/api/v1/generate-invoice', { 
          method: 'POST', 
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ prompt })
        });
        if (!res.ok) throw new Error('Text generation failed');
        generatedData = await res.json();
      }

      if (generatedData) {
        const parsed = AIResponseSchema.safeParse(generatedData);
        if (!parsed.success) {
          console.error('AI response validation failed:', parsed.error);
          throw new Error('AI returned invalid data');
        }
        
        const validData = parsed.data;
        const newInvoice = {
          id: generateId(),
          invoiceNumber: `INV-${Date.now().toString(36).toUpperCase()}`,
          title: 'Generated Invoice',
          status: 'draft' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          issueDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
          businessInfo,
          customerInfo: validData.customerInfo ? {
            name: validData.customerInfo.name || '',
            email: validData.customerInfo.email || '',
            address: validData.customerInfo.address || '',
          } : { name: '', email: '', address: '' },
          items: validData.items?.length ? validData.items.map((i: any) => ({ ...i, id: generateId() })) : [{ id: generateId(), description: '', quantity: 1, rate: 0 }],
          taxRate: validData.taxRate || 0,
          notes: validData.notes || '',
          templateId: 'minimal-executive',
          themeColor: '#4f46e5',
          currency: 'USD',
          displaySettings: {
            showTitle: true, showInvoiceId: true,
            showLogo: true, showFrom: true, showBilledTo: true,
            showIssueDate: true, showDueDate: true, showDiscount: true,
            showTax: true, showShipping: true, showNotes: true, showPaymentMethods: true
          }
        };
        addInvoice(newInvoice);
        navigate(`/editor/${newInvoice.id}`);
      }
    } catch (e) {
      console.error(e);
      alert('Generation Failed');
    } finally {
      setIsGenerating(false);
      setIsAICreateOpen(false);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        const chunks: BlobPart[] = [];
        mediaRecorder.ondataavailable = e => chunks.push(e.data);
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          setAudioBlob(blob);
          stream.getTracks().forEach(track => track.stop());
        };
        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        alert("Microphone access denied or unavailable.");
      }
    }
  };

  const createModes = [
    { id: 'blank', title: 'Start Blank', icon: Plus, color: 'bg-zinc-800 text-white hover:bg-zinc-700', onClick: () => startBlank() },
    { id: 'text', title: 'Start with Text AI', icon: Type, color: 'bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 border border-indigo-500/20', onClick: () => { setAiMode('text'); setIsAICreateOpen(true); } },
    { id: 'voice', title: 'Start with Voice AI', icon: Mic, color: 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/20', onClick: () => { setAiMode('voice'); setIsAICreateOpen(true); } },
  ];

  return (
    <div className="flex-1 p-8 lg:p-12 overflow-y-auto bg-zinc-950">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-light tracking-tight mb-2 text-zinc-100">Workspace</h1>
            <p className="text-zinc-500">Design, automate, and dispatch enterprise billing.</p>
          </div>
        </header>

        {/* Creation Hub */}
        <section className="mb-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {createModes.map((mode, i) => (
              <motion.button 
                key={mode.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={mode.onClick}
                className={`flex items-center gap-4 p-6 rounded-2xl transition-all ${mode.color} group`}
              >
                <div className="w-12 h-12 bg-black/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <mode.icon className="w-6 h-6" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-lg">{mode.title}</h3>
                  <p className="text-xs opacity-70 mt-1">Click to create</p>
                </div>
              </motion.button>
            ))}
          </div>
        </section>

        {/* Recent & Templates */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
          {/* Projects Pipeline */}
          <section className="xl:col-span-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Active Documents
            </h2>
            
            {invoices.length === 0 ? (
              <div className="text-center py-20 bg-zinc-900/40 rounded-3xl border border-zinc-800/50 border-dashed">
                <FileText className="w-16 h-16 text-zinc-800 mx-auto mb-4" />
                <p className="text-zinc-300 font-medium text-lg">Your workspace is empty</p>
                <p className="text-zinc-500 text-sm mt-2">Start a new document above</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {invoices.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).map(invoice => (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    key={invoice.id} onClick={() => navigate(`/editor/${invoice.id}`)} 
                    className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 hover:shadow-xl hover:shadow-black/50 cursor-pointer transition-all group"
                  >
                     <div className="flex justify-between items-start mb-6">
                       <div>
                         <span className="bg-zinc-800 text-zinc-300 text-[10px] font-bold px-2 py-1 rounded inline-block uppercase tracking-wider mb-3">{invoice.status}</span>
                         <h3 className="font-medium text-lg text-zinc-100 group-hover:text-indigo-400 transition-colors">{invoice.title || 'Untitled'}</h3>
                         <p className="text-xs text-zinc-500 font-mono mt-1">ID: {invoice.id}</p>
                       </div>
                       <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center font-serif text-zinc-400">
                         {invoice.customerInfo.name ? invoice.customerInfo.name.charAt(0).toUpperCase() : '?'}
                       </div>
                     </div>
                     <div className="flex justify-between items-end pt-4 border-t border-zinc-800/60">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Value</p>
                          <p className="font-semibold text-lg text-zinc-200">{formatCurrency(computeInvoiceTotals(invoice).grandTotal, invoice.currency)}</p>
                        </div>
                        <div className="text-right text-xs text-zinc-500 flex items-center gap-1.5">
                          <CalendarDays className="w-3.5 h-3.5"/> 
                          {formatDate(invoice.updatedAt)}
                        </div>
                     </div>
                  </motion.div>
                ))}
              </div>
            )}
          </section>

          {/* Template Gallery */}
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2">
              <LayoutTemplate className="w-4 h-4" /> Template Gallery
            </h2>
            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-3xl p-6 h-[600px] overflow-y-auto custom-scrollbar">
              <div className="flex flex-col gap-4">
                {TEMPLATES.slice(0, 10).map((tpl) => (
                  <div key={tpl.id} onClick={() => startBlank(tpl.id)} className="p-4 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-zinc-500 cursor-pointer group transition-all flex items-center gap-4">
                    <div className="w-12 h-16 bg-zinc-800 rounded shadow-inner flex flex-col pt-2 px-1">
                      {/* Mini visual representation */}
                      <div className="w-full h-1 bg-zinc-700 rounded-full mb-1"></div>
                      <div className="w-2/3 h-1 bg-zinc-700 rounded-full mb-2"></div>
                      <div className="flex-1 border-t border-zinc-700 mt-2"></div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-zinc-200 group-hover:text-white">{tpl.name}</h4>
                      <p className="text-xs text-zinc-500 mt-0.5">{tpl.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
      
      {/* AI Generate Modal */}
      <AnimatePresence>
        {isAICreateOpen && (
          <motion.div 
            key="ai-modal-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
             <motion.div 
               key="ai-modal-content"
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="bg-zinc-900 border border-zinc-700 rounded-3xl p-8 w-full max-w-xl shadow-2xl relative overflow-hidden"
             >
               {/* Background Glow */}
               <div className={`absolute top-0 left-0 w-full h-1/2 opacity-20 blur-3xl pointer-events-none ${aiMode === 'text' ? 'bg-indigo-500' : 'bg-emerald-500'}`}></div>

               <div className="flex items-center justify-between mb-8 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${aiMode === 'text' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                      {aiMode === 'text' ? <Type className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                    </div>
                    <div>
                      <h2 className="font-bold text-2xl text-white">
                        {aiMode === 'text' ? 'Text-to-Invoice' : 'Voice Dictation'}
                      </h2>
                      <p className="text-sm text-zinc-400">{aiMode === 'text' ? 'Describe what to bill' : 'Speak your invoice details aloud'}</p>
                    </div>
                  </div>
                  <button onClick={() => setIsAICreateOpen(false)} className="text-zinc-500 hover:text-white bg-zinc-800 p-2 rounded-full">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
               </div>
               
               <div className="relative z-10">
                 {aiMode === 'text' ? (
                   <textarea 
                     value={prompt} onChange={e => setPrompt(e.target.value)}
                     placeholder="e.g. Build an invoice for Acme Corp for website redesign, 40 hours at $100/hr, add 5% tax."
                     className="w-full bg-zinc-950 border border-zinc-700 rounded-2xl p-5 text-base text-zinc-200 focus:outline-none focus:border-indigo-500 min-h-[160px] resize-none mb-6 shadow-inner"
                   />
                 ) : (
                   <div className="flex flex-col items-center justify-center py-12 mb-6 bg-zinc-950 rounded-2xl border border-zinc-800">
                     <button 
                       onClick={toggleRecording}
                       className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-500/20 text-red-500 scale-110 shadow-[0_0_30px_rgba(239,68,68,0.3)]' : 'bg-zinc-800 text-zinc-400 hover:bg-emerald-500/20 hover:text-emerald-500'}`}
                     >
                       <Mic className={`w-10 h-10 ${isRecording ? 'animate-pulse' : ''}`} />
                     </button>
                     <div className="mt-6 text-center">
                       {isRecording ? <p className="text-red-400 font-medium animate-pulse flex items-center gap-2"><div className="w-2 h-2 bg-red-500 rounded-full"></div> Recording in progress...</p> : audioBlob ? <p className="text-emerald-400 font-medium">Audio recorded. Ready to process.</p> : <p className="text-zinc-500">Tap to start recording</p>}
                     </div>
                   </div>
                 )}
               </div>
               
               <div className="flex justify-end gap-3 relative z-10">
                 <button 
                   disabled={isGenerating || (aiMode === 'text' ? !prompt : !audioBlob)} 
                   onClick={handleCreateAI} 
                   className={`px-6 py-3 rounded-xl text-white font-bold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${aiMode === 'text' ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}
                 >
                   {isGenerating ? <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <Sparkles className="w-5 h-5" />}
                   {isGenerating ? 'Processing...' : 'Generate Invoice'}
                 </button>
               </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
