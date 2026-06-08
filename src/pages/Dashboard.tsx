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
  const wsRef = useRef<WebSocket | null>(null);
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
    navigate(`/editor/${newInvoice.id}`);
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Ensure Opus encoding for optimal Whisper processing
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
        
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      
      // Setup WebSocket
      const { accessToken } = useStore.getState();
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const wsUrl = `${protocol}://${window.location.host}/ws/stt${accessToken ? `?token=${accessToken}` : ''}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.binaryType = 'arraybuffer';

      let sttReady = false;

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          
          if (msg.type === 'stt_ready') {
            if (!sttReady) {
              sttReady = true;
              mediaRecorder.start(250); // 250ms chunks for real-time VAD
              setIsRecording(true);
              setVoiceStage('recording');
            }
          } else if (msg.type === 'partial') {
            setTranscript(msg.text); // Real-time UI feedback
          } else if (msg.type === 'final') {
            setTranscript(msg.text);
            setDetectedLanguage(msg.language || 'en');
            setTranscriptConfidence(msg.confidence || 0);
            setVoiceStage('transcript-review');
          }
        } catch (err) {
          // Ignore non-JSON binary heartbeat frames
        }
      };

      ws.onerror = () => {
        setError('WebSocket connection to STT failed.');
        setVoiceStage('idle');
        setIsRecording(false);
      };

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          event.data.arrayBuffer().then(buf => ws.send(buf));
        }
      };

      mediaRecorder.onstop = () => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ eof: 1 }));
        }
        setVoiceStage('transcribing');
        stream.getTracks().forEach(track => track.stop());
      };

    } catch (err) {
      setError('Microphone access denied or unavailable.');
    }
  };

  const createModes = [
    { id: 'blank', title: 'Start Blank', desc: 'Empty canvas', icon: Plus, color: 'bg-zinc-800 text-white hover:bg-zinc-700', onClick: () => startBlank() },
    { id: 'text', title: 'Text AI', desc: 'Describe to create', icon: Type, color: 'bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 border border-indigo-500/20', onClick: () => { setAiMode('text'); setIsAICreateOpen(true); } },
    { id: 'voice', title: 'Voice AI', desc: 'Speak to create', icon: Mic, color: 'bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/20', onClick: () => { setAiMode('voice'); setIsAICreateOpen(true); } },
    { id: 'ocr', title: 'Import Receipt', desc: 'OCR scan', icon: Upload, color: 'bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 border border-amber-500/20', onClick: () => ocrFileInputRef.current?.click() },
  ];

  return (
    <div className="flex-1 p-8 lg:p-12 overflow-y-auto bg-transparent relative">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12 flex justify-between items-end">
          <div>
            <h1 className="text-5xl font-serif italic mb-2 gold-gradient-text tracking-wide">Workspace</h1>
            <p className="text-[#a09e91] font-serif text-lg italic">Design, automate, and dispatch enterprise billing.</p>
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
                className={`flex items-center gap-4 p-5 transition-all sketched-border bg-[#15171c]/50 border-[#bf953f]/20 hover:border-[#bf953f]/50 hover:shadow-[0_0_15px_rgba(191,149,63,0.1)] group`}
              >
                <div className="w-12 h-12 bg-gradient-to-br from-[#bf953f]/20 to-[#aa771c]/5 rounded-xl border border-[#bf953f]/30 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0 text-[#bf953f]">
                  <mode.icon className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <h3 className="font-serif italic font-bold text-[#fcf6ba] text-sm">{mode.title}</h3>
                  <p className="text-[11px] font-serif italic text-[#a09e91] mt-0.5">{mode.desc}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </section>

        {/* Recent & Templates */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
          {/* Projects Pipeline */}
          <section className="xl:col-span-2">
            <h2 className="text-xs font-serif font-bold uppercase tracking-widest text-[#a09e91] mb-6 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#bf953f]" /> Active Documents
            </h2>

            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#bf953f]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search invoices..."
                  className="w-full bg-[#15171c]/50 sketched-border pl-10 pr-4 py-2.5 text-sm text-[#fcf6ba] focus:outline-none focus:ring-1 focus:ring-[#bf953f] placeholder-[#bf953f]/50 transition-all font-serif italic"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-[#15171c]/50 sketched-border px-4 py-2.5 text-sm text-[#fcf6ba] focus:outline-none focus:ring-1 focus:ring-[#bf953f] font-serif italic"
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
                className="bg-[#15171c]/50 sketched-border px-4 py-2.5 text-sm text-[#fcf6ba] focus:outline-none focus:ring-1 focus:ring-[#bf953f] font-serif italic"
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
              <div className="text-center py-20 bg-[#15171c]/40 sketched-border border-[#bf953f]/30 border-dashed">
                <FileText className="w-16 h-16 text-[#bf953f]/20 mx-auto mb-4" />
                <p className="text-[#fcf6ba] font-serif italic font-bold text-lg">No documents found</p>
                <p className="text-[#a09e91] font-serif italic text-sm mt-2">Adjust your filters or start a new document above</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredInvoices.map(invoice => (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    key={invoice.id} onClick={() => navigate(`/editor/${invoice.id}`)} 
                    className="bg-[#15171c]/50 sketched-border border-[#bf953f]/30 p-6 hover:border-[#bf953f] hover:shadow-[0_0_15px_rgba(191,149,63,0.1)] cursor-pointer transition-all group"
                  >
                     <div className="flex justify-between items-start mb-6">
                       <div>
                         <span className="bg-[#bf953f]/10 border border-[#bf953f]/30 text-[#bf953f] text-[10px] font-serif font-bold italic px-2 py-1 inline-block uppercase tracking-widest mb-3">{invoice.status}</span>
                         <h3 className="font-serif font-bold italic text-lg text-[#fcf6ba] group-hover:text-[#bf953f] transition-colors">{invoice.title || 'Untitled'}</h3>
                         <p className="text-xs text-[#a09e91] font-serif italic mt-1 uppercase tracking-widest">#: {invoice.invoiceNumber}</p>
                       </div>
                       <div className="w-12 h-12 rounded-full border border-[#bf953f]/30 bg-gradient-to-br from-[#1a1a1a] to-[#0f1115] flex items-center justify-center font-serif font-black italic text-lg text-[#bf953f] shadow-inner">
                         {invoice.customerInfo.name ? invoice.customerInfo.name.charAt(0).toUpperCase() : '?'}
                       </div>
                     </div>
                     <div className="flex justify-between items-end pt-4 border-t border-[#bf953f]/10">
                        <div>
                          <p className="text-[10px] font-serif font-bold italic uppercase tracking-widest text-[#a09e91] mb-1">Value</p>
                          <p className="font-serif italic font-bold text-lg text-[#fcf6ba]">{formatCurrency(computeInvoiceTotals(invoice).grandTotal, invoice.currency)}</p>
                        </div>
                        <div className="text-right text-xs font-serif italic text-[#a09e91] flex items-center gap-1.5 uppercase tracking-widest">
                          <CalendarDays className="w-3.5 h-3.5 text-[#bf953f]"/> 
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
            <h2 className="text-xs font-serif font-bold uppercase tracking-widest text-[#a09e91] mb-6 flex items-center gap-2">
              <LayoutTemplate className="w-4 h-4 text-[#bf953f]" /> Template Gallery
            </h2>
            <div className="bg-[#15171c]/30 sketched-border border-[#bf953f]/30 p-6 h-[600px] overflow-y-auto custom-scrollbar">
              <div className="flex flex-col gap-4">
                {TEMPLATES.slice(0, 10).map((tpl) => (
                  <div key={tpl.id} onClick={() => startBlank(tpl.id)} className="p-4 sketched-border border-[#bf953f]/20 bg-[#15171c]/50 hover:border-[#bf953f] hover:shadow-[0_0_15px_rgba(191,149,63,0.15)] cursor-pointer group transition-all flex items-center gap-4">
                    {/* B-09: Themed mini preview with accent color */}
                    <div className="w-12 h-16 shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden border border-[#bf953f]/30 flex-shrink-0" style={{ backgroundColor: '#fcf6ba' }}>
                      <div className="h-3 w-full" style={{ backgroundColor: tpl.defaultColor || '#aa771c' }} />
                      <div className="flex-1 p-1 flex flex-col gap-0.5 justify-center opacity-60 mix-blend-multiply">
                        <div className="w-full h-[2px]" style={{ backgroundColor: tpl.defaultColor || '#aa771c', opacity: 0.8 }} />
                        <div className="w-2/3 h-[2px] bg-black/40" />
                        <div className="w-1/2 h-[2px] bg-black/20 mt-1" />
                        <div className="w-3/4 h-[2px] bg-black/20" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-serif italic font-bold text-sm text-[#fcf6ba] group-hover:text-[#bf953f] truncate">{tpl.name}</h4>
                      <p className="text-[11px] font-serif italic text-[#a09e91] mt-0.5 line-clamp-2">{tpl.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-2.5 h-2.5 rounded-full border border-[#bf953f]/30" style={{ backgroundColor: tpl.defaultColor || '#aa771c' }} />
                        <span className="text-[9px] text-[#bf953f] uppercase tracking-widest font-serif italic font-bold">{tpl.category || 'Business'}</span>
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
            className="fixed inset-0 bg-[#0f1115]/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && setIsAICreateOpen(false)}
          >
             <motion.div 
               key="ai-modal-content"
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="bg-[#15171c] sketched-border border-[#bf953f]/30 p-8 w-full max-w-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden historical-shadow"
             >
               {/* Background Glow */}
               <div className={`absolute top-0 left-0 w-full h-1/2 opacity-20 blur-3xl pointer-events-none ${aiMode === 'text' ? 'bg-[#bf953f]' : 'bg-[#aa771c]'}`}></div>

               <div className="flex items-center justify-between mb-8 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-[#bf953f] to-[#aa771c] text-[#0f1115] shadow-inner sketched-border border-[#bf953f]">
                      {aiMode === 'text' ? <Type className="w-6 h-6" /> : aiMode === 'voice' ? <Mic className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
                    </div>
                    <div>
                      <h2 className="font-serif italic font-bold text-2xl text-[#fcf6ba] gold-gradient-text">
                        {aiMode === 'text' ? 'Text-to-Invoice' : aiMode === 'voice' ? 'Voice Dictation' : 'OCR Extraction'}
                      </h2>
                      <h3 className="text-[#a09e91] font-serif italic text-sm">{aiMode === 'text' ? 'Describe Invoice' : aiMode === 'voice' ? 'Voice Generation' : 'OCR Extraction'}</h3>
                    </div>
                  </div>
                  <button onClick={() => { setIsAICreateOpen(false); setVoiceStage('idle'); setError(''); }} className="text-[#bf953f]/50 hover:text-[#bf953f] bg-[#1a1a1a] p-2 transition-colors sketched-border">
                    <X className="w-5 h-5" />
                  </button>
               </div>
               
               <div className="relative z-10">
                 {aiMode === 'ocr' ? (
                   <div className="flex flex-col items-center justify-center py-12 text-center">
                     {streamingStage === 'parsing' ? (
                       <>
                         <Loader2 className="w-12 h-12 text-[#bf953f] animate-spin mb-4" />
                         <p className="text-[#fcf6ba] font-serif italic font-bold">Extracting text via OCR...</p>
                         <p className="text-[#a09e91] font-serif italic text-sm mt-2">This may take a moment depending on image quality.</p>
                       </>
                     ) : streamingStage === 'generating' ? (
                       <>
                         <div className="relative mb-4">
                           <div className="w-12 h-12 bg-[#bf953f]/20 flex items-center justify-center animate-pulse sketched-border border-[#bf953f]">
                             <Type className="w-6 h-6 text-[#bf953f]" />
                           </div>
                         </div>
                         <p className="text-[#fcf6ba] font-serif italic font-bold">Structuring invoice data...</p>
                       </>
                     ) : null}
                   </div>
                 ) : aiMode === 'text' ? (
                   <textarea 
                     value={prompt} onChange={e => setPrompt(e.target.value)}
                     placeholder="e.g. Build an invoice for Acme Corp for website redesign, 40 hours at $100/hr, add 5% tax."
                     className="w-full bg-[#1a1a1a] sketched-border border-[#bf953f]/30 p-5 text-base text-[#fcf6ba] font-serif italic focus:outline-none focus:border-[#bf953f] min-h-[160px] resize-none mb-4 shadow-[inset_0_0_15px_rgba(0,0,0,0.5)] placeholder:text-[#a09e91]/50"
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
                       <div className="flex flex-col items-center justify-center py-12 bg-[#1a1a1a] sketched-border border-[#bf953f]/30 shadow-inner">
                         <button 
                           onClick={toggleRecording}
                           disabled={voiceStage === 'transcribing'}
                           className={`w-24 h-24 flex items-center justify-center transition-all disabled:opacity-50 sketched-border ${isRecording ? 'bg-red-950/40 text-red-500 scale-110 shadow-[0_0_30px_rgba(239,68,68,0.2)] border-red-500/50' : 'bg-[#15171c] text-[#bf953f]/50 hover:bg-[#bf953f]/10 hover:text-[#bf953f] border-[#bf953f]/20 hover:border-[#bf953f]/50'}`}
                         >
                           <Mic className={`w-10 h-10 ${isRecording ? 'animate-pulse' : ''}`} />
                         </button>
                         <div className="mt-6 text-center font-serif italic">
                           {voiceStage === 'transcribing' ? (
                             <p className="text-[#bf953f] font-bold flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Transcribing with Whisper...</p>
                           ) : isRecording ? (
                             <p className="text-red-400 font-bold animate-pulse flex items-center gap-2"><span className="w-2 h-2 bg-red-500"></span> Recording in progress...</p>
                           ) : (
                             <p className="text-[#a09e91]">Tap to start recording</p>
                           )}
                         </div>
                       </div>
                     )}
                   </div>
                 )}

                 {/* B-01: Streaming stage indicator */}
                 {streamingStage !== 'idle' && (
                   <div className="mb-4 p-4 sketched-border border-[#bf953f]/30 bg-[#bf953f]/10 flex items-center gap-3">
                     <Loader2 className="w-5 h-5 text-[#bf953f] animate-spin" />
                     <span className="text-sm font-serif italic font-bold text-[#fcf6ba]">
                       {streamingStage === 'generating' ? 'AI is composing your invoice...' : 'Analyzing the context...'}
                     </span>
                   </div>
                 )}

                 {/* Error display */}
                 {error && (
                   <div className="mb-4 p-4 sketched-border border-red-900/50 bg-red-950/20 text-red-400 text-sm font-serif italic">
                     {error}
                   </div>
                 )}
               </div>
               
               {/* Actions — only show when not in transcript review mode */}
               {(voiceStage !== 'transcript-review' && aiMode !== 'voice') && (
                 <div className="flex justify-end gap-3 relative z-10">
                   <button 
                     disabled={isGenerating || (aiMode === 'text' ? !prompt : false)} 
                     onClick={handleCreateAI} 
                     className={`px-8 py-3 text-[#0f1115] font-serif font-black italic tracking-wider flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-[#bf953f] to-[#aa771c] hover:from-[#fcf6ba] hover:to-[#bf953f] shadow-[0_0_20px_rgba(191,149,63,0.3)]`}
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
