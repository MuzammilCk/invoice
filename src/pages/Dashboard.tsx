import React, { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Sparkles, LayoutTemplate, MoreVertical, FileText, CalendarDays, Mic, Type, Search, Upload, X, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatDate, formatCurrency, generateId } from '../lib/utils';
import { computeInvoiceTotals } from '../lib/calculations';
import { TEMPLATES } from '../lib/templates';
import { motion, AnimatePresence } from 'motion/react';
import { z } from 'zod';
import { TranscriptReviewPanel } from '../components/TranscriptReviewPanel';
import { AIResponseSchema, validateAIResponse } from '../lib/ai-schemas';
import { apiClient } from '../lib/apiClient';

export function Dashboard() {
  const navigate = useNavigate();
  const { invoices, businessInfo, addInvoice } = useStore();
  const [isAICreateOpen, setIsAICreateOpen] = useState(false);
  const [aiMode, setAiMode] = useState<'text' | 'voice' | 'ocr'>('text');
  const [isRecording, setIsRecording] = useState(false);
  const ocrFileInputRef = React.useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingStage, setStreamingStage] = useState<'idle' | 'generating' | 'parsing'>('idle');
  const [error, setError] = useState('');

  // B-06: Voice transcript review state
  const [transcript, setTranscript] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState('');
  const [transcriptConfidence, setTranscriptConfidence] = useState(0);
  const [voiceStage, setVoiceStage] = useState<'idle' | 'recording' | 'transcribing' | 'transcript-review'>('idle');

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'name'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filtered and sorted invoices
  const filteredInvoices = useMemo(() => {
    let result = [...invoices];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(inv =>
        inv.invoiceNumber.toLowerCase().includes(q) ||
        (inv.customerInfo?.name || '').toLowerCase().includes(q) ||
        (inv.customerInfo?.email || '').toLowerCase().includes(q) ||
        (inv.title || '').toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(inv => inv.status === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime();
          break;
        case 'amount':
          comparison = computeInvoiceTotals(a).grandTotal - computeInvoiceTotals(b).grandTotal;
          break;
        case 'name':
          comparison = (a.customerInfo?.name || '').localeCompare(b.customerInfo?.name || '');
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return result;
  }, [invoices, searchQuery, statusFilter, sortBy, sortOrder]);

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

  const handleOCRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsGenerating(true);
    setError('');
    setStreamingStage('parsing');
    setAiMode('ocr');
    setIsAICreateOpen(true);

    try {
      const formData = new FormData();
      formData.append('receipt', file);

      // 1. Extract text via OCR
      const ocrRes = await apiClient('/api/v1/ocr-receipt', { method: 'POST', body: formData });
      if (!ocrRes.ok) throw new Error('OCR scanning failed');
      const { text } = await ocrRes.json();

      if (!text || text.trim() === '') {
        throw new Error('No text found in receipt');
      }

      // 2. Pass extracted text to standard generation stream
      setStreamingStage('generating');
      const res = await apiClient('/api/v1/generate-invoice-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `Extract an invoice from the following OCR text:\n\n${text}` }),
      });
      if (!res.ok) throw new Error('Invoice generation failed');

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('No response stream');

      let generatedData = null;
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.stage) setStreamingStage(data.stage === 'parsing' ? 'parsing' : 'generating');
              if (data.error) throw new Error(data.error);
              if (data.customerInfo || data.items) generatedData = data;
            } catch (e: any) {
              if (e.message && e.message !== 'Unexpected end of JSON input') throw e;
            }
          }
        }
      }

      if (generatedData) {
        const validData = validateAIResponse(generatedData);
        if (!validData) throw new Error('AI returned invalid data');
        createInvoiceFromAIData(validData);
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'OCR extraction failed');
    } finally {
      setIsGenerating(false);
      setStreamingStage('idle');
      if (ocrFileInputRef.current) ocrFileInputRef.current.value = '';
    }
  };

  // B-01: SSE streaming AI generation for text mode
  const handleCreateAI = async () => {
    setIsGenerating(true);
    setError('');
    try {
      let generatedData = null;

      if (aiMode === 'text' && prompt) {
        // B-01: Use SSE streaming endpoint for real-time feedback
        setStreamingStage('generating');
        const res = await apiClient('/api/v1/generate-invoice-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        });
        if (!res.ok) throw new Error('Text generation failed');

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) throw new Error('No response stream');

        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.stage) setStreamingStage(data.stage === 'parsing' ? 'parsing' : 'generating');
                if (data.error) throw new Error(data.error);
                if (data.customerInfo || data.items) {
                  generatedData = data;
                }
              } catch (e: any) {
                if (e.message && e.message !== 'Unexpected end of JSON input') throw e;
              }
            }
          }
        }
        setStreamingStage('idle');

      } else if (aiMode === 'voice' && audioBlob) {
        // B-10: Voice mode — just start transcription (review handled separately)
        setVoiceStage('transcribing');
        const formData = new FormData();
        formData.append('audio', audioBlob, 'voice.webm');
        const res = await apiClient('/api/v1/transcribe-audio', { method: 'POST', body: formData });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: 'Transcription failed' }));
          throw new Error(errData.error || 'Transcription failed');
        }
        const { transcript: sttTranscript, language, confidence } = await res.json();
        setTranscript(sttTranscript);
        setDetectedLanguage(language);
        setTranscriptConfidence(confidence);
        setVoiceStage('transcript-review');
        setIsGenerating(false);
        return; // Wait for user to review transcript before generating
      }

      if (generatedData) {
        const validData = validateAIResponse(generatedData);
        if (!validData) throw new Error('AI returned invalid data');
        createInvoiceFromAIData(validData);
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Generation failed');
    } finally {
      setIsGenerating(false);
      setStreamingStage('idle');
    }
  };

  // B-10: Handle transcript proceed (voice Stage 2 — generate from reviewed transcript)
  const handleTranscriptProceed = async () => {
    if (!transcript.trim()) return;
    setIsGenerating(true);
    setVoiceStage('idle');
    setStreamingStage('generating');
    setError('');

    try {
      const res = await apiClient('/api/v1/text-to-invoice-from-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      });
      if (!res.ok) throw new Error('Failed to generate from transcript');

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('No response stream');

      let generatedData = null;
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.stage) setStreamingStage(data.stage === 'parsing' ? 'parsing' : 'generating');
              if (data.error) throw new Error(data.error);
              if (data.customerInfo || data.items) generatedData = data;
            } catch (e: any) {
              if (e.message && e.message !== 'Unexpected end of JSON input') throw e;
            }
          }
        }
      }

      if (generatedData) {
        const validData = validateAIResponse(generatedData);
        if (!validData) throw new Error('AI returned invalid data');
        createInvoiceFromAIData(validData);
      }
    } catch (e: any) {
      setError(e.message || 'Voice generation failed');
    } finally {
      setIsGenerating(false);
      setStreamingStage('idle');
    }
  };

  // Shared helper: create invoice from validated AI data
  const createInvoiceFromAIData = (validData: any) => {
    const newInvoice = {
      id: generateId(),
      invoiceNumber: `INV-${Date.now().toString(36).toUpperCase()}`,
      title: validData.title || 'Generated Invoice',
      status: 'draft' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      issueDate: new Date().toISOString(),
      dueDate: validData.dueDate || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      businessInfo,
      customerInfo: validData.customerInfo ? {
        name: validData.customerInfo.name || '',
        email: validData.customerInfo.email || '',
        address: validData.customerInfo.address || '',
      } : { name: '', email: '', address: '' },
      items: validData.items?.length ? validData.items.map((i: any) => ({ ...i, id: generateId() })) : [{ id: generateId(), description: '', quantity: 1, rate: 0 }],
      taxRate: validData.taxRate || 0,
      notes: validData.notes || '',
      templateId: validData.suggestedTemplateId || validData.templateId || 'minimal-executive',
      themeColor: validData.themeColor || '#4f46e5',
      currency: validData.currency || 'USD',
      discountRate: validData.discountRate || 0,
      shipping: validData.shipping || 0,
      displaySettings: {
        showTitle: true, showInvoiceId: true,
        showLogo: true, showFrom: true, showBilledTo: true,
        showIssueDate: true, showDueDate: true, showDiscount: true,
        showTax: true, showShipping: true, showNotes: true, showPaymentMethods: true
      }
    };
    addInvoice(newInvoice);
    setIsAICreateOpen(false);
    setPrompt('');
    setTranscript('');
    setAudioBlob(null);
    navigate(`/editor/${newInvoice.id}`);
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
    { id: 'blank', title: 'Start Blank', desc: 'Empty canvas', icon: Plus, color: 'bg-zinc-800 text-white hover:bg-zinc-700', onClick: () => startBlank() },
    { id: 'text', title: 'Text AI', desc: 'Describe to create', icon: Type, color: 'bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 border border-indigo-500/20', onClick: () => { setAiMode('text'); setIsAICreateOpen(true); } },
    { id: 'voice', title: 'Voice AI', desc: 'Speak to create', icon: Mic, color: 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/20', onClick: () => { setAiMode('voice'); setIsAICreateOpen(true); } },
    { id: 'ocr', title: 'Import Receipt', desc: 'OCR scan', icon: Upload, color: 'bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 border border-amber-500/20', onClick: () => ocrFileInputRef.current?.click() },
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
        <section className="mb-12">
          <input type="file" accept="image/*" className="hidden" ref={ocrFileInputRef} onChange={handleOCRUpload} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {createModes.map((mode, i) => (
              <motion.button 
                key={mode.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={mode.onClick}
                className={`flex items-center gap-3 p-5 rounded-2xl transition-all ${mode.color} group`}
              >
                <div className="w-10 h-10 bg-black/20 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0">
                  <mode.icon className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-sm">{mode.title}</h3>
                  <p className="text-[10px] opacity-60 mt-0.5">{mode.desc}</p>
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

            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search invoices..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-zinc-600"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>

              {/* Sort */}
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={e => {
                  const [by, order] = e.target.value.split('-');
                  setSortBy(by as any);
                  setSortOrder(order as any);
                }}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="amount-desc">Highest Amount</option>
                <option value="amount-asc">Lowest Amount</option>
                <option value="name-asc">Client A→Z</option>
                <option value="name-desc">Client Z→A</option>
              </select>
            </div>
            
            {filteredInvoices.length === 0 ? (
              <div className="text-center py-20 bg-zinc-900/40 rounded-3xl border border-zinc-800/50 border-dashed">
                <FileText className="w-16 h-16 text-zinc-800 mx-auto mb-4" />
                <p className="text-zinc-300 font-medium text-lg">No documents found</p>
                <p className="text-zinc-500 text-sm mt-2">Adjust your filters or start a new document above</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredInvoices.map(invoice => (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    key={invoice.id} onClick={() => navigate(`/editor/${invoice.id}`)} 
                    className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 hover:shadow-xl hover:shadow-black/50 cursor-pointer transition-all group"
                  >
                     <div className="flex justify-between items-start mb-6">
                       <div>
                         <span className="bg-zinc-800 text-zinc-300 text-[10px] font-bold px-2 py-1 rounded inline-block uppercase tracking-wider mb-3">{invoice.status}</span>
                         <h3 className="font-medium text-lg text-zinc-100 group-hover:text-indigo-400 transition-colors">{invoice.title || 'Untitled'}</h3>
                         <p className="text-xs text-zinc-500 font-mono mt-1">#: {invoice.invoiceNumber}</p>
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

          {/* B-09: Template Gallery — Real Previews */}
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2">
              <LayoutTemplate className="w-4 h-4" /> Template Gallery
            </h2>
            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-3xl p-6 h-[600px] overflow-y-auto custom-scrollbar">
              <div className="flex flex-col gap-4">
                {TEMPLATES.slice(0, 10).map((tpl) => (
                  <div key={tpl.id} onClick={() => startBlank(tpl.id)} className="p-4 rounded-xl border border-zinc-800 bg-zinc-900 hover:border-zinc-600 cursor-pointer group transition-all flex items-center gap-4 hover:shadow-lg hover:shadow-black/30">
                    {/* B-09: Themed mini preview with accent color */}
                    <div className="w-12 h-16 rounded-lg shadow-inner flex flex-col overflow-hidden border border-zinc-700/50 flex-shrink-0" style={{ backgroundColor: '#1a1a2e' }}>
                      <div className="h-3 w-full" style={{ backgroundColor: tpl.defaultColor || '#4f46e5' }} />
                      <div className="flex-1 p-1 flex flex-col gap-0.5 justify-center">
                        <div className="w-full h-[2px] rounded-full" style={{ backgroundColor: tpl.defaultColor || '#4f46e5', opacity: 0.5 }} />
                        <div className="w-2/3 h-[2px] bg-zinc-600 rounded-full" />
                        <div className="w-1/2 h-[2px] bg-zinc-700 rounded-full mt-1" />
                        <div className="w-3/4 h-[2px] bg-zinc-700 rounded-full" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-zinc-200 group-hover:text-white truncate">{tpl.name}</h4>
                      <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-2">{tpl.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-3 h-3 rounded-full border border-zinc-700" style={{ backgroundColor: tpl.defaultColor || '#4f46e5' }} />
                        <span className="text-[9px] text-zinc-600 uppercase tracking-wider font-medium">{tpl.category || 'Business'}</span>
                      </div>
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
            onClick={(e) => e.target === e.currentTarget && setIsAICreateOpen(false)}
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
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${aiMode === 'text' ? 'bg-indigo-500/20 text-indigo-400' : aiMode === 'voice' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                      {aiMode === 'text' ? <Type className="w-6 h-6" /> : aiMode === 'voice' ? <Mic className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
                    </div>
                    <div>
                      <h2 className="font-bold text-2xl text-white">
                        {aiMode === 'text' ? 'Text-to-Invoice' : aiMode === 'voice' ? 'Voice Dictation' : 'OCR Extraction'}
                      </h2>
                      <h3 className="text-zinc-100 font-semibold">{aiMode === 'text' ? 'Describe Invoice' : aiMode === 'voice' ? 'Voice Generation' : 'OCR Extraction'}</h3>
                    </div>
                  </div>
                  <button onClick={() => { setIsAICreateOpen(false); setVoiceStage('idle'); setError(''); }} className="text-zinc-500 hover:text-white bg-zinc-800 p-2 rounded-full">
                    <X className="w-5 h-5" />
                  </button>
               </div>
               
               <div className="relative z-10">
                 {aiMode === 'ocr' ? (
                   <div className="flex flex-col items-center justify-center py-12 text-center">
                     {streamingStage === 'parsing' ? (
                       <>
                         <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
                         <p className="text-zinc-300 font-medium">Extracting text via OCR...</p>
                         <p className="text-zinc-500 text-sm mt-2">This may take a moment depending on image quality.</p>
                       </>
                     ) : streamingStage === 'generating' ? (
                       <>
                         <div className="relative mb-4">
                           <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center animate-pulse">
                             <Type className="w-6 h-6 text-indigo-400" />
                           </div>
                         </div>
                         <p className="text-zinc-300 font-medium">Structuring invoice data...</p>
                       </>
                     ) : null}
                   </div>
                 ) : aiMode === 'text' ? (
                   <textarea 
                     value={prompt} onChange={e => setPrompt(e.target.value)}
                     placeholder="e.g. Build an invoice for Acme Corp for website redesign, 40 hours at $100/hr, add 5% tax."
                     className="w-full bg-zinc-950 border border-zinc-700 rounded-2xl p-5 text-base text-zinc-200 focus:outline-none focus:border-indigo-500 min-h-[160px] resize-none mb-4 shadow-inner"
                   />
                 ) : (
                   <div className="mb-4">
                     {voiceStage === 'transcript-review' ? (
                       <TranscriptReviewPanel
                         transcript={transcript}
                         language={detectedLanguage}
                         confidence={transcriptConfidence}
                         onTranscriptChange={setTranscript}
                         onProceed={handleTranscriptProceed}
                         onCancel={() => { setVoiceStage('idle'); setTranscript(''); }}
                       />
                     ) : (
                       <div className="flex flex-col items-center justify-center py-12 bg-zinc-950 rounded-2xl border border-zinc-800">
                         <button 
                           onClick={toggleRecording}
                           disabled={voiceStage === 'transcribing'}
                           className={`w-24 h-24 rounded-full flex items-center justify-center transition-all disabled:opacity-50 ${isRecording ? 'bg-red-500/20 text-red-500 scale-110 shadow-[0_0_30px_rgba(239,68,68,0.3)]' : 'bg-zinc-800 text-zinc-400 hover:bg-emerald-500/20 hover:text-emerald-500'}`}
                         >
                           <Mic className={`w-10 h-10 ${isRecording ? 'animate-pulse' : ''}`} />
                         </button>
                         <div className="mt-6 text-center">
                           {voiceStage === 'transcribing' ? (
                             <p className="text-indigo-400 font-medium flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Transcribing with Whisper...</p>
                           ) : isRecording ? (
                             <p className="text-red-400 font-medium animate-pulse flex items-center gap-2"><span className="w-2 h-2 bg-red-500 rounded-full"></span> Recording in progress...</p>
                           ) : audioBlob ? (
                             <p className="text-emerald-400 font-medium">Audio recorded. Ready to process.</p>
                           ) : (
                             <p className="text-zinc-500">Tap to start recording</p>
                           )}
                         </div>
                       </div>
                     )}
                   </div>
                 )}

                 {/* B-01: Streaming stage indicator */}
                 {streamingStage !== 'idle' && (
                   <div className="mb-4 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-2">
                     <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                     <span className="text-xs text-indigo-300 font-medium">
                       {streamingStage === 'generating' ? 'AI is generating your invoice...' : 'Parsing response...'}
                     </span>
                   </div>
                 )}

                 {/* Error display */}
                 {error && (
                   <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                     {error}
                   </div>
                 )}
               </div>
               
               {/* Actions — only show when not in transcript review mode */}
               {voiceStage !== 'transcript-review' && (
                 <div className="flex justify-end gap-3 relative z-10">
                   <button 
                     disabled={isGenerating || (aiMode === 'text' ? !prompt : !audioBlob)} 
                     onClick={handleCreateAI} 
                     className={`px-6 py-3 rounded-xl text-white font-bold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${aiMode === 'text' ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}
                   >
                     {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                     {isGenerating ? 'Processing...' : 'Generate Invoice'}
                   </button>
                 </div>
               )}
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
