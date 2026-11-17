import React, { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Sparkles, FileText, CalendarDays, Mic, Type, Search, X, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatDate, formatCurrency, generateId } from '../lib/utils';
import { computeInvoiceTotals } from '../lib/calculations';
import { motion, AnimatePresence } from 'motion/react';
import { TranscriptReviewPanel } from '../components/TranscriptReviewPanel';
import { validateAIResponse } from '../lib/ai-schemas';
import { startStreamPCM } from '../lib/audio/streamPCM';
import { Invoice } from '../types';

type RecordingState = 'idle' | 'recording' | 'processing' | 'complete';

export function Dashboard() {
  const navigate = useNavigate();
  const { invoices, businessInfo, addInvoice } = useStore();
  const [isAICreateOpen, setIsAICreateOpen] = useState(false);
  const [aiMode, setAiMode] = useState<'text' | 'voice'>('voice');
  const stopStreamRef = useRef<(() => void) | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingStage, setStreamingStage] = useState<'idle' | 'generating' | 'parsing'>('idle');
  const [error, setError] = useState('');

  // Voice transcript review state
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [transcript, setTranscript] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState('');
  const [transcriptConfidence, setTranscriptConfidence] = useState(0);
  const [voiceStage, setVoiceStage] = useState<'idle' | 'recording' | 'transcribing' | 'transcript-review'>('idle');

  React.useEffect(() => {
    if (recordingState !== 'processing') return;
    const timeout = setTimeout(() => {
      setRecordingState('idle');
      setVoiceStage('idle');
      setError('Transcription timed out. Please try again.');
    }, 30_000);
    return () => clearTimeout(timeout);
  }, [recordingState]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'name'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filtered and sorted invoices
  const filteredInvoices = useMemo(() => {
    let result = [...invoices];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(inv =>
        inv.invoiceNumber.toLowerCase().includes(q) ||
        (inv.customerInfo?.name || '').toLowerCase().includes(q) ||
        (inv.title || '').toLowerCase().includes(q)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter(inv => inv.status === statusFilter);
    }

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

  const startBlank = () => {
    const newInvoice: Invoice = {
      id: generateId(),
      invoiceNumber: `INV-${Date.now().toString(36).toUpperCase()}`,
      title: 'New Invoice',
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      issueDate: new Date().toISOString(),
      businessInfo,
      customerInfo: { name: '', address: '' },
      items: [{ id: generateId(), description: '', rate: 0 }],
      notes: '',
      currency: 'INR',
    };
    addInvoice(newInvoice);
    navigate(`/editor/${newInvoice.id}`);
  };

  const handleCreateAI = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError('');
    try {
      setStreamingStage('generating');
      const res = await fetch('/api/v1/text-to-invoice-from-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: prompt }),
      });
      if (!res.ok) throw new Error('Generation failed');

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
              if (data.recipient || data.items) {
                generatedData = data;
              }
            } catch (e: any) {
              if (e.message && e.message !== 'Unexpected end of JSON input') throw e;
            }
          }
        }
      }
      setStreamingStage('idle');

      if (generatedData) {
        const validData = validateAIResponse(generatedData);
        if (!validData) throw new Error('AI returned invalid data');
        createInvoiceFromAIData(validData);
      }
    } catch (e: any) {
      setError(e.message || 'Generation failed');
    } finally {
      setIsGenerating(false);
      setStreamingStage('idle');
    }
  };

  const handleTranscriptProceed = async () => {
    if (!transcript.trim()) return;
    setIsGenerating(true);
    setVoiceStage('idle');
    setStreamingStage('generating');
    setError('');

    try {
      const res = await fetch('/api/v1/text-to-invoice-from-transcript', {
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
              if (data.recipient || data.items) generatedData = data;
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

  const createInvoiceFromAIData = (validData: any) => {
    const newInvoice: Invoice = {
      id: generateId(),
      invoiceNumber: `INV-${Date.now().toString(36).toUpperCase()}`,
      title: 'Invoice',
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      issueDate: validData.date ? new Date(validData.date).toISOString() : new Date().toISOString(),
      businessInfo,
      customerInfo: validData.recipient ? {
        name: validData.recipient.name || '',
        address: validData.recipient.address || '',
      } : { name: '', address: '' },
      items: validData.items?.length
        ? validData.items.map((i: any) => ({ id: generateId(), description: i.description, rate: i.price }))
        : [{ id: generateId(), description: '', rate: 0 }],
      notes: validData.notes || '',
      currency: 'INR',
    };
    addInvoice(newInvoice);
    setIsAICreateOpen(false);
    setPrompt('');
    setTranscript('');
    navigate(`/editor/${newInvoice.id}`);
  };

  const toggleRecording = async () => {
    if (recordingState === 'recording') {
      stopStreamRef.current?.();
      stopStreamRef.current = null;
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close(1000, 'Recording stopped');
      }
      setRecordingState('processing');
      setVoiceStage('transcribing');
      return;
    }

    try {
      setRecordingState('recording');
      setVoiceStage('recording');
      setTranscript('');
      setDetectedLanguage('');
      setError('');

      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const wsUrl = `${protocol}://${window.location.host}/ws/stt`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.binaryType = 'arraybuffer';

      ws.onopen = async () => {
        stopStreamRef.current = await startStreamPCM(ws, () => {}, (err) => {
          setRecordingState('idle');
          setVoiceStage('idle');
          setError('Microphone access failed: ' + err.message);
        }) || null;
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'stt_ready') return;
          if (msg.type === 'partial') {
            setTranscript(msg.text);
          } else if (msg.type === 'final') {
            setTranscript(msg.text);
            setDetectedLanguage(msg.language || 'en');
            setTranscriptConfidence(msg.confidence || 0);
            setRecordingState('complete');
            setVoiceStage('transcript-review');
          } else if (msg.type === 'error') {
            setError(msg.message || 'Transcription failed');
            setRecordingState('idle');
            setVoiceStage('idle');
          }
        } catch (err) {}
      };

      ws.onerror = () => {
        setError('WebSocket connection to STT failed.');
        setRecordingState('idle');
        setVoiceStage('idle');
      };
    } catch (err) {
      setError('Microphone access denied or unavailable.');
      setRecordingState('idle');
      setVoiceStage('idle');
    }
  };

  const createModes = [
    { id: 'voice', title: 'Voice Create', desc: 'Speak invoice details', icon: Mic, onClick: () => { setAiMode('voice'); setIsAICreateOpen(true); } },
    { id: 'blank', title: 'Start Blank', desc: 'Empty canvas', icon: Plus, onClick: () => startBlank() },
    { id: 'text', title: 'Text Input', desc: 'Type invoice details', icon: Type, onClick: () => { setAiMode('text'); setIsAICreateOpen(true); } },
  ];

  return (
    <div className="flex-1 p-8 lg:p-12 overflow-y-auto bg-transparent relative">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12 flex justify-between items-end">
          <div>
            <h1 className="text-5xl font-serif italic mb-2 gold-gradient-text tracking-wide">Voice-to-Invoice</h1>
            <p className="text-[#a09e91] font-serif text-lg italic">Speak recipient and items to create invoices instantly.</p>
          </div>
        </header>

        {/* Creation Hub */}
        <section className="mb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {createModes.map((mode, i) => (
              <motion.button
                key={mode.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                onClick={mode.onClick}
                className="flex items-center gap-4 p-5 transition-all sketched-border bg-[#15171c]/50 border-[#bf953f]/20 hover:border-[#bf953f]/50 hover:shadow-[0_0_15px_rgba(191,149,63,0.1)] group text-left"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-[#bf953f]/20 to-[#aa771c]/5 rounded-xl border border-[#bf953f]/30 flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0 text-[#bf953f]">
                  <mode.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif italic font-bold text-[#fcf6ba] text-sm">{mode.title}</h3>
                  <p className="text-[11px] font-serif italic text-[#a09e91] mt-0.5">{mode.desc}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </section>

        {/* Invoices list */}
        <section>
          <h2 className="text-xs font-serif font-bold uppercase tracking-widest text-[#a09e91] mb-6 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#bf953f]" /> Invoices
          </h2>

          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#bf953f]" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by client or invoice number..."
                className="w-full bg-[#15171c]/50 sketched-border pl-10 pr-4 py-2.5 text-sm text-[#fcf6ba] focus:outline-none focus:ring-1 focus:ring-[#bf953f] placeholder-[#bf953f]/50 transition-all font-serif italic"
              />
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-[#15171c]/50 sketched-border px-4 py-2.5 text-sm text-[#fcf6ba] focus:outline-none focus:ring-1 focus:ring-[#bf953f] font-serif italic"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="done">Done</option>
            </select>

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
              <p className="text-[#fcf6ba] font-serif italic font-bold text-lg">No invoices yet</p>
              <p className="text-[#a09e91] font-serif italic text-sm mt-2">Use Voice Create above to speak your first invoice.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredInvoices.map(invoice => (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={invoice.id}
                  onClick={() => navigate(`/editor/${invoice.id}`)}
                  className="bg-[#15171c]/50 sketched-border border-[#bf953f]/30 p-6 hover:border-[#bf953f] hover:shadow-[0_0_15px_rgba(191,149,63,0.1)] cursor-pointer transition-all group"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <span className="bg-[#bf953f]/10 border border-[#bf953f]/30 text-[#bf953f] text-[10px] font-serif font-bold italic px-2 py-1 inline-block uppercase tracking-widest mb-3">
                        {invoice.status}
                      </span>
                      <h3 className="font-serif font-bold italic text-lg text-[#fcf6ba] group-hover:text-[#bf953f] transition-colors">
                        {invoice.customerInfo?.name || invoice.title || 'Untitled'}
                      </h3>
                      <p className="text-xs text-[#a09e91] font-serif italic mt-1 uppercase tracking-widest">
                        #: {invoice.invoiceNumber}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full border border-[#bf953f]/30 bg-gradient-to-br from-[#1a1a1a] to-[#0f1115] flex items-center justify-center font-serif font-black italic text-lg text-[#bf953f] shadow-inner">
                      {invoice.customerInfo?.name ? invoice.customerInfo.name.charAt(0).toUpperCase() : '?'}
                    </div>
                  </div>
                  <div className="flex justify-between items-end pt-4 border-t border-[#bf953f]/10">
                    <div>
                      <p className="text-[10px] font-serif font-bold italic uppercase tracking-widest text-[#a09e91] mb-1">Total</p>
                      <p className="font-serif italic font-bold text-lg text-[#fcf6ba]">
                        {formatCurrency(computeInvoiceTotals(invoice).grandTotal, invoice.currency)}
                      </p>
                    </div>
                    <div className="text-right text-xs font-serif italic text-[#a09e91] flex items-center gap-1.5 uppercase tracking-widest">
                      <CalendarDays className="w-3.5 h-3.5 text-[#bf953f]" />
                      {formatDate(invoice.issueDate)}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Voice / Text Create Modal */}
      <AnimatePresence>
        {isAICreateOpen && (
          <motion.div
            key="ai-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
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
              <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-[#bf953f] to-[#aa771c] text-[#0f1115] shadow-inner sketched-border border-[#bf953f]">
                    {aiMode === 'text' ? <Type className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  </div>
                  <div>
                    <h2 className="font-serif italic font-bold text-2xl text-[#fcf6ba] gold-gradient-text">
                      {aiMode === 'text' ? 'Text Input' : 'Voice Input'}
                    </h2>
                    <h3 className="text-[#a09e91] font-serif italic text-sm">
                      {aiMode === 'text' ? 'Type recipient and items' : 'Speak recipient and items'}
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => { setIsAICreateOpen(false); setVoiceStage('idle'); setError(''); }}
                  className="text-[#bf953f]/50 hover:text-[#bf953f] bg-[#1a1a1a] p-2 transition-colors sketched-border"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative z-10">
                {aiMode === 'text' ? (
                  <textarea
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="e.g. Ramesh Kumar, 2 speaker amplifiers for 15000, 1 sound mixer for 8000"
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
                          className={`w-24 h-24 flex items-center justify-center transition-all disabled:opacity-50 sketched-border ${recordingState === 'recording' ? 'bg-red-950/40 text-red-500 scale-110 shadow-[0_0_30px_rgba(239,68,68,0.2)] border-red-500/50' : 'bg-[#15171c] text-[#bf953f]/50 hover:bg-[#bf953f]/10 hover:text-[#bf953f] border-[#bf953f]/20 hover:border-[#bf953f]/50'}`}
                        >
                          <Mic className={`w-10 h-10 ${recordingState === 'recording' ? 'animate-pulse' : ''}`} />
                        </button>
                        <div className="mt-6 text-center font-serif italic">
                          {voiceStage === 'transcribing' ? (
                            <p className="text-[#bf953f] font-bold flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" /> Transcribing...
                            </p>
                          ) : recordingState === 'recording' ? (
                            <p className="text-red-400 font-bold animate-pulse flex items-center gap-2">
                              <span className="w-2 h-2 bg-red-500 rounded-full"></span> Recording in progress...
                            </p>
                          ) : (
                            <p className="text-[#a09e91]">Tap microphone to speak</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {streamingStage !== 'idle' && (
                  <div className="mb-4 p-4 sketched-border border-[#bf953f]/30 bg-[#bf953f]/10 flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-[#bf953f] animate-spin" />
                    <span className="text-sm font-serif italic font-bold text-[#fcf6ba]">
                      Structuring invoice data...
                    </span>
                  </div>
                )}

                {error && (
                  <div className="mb-4 p-4 sketched-border border-red-900/50 bg-red-950/20 text-red-400 text-sm font-serif italic">
                    {error}
                  </div>
                )}
              </div>

              {voiceStage !== 'transcript-review' && aiMode === 'text' && (
                <div className="flex justify-end gap-3 relative z-10">
                  <button
                    disabled={isGenerating || !prompt.trim()}
                    onClick={handleCreateAI}
                    className="px-8 py-3 text-[#0f1115] font-serif font-black italic tracking-wider flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-[#bf953f] to-[#aa771c] hover:from-[#fcf6ba] hover:to-[#bf953f] shadow-[0_0_20px_rgba(191,149,63,0.3)]"
                  >
                    {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                    {isGenerating ? 'Processing...' : 'Create Invoice'}
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
