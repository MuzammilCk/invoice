import React, { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Invoice } from '../types';
import { generateId } from '../lib/utils';
import { Send, FileText, CheckCircle2, Sparkles, Languages, Bot, Mic, Square, Shield } from 'lucide-react';
import { useStore } from '../store/useStore';
import { z } from 'zod';
import { AIResponseSchema, validateAIResponse } from '../lib/ai-schemas';
import { AIChangeDiff } from './AIChangeDiff';
import { buildClientContext } from '../lib/ai-context';
import { TranscriptReviewPanel } from './TranscriptReviewPanel';
import { apiClient } from '../lib/apiClient';

interface AIFormProps {
  onGenerate: (data: Partial<Invoice>) => void;
}

function stripPII(invoice: Invoice): object {
  return {
    items: invoice.items.map(i => ({
      description: i.description,
      quantity: i.quantity,
      rate: i.rate,
    })),
    taxRate: invoice.taxRate,
    currency: invoice.currency,
    notes: invoice.notes,
  };
}

const MAX_PROMPT_LENGTH = 1500;

export function AIAssistantSidebar({ onGenerate }: AIFormProps) {
  const { id } = useParams();
  const { invoices, updateInvoice } = useStore();
  const invoice = invoices.find(inv => inv.id === id);

  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [auditMessage, setAuditMessage] = useState('');
  const [error, setError] = useState('');
  
  // New State for SSE and Pipeline
  const [pendingChanges, setPendingChanges] = useState<Partial<Invoice> | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingStage, setStreamingStage] = useState<'idle' | 'generating' | 'parsing' | 'reviewing'>('idle');
  const [transcript, setTranscript] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState('');
  const [voiceStage, setVoiceStage] = useState<'idle' | 'recording' | 'transcribing' | 'transcript-review' | 'reviewing' | 'applying'>('idle');
  const [transcriptConfidence, setTranscriptConfidence] = useState(0);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditIssues, setAuditIssues] = useState<{code: string; field: string; message: string; severity: 'error' | 'warning'}[]>([]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechRecognitionRef = useRef<any>(null);

  const handleGenerate = async () => {
    if (!prompt.trim() || !invoice) return;

    setStreamingStage('generating');
    setStreamingContent('');
    setError('');

    try {
      const invoiceContext = stripPII(invoice);
      let clientContext = null;
      if (invoice.customerInfo?.name) {
        clientContext = buildClientContext(invoices, invoice.customerInfo.name);
      }

      const response = await apiClient('/api/v1/generate-invoice-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Current invoice context: ${JSON.stringify(invoiceContext)}. User request: ${prompt}. Return updated fields.`,
          clientContext,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate');
      }

      // ── Read SSE stream ──
      const reader = response.body?.getReader();
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
          if (line.startsWith('event: ')) {
            const eventType = line.slice(7);
            continue; // Event type tracking (optional)
          }
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.stage) {
                setStreamingStage(data.stage === 'parsing' ? 'parsing' : 'generating');
              }

              if (data.partial) {
                setStreamingContent(data.partial);
              }

              if (data.error) {
                setError(data.error);
                setStreamingStage('idle');
                return;
              }

              // Final result — stage to pending changes
              if (data.customerInfo || data.items) {
                const validated = validateAIResponse(data);
                if (!validated) {
                  setError('AI returned invalid data. Please try rephrasing.');
                  setStreamingStage('idle');
                  return;
                }

                const mappedData: Partial<Invoice> = {
                  ...(validated.customerInfo ? {
                    customerInfo: {
                      name: validated.customerInfo.name || '',
                      email: validated.customerInfo.email || '',
                      address: validated.customerInfo.address || '',
                    }
                  } : {}),
                  items: validated.items.map(item => ({ ...item, id: generateId() })),
                  taxRate: validated.taxRate,
                  notes: validated.notes,
                  ...(validated.templateId ? { templateId: validated.templateId } : {}),
                  ...(validated.currency ? { currency: validated.currency } : {}),
                  ...(validated.title ? { title: validated.title } : {}),
                  ...(validated.themeColor ? { themeColor: validated.themeColor } : {}),
                  ...(validated.discountRate !== undefined ? { discountRate: validated.discountRate } : {}),
                  ...(validated.dueDate ? { dueDate: validated.dueDate } : {}),
                  ...(validated.shipping !== undefined ? { shipping: validated.shipping } : {}),
                };

                setPendingChanges(mappedData);
                setStreamingStage('reviewing');
              }
            } catch {}
          }
        }
      }

      setPrompt('');
    } catch (err: any) {
      setError(err.message);
      setStreamingStage('idle');
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setVoiceStage('recording');
      setIsRecording(true);
      setTranscript('');
      setDetectedLanguage('');

      // ── Start Web Speech API for visual feedback (browser-side only) ──
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = ''; // Auto-detect

        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            interimTranscript += event.results[i][0].transcript;
          }
          setTranscript(interimTranscript);
        };

        speechRecognitionRef.current = recognition;
        recognition.start();
      }

      // ── Start actual recording ──
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        // Stop Web Speech API
        if (speechRecognitionRef.current) {
          speechRecognitionRef.current.stop();
          speechRecognitionRef.current = null;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setVoiceStage('transcribing');
        await handleAudioGenerate(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
    } catch (err: any) {
      setError('Microphone access denied or unavailable.');
      setVoiceStage('idle');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // B-06: Stage 1 — Transcribe only (STT), show transcript for review
  const handleAudioGenerate = async (audioBlob: Blob) => {
    if (!invoice) return;
    setIsGenerating(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob);

      // Stage 1: Transcribe audio → get transcript + language + confidence
      const response = await apiClient('/api/v1/transcribe-audio', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to transcribe audio');
      }

      const { transcript: sttTranscript, language, confidence } = await response.json();
      setTranscript(sttTranscript);
      setDetectedLanguage(language);
      setTranscriptConfidence(confidence);

      // Show review panel — user can edit before proceeding to Stage 2
      setVoiceStage('transcript-review');
    } catch (err: any) {
      setError(err.message);
      setVoiceStage('idle');
    } finally {
      setIsGenerating(false);
    }
  };

  // B-06: Stage 2 — Generate invoice from reviewed transcript (SSE streaming)
  const handleTranscriptProceed = async () => {
    if (!invoice || !transcript.trim()) return;
    setVoiceStage('applying');
    setStreamingStage('generating');
    setStreamingContent('');
    setError('');

    try {
      const invoiceContext = stripPII(invoice);

      const response = await apiClient('/api/v1/text-to-invoice-from-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          invoiceContext,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate from transcript');
      }

      // Read SSE stream (same pattern as handleGenerate)
      const reader = response.body?.getReader();
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
              if (data.partial) setStreamingContent(data.partial);
              if (data.error) { setError(data.error); setStreamingStage('idle'); setVoiceStage('idle'); return; }
              if (data.customerInfo || data.items) {
                const validated = validateAIResponse(data);
                if (!validated) { setError('AI returned invalid data. Please try again.'); setStreamingStage('idle'); setVoiceStage('idle'); return; }
                const mappedData: Partial<Invoice> = {
                  ...(validated.customerInfo ? { customerInfo: { name: validated.customerInfo.name || '', email: validated.customerInfo.email || '', address: validated.customerInfo.address || '' } } : {}),
                  items: validated.items.map(item => ({ ...item, id: generateId() })),
                  taxRate: validated.taxRate,
                  notes: validated.notes,
                  ...(validated.templateId ? { templateId: validated.templateId } : {}),
                  ...(validated.currency ? { currency: validated.currency } : {}),
                  ...(validated.title ? { title: validated.title } : {}),
                  ...(validated.themeColor ? { themeColor: validated.themeColor } : {}),
                  ...(validated.discountRate !== undefined ? { discountRate: validated.discountRate } : {}),
                  ...(validated.dueDate ? { dueDate: validated.dueDate } : {}),
                  ...(validated.shipping !== undefined ? { shipping: validated.shipping } : {}),
                };
                setPendingChanges(mappedData);
                setStreamingStage('reviewing');
                setVoiceStage('reviewing');
              }
            } catch {}
          }
        }
      }
    } catch (err: any) {
      setError(err.message);
      setStreamingStage('idle');
      setVoiceStage('idle');
    }
  };

  // B-07: Server-side audit using comprehensive /validate endpoint
  const handleAudit = async () => {
    if (!invoice) return;
    setIsAuditing(true);
    setAuditMessage('');
    setAuditIssues([]);
    setError('');

    try {
      const response = await apiClient(`/api/v1/invoices/${invoice.id}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice }),
      });

      if (!response.ok) {
        throw new Error('Validation request failed');
      }

      const result = await response.json();
      setAuditIssues(result.issues || []);

      if (result.valid) {
        setAuditMessage(`✅ Compliant — ${result.warningCount} warning(s), no errors. Ready to send!`);
      } else {
        setAuditMessage(`⚠️ ${result.errorCount} error(s) and ${result.warningCount} warning(s) found.`);
      }
    } catch (err: any) {
      setError(`Audit failed: ${err.message}`);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleRewriteNotes = async () => {
    if (!invoice || !invoice.notes) return;
    setIsRewriting(true);
    setError('');
    
    try {
      const response = await apiClient('/api/v1/rewrite', {
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
    <div className="ai-sidebar w-[320px] border-r border-zinc-800 flex flex-col bg-zinc-900/40 flex-shrink-0 h-full overflow-hidden shadow-xl z-20 relative">
      <div className="p-6 flex-1 flex flex-col overflow-y-auto custom-scrollbar">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <label className="text-xs font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2">
              <Bot className="w-4 h-4 text-indigo-400" /> AI Workbench
            </label>
          </div>
          <div className="space-y-3">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value.substring(0, MAX_PROMPT_LENGTH))}
              maxLength={MAX_PROMPT_LENGTH}
              placeholder="e.g. Add 2 hours for design consulting at 150/hr..."
              className="w-full text-sm bg-zinc-900 border border-zinc-700/50 rounded-xl p-4 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 min-h-[140px] transition-colors shadow-sm"
            />
            <span className="text-[10px] text-zinc-600 text-right block">
              {prompt.length}/{MAX_PROMPT_LENGTH}
            </span>
            {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
            
            <div className="flex gap-2">
              <button
                onClick={handleGenerate}
                disabled={streamingStage !== 'idle' || !prompt.trim()}
                className="flex-1 p-3 rounded-xl bg-indigo-600/10 border border-indigo-500/20 hover:bg-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-indigo-100 text-sm font-semibold shadow-sm"
              >
                {streamingStage !== 'idle' && streamingStage !== 'reviewing' && prompt.trim() ? (
                   <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                   </svg>
                ) : (
                   <Sparkles className="w-4 h-4 text-indigo-400" />
                )}
                Update
              </button>
              
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={streamingStage !== 'idle' && !isRecording}
                className={`p-3 rounded-xl border transition-all flex items-center justify-center w-12 ${isRecording ? 'bg-red-500/20 border-red-500/50 text-red-500 animate-pulse' : 'bg-zinc-800/40 border-zinc-700/50 hover:bg-zinc-800/80 text-zinc-400 hover:text-zinc-200'}`}
                title={isRecording ? 'Stop Recording' : 'Dictate Instructions'}
              >
                 {isRecording ? <Square className="w-4 h-4 fill-current" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>
            
            {/* B-06: 3-Stage Voice Pipeline Feedback */}
            {voiceStage !== 'idle' && (
              <div className="mt-3">
                {/* Stage 1: Recording with live transcript */}
                {voiceStage === 'recording' && (
                  <div className="p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/50">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-xs font-semibold text-red-400">Recording...</span>
                    </div>
                    {transcript && (
                      <p className="text-xs text-zinc-300 bg-zinc-900/50 p-2 rounded italic leading-relaxed">
                        "{transcript}"
                      </p>
                    )}
                  </div>
                )}

                {/* Stage 2: Transcribing (Whisper processing) */}
                {voiceStage === 'transcribing' && (
                  <div className="p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/50 flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-indigo-400" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-xs text-zinc-400">Transcribing with Whisper (high accuracy)...</span>
                  </div>
                )}

                {/* Stage 2.5: Transcript Review (B-06 critical addition) */}
                {voiceStage === 'transcript-review' && (
                  <TranscriptReviewPanel
                    transcript={transcript}
                    language={detectedLanguage}
                    confidence={transcriptConfidence}
                    onTranscriptChange={setTranscript}
                    onProceed={handleTranscriptProceed}
                    onCancel={() => { setVoiceStage('idle'); setTranscript(''); }}
                  />
                )}

                {/* Stage 3: Applying (generating from transcript) */}
                {voiceStage === 'applying' && (
                  <div className="p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/50 flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-emerald-400" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-xs text-zinc-400">Generating invoice from transcript...</span>
                  </div>
                )}
              </div>
            )}
            
            {/* AI Change Diff Panel */}
            {pendingChanges && invoice && (
              <AIChangeDiff
                currentInvoice={invoice}
                proposedChanges={pendingChanges}
                onApply={(accepted) => {
                  onGenerate(accepted);
                  setPendingChanges(null);
                  setStreamingStage('idle');
                  setVoiceStage('idle');
                }}
                onReject={() => {
                  setPendingChanges(null);
                  setStreamingStage('idle');
                  setVoiceStage('idle');
                }}
              />
            )}
          </div>
        </div>

        <div className="space-y-3">
          <button onClick={handleRewriteNotes} disabled={isRewriting || !invoice?.notes} className="w-full text-left p-4 rounded-xl bg-zinc-800/40 border border-zinc-700/50 hover:bg-zinc-800/80 hover:border-zinc-500 transition-all flex items-center gap-3 group disabled:opacity-50 shadow-sm">
            <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-zinc-700/50 flex items-center justify-center text-emerald-400 group-hover:text-emerald-300 transition-colors">
              {isRewriting ? <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <Languages className="w-5 h-5" />}
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-200">Polish Notes (AI)</div>
              <div className="text-xs text-zinc-500 mt-1">Make notes professional</div>
            </div>
          </button>

          {/* B-07: Server-side audit button */}
          <button onClick={handleAudit} disabled={isAuditing} className="w-full text-left p-4 rounded-xl bg-zinc-800/40 border border-zinc-700/50 hover:bg-zinc-800/80 hover:border-zinc-500 transition-all flex items-center gap-3 group shadow-sm disabled:opacity-50">
            <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-zinc-700/50 flex items-center justify-center text-amber-400 group-hover:text-amber-300 transition-colors">
              {isAuditing ? <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> : <Shield className="w-5 h-5" />}
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-200">Audit Compliance</div>
              <div className="text-xs text-zinc-500 mt-1">Server-side validation</div>
            </div>
          </button>
          {auditMessage && <div className="p-3 mt-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs">{auditMessage}</div>}
          {auditIssues.length > 0 && (
            <div className="space-y-1.5 mt-2">
              {auditIssues.map((issue, i) => (
                <div key={i} className={`p-2.5 rounded-lg text-xs flex items-start gap-2 ${
                  issue.severity === 'error' 
                    ? 'bg-red-500/10 border border-red-500/20 text-red-300' 
                    : 'bg-amber-500/10 border border-amber-500/20 text-amber-300'
                }`}>
                  <span className="font-mono text-[10px] opacity-60 flex-shrink-0 mt-0.5">{issue.code}</span>
                  <span>{issue.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
