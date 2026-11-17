import React, { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Invoice } from '../types';
import { generateId } from '../lib/utils';
import { Mic, Square, Loader2, Bot } from 'lucide-react';
import { useStore } from '../store/useStore';
import { validateAIResponse } from '../lib/ai-schemas';
import { TranscriptReviewPanel } from './TranscriptReviewPanel';
import { startStreamPCM } from '../lib/audio/streamPCM';

type RecordingState = 'idle' | 'recording' | 'processing' | 'complete';

interface AIFormProps {
  onGenerate: (data: Partial<Invoice>) => void;
}

export function AIAssistantSidebar({ onGenerate }: AIFormProps) {
  const { id } = useParams();
  const { invoices } = useStore();
  const invoice = invoices.find(inv => inv.id === id);

  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [error, setError] = useState('');
  const [voiceStage, setVoiceStage] = useState('idle');
  const [transcript, setTranscript] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState('');
  const [transcriptConfidence, setTranscriptConfidence] = useState(0);
  const [isApplying, setIsApplying] = useState(false);

  const stopStreamRef = useRef<(() => void) | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  React.useEffect(() => {
    return () => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close(1001, 'Component unmounted');
      }
    };
  }, []);

  // Timeout: if STT doesn't respond within 30s after stop, reset
  React.useEffect(() => {
    if (recordingState !== 'processing') return;
    const timeout = setTimeout(() => {
      setRecordingState('idle');
      setVoiceStage('idle');
      setError('Transcription timed out. Please try again.');
    }, 30_000);
    return () => clearTimeout(timeout);
  }, [recordingState]);

  const startRecording = async () => {
    try {
      setRecordingState('recording');
      setVoiceStage('recording');
      setTranscript('');
      setDetectedLanguage('');
      setError('');

      const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const wsUrl = `${wsProtocol}://${window.location.host}/ws/stt`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.binaryType = 'arraybuffer';

      ws.onopen = async () => {
        stopStreamRef.current = await startStreamPCM(
          ws,
          () => { /* stream started */ },
          (err) => {
            setRecordingState('idle');
            setVoiceStage('idle');
            setError('Microphone access failed: ' + err.message);
          }
        ) ?? null;
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string);
          if (msg.type === 'stt_ready') return;
          if (msg.type === 'partial') {
            setTranscript(msg.text);
          } else if (msg.type === 'final') {
            setTranscript(msg.text);
            setDetectedLanguage(msg.language || '');
            setTranscriptConfidence(msg.confidence || 0);
            setRecordingState('complete');
            setVoiceStage('transcript-review');
          } else if (msg.type === 'error') {
            setError(msg.message || 'Transcription failed');
            setRecordingState('idle');
            setVoiceStage('idle');
          }
        } catch {}
      };

      ws.onerror = () => {
        setError('WebSocket connection to STT failed. Is stt_server.py running?');
        setRecordingState('idle');
        setVoiceStage('idle');
      };

    } catch (err: any) {
      if (err.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow microphone access and try again.');
      } else {
        setError('Microphone unavailable: ' + err.message);
      }
      setRecordingState('idle');
      setVoiceStage('idle');
    }
  };

  const stopRecording = () => {
    stopStreamRef.current?.();
    stopStreamRef.current = null;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close(1000, 'Recording stopped');
    }
    setRecordingState('processing');
    setVoiceStage('transcribing');
  };

  // Stage 2: Send confirmed transcript to LLM for normalization
  const handleTranscriptProceed = async () => {
    if (!invoice || !transcript.trim()) return;
    setVoiceStage('applying');
    setIsApplying(true);
    setError('');

    try {
      const response = await fetch('/api/v1/text-to-invoice-from-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate from transcript');
      }

      // Read SSE stream
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
              if (data.error) {
                setError(data.error);
                setVoiceStage('idle');
                return;
              }
              if (data.recipient || data.items) {
                const validated = validateAIResponse(data);
                if (!validated) {
                  setError('AI returned invalid data. Please try again.');
                  setVoiceStage('idle');
                  return;
                }
                // Map to Invoice fields
                const mappedData: Partial<Invoice> = {
                  ...(validated.recipient ? {
                    customerInfo: {
                      name: validated.recipient.name,
                      email: '',
                      address: validated.recipient.address || '',
                    }
                  } : {}),
                  ...(validated.date ? { issueDate: new Date(validated.date).toISOString() } : {}),
                  items: validated.items.map(item => ({
                    id: generateId(),
                    description: item.description,
                    quantity: 1,
                    rate: item.price,
                  })),
                  notes: validated.notes || '',
                };
                onGenerate(mappedData);
                setVoiceStage('idle');
                setRecordingState('idle');
                setTranscript('');
              }
            } catch {}
          }
        }
      }
    } catch (err: any) {
      setError(err.message);
      setVoiceStage('idle');
    } finally {
      setIsApplying(false);
    }
  };

  const handleTranscriptCancel = () => {
    setVoiceStage('idle');
    setRecordingState('idle');
    setTranscript('');
    setError('');
  };

  return (
    <div className="w-80 flex-shrink-0 h-full border-l border-[#bf953f]/20 bg-[#0f1115] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#bf953f]/20 flex items-center gap-2">
        <Bot className="w-4 h-4 text-[#bf953f]" />
        <span className="text-sm font-serif italic font-bold text-[#bf953f]">Voice Input</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Error */}
        {error && (
          <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-xl text-xs text-red-400 font-serif italic">
            {error}
          </div>
        )}

        {/* Recording controls */}
        {voiceStage === 'idle' && (
          <div className="text-center">
            <p className="text-xs text-[#a09e91] font-serif italic mb-4">
              Tap the mic and speak the invoice details. The transcript will appear for you to confirm.
            </p>
            <button
              onClick={startRecording}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-[#bf953f] to-[#aa771c] text-[#0f1115] flex items-center justify-center mx-auto hover:from-[#fcf6ba] hover:to-[#bf953f] transition-all shadow-[0_0_30px_rgba(191,149,63,0.3)]"
            >
              <Mic className="w-8 h-8" />
            </button>
          </div>
        )}

        {voiceStage === 'recording' && (
          <div className="text-center">
            <p className="text-xs text-[#a09e91] font-serif italic mb-4 animate-pulse">Recording… speak clearly</p>
            {transcript && (
              <p className="text-xs text-[#fcf6ba] font-serif italic mb-4 bg-[#15171c] p-3 rounded-xl border border-[#bf953f]/20">
                {transcript}
              </p>
            )}
            <button
              onClick={stopRecording}
              className="w-20 h-20 rounded-full bg-red-600 text-white flex items-center justify-center mx-auto hover:bg-red-500 transition-all shadow-[0_0_30px_rgba(220,38,38,0.3)]"
            >
              <Square className="w-8 h-8" />
            </button>
          </div>
        )}

        {(voiceStage === 'transcribing' || voiceStage === 'applying') && (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 text-[#bf953f] animate-spin mx-auto mb-3" />
            <p className="text-xs text-[#a09e91] font-serif italic">
              {voiceStage === 'transcribing' ? 'Transcribing…' : 'Generating invoice…'}
            </p>
          </div>
        )}

        {voiceStage === 'transcript-review' && (
          <TranscriptReviewPanel
            transcript={transcript}
            language={detectedLanguage}
            confidence={transcriptConfidence}
            onTranscriptChange={setTranscript}
            onProceed={handleTranscriptProceed}
            onCancel={handleTranscriptCancel}
          />
        )}
      </div>
    </div>
  );
}
