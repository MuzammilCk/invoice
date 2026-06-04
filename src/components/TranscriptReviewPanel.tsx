import React from 'react';
import { Languages, CheckCircle2, X, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';

interface TranscriptReviewPanelProps {
  transcript: string;
  language: string;
  confidence: number;
  onTranscriptChange: (transcript: string) => void;
  onProceed: () => void;
  onCancel: () => void;
}

export function TranscriptReviewPanel({
  transcript,
  language,
  confidence,
  onTranscriptChange,
  onProceed,
  onCancel,
}: TranscriptReviewPanelProps) {
  const isLowConfidence = confidence > 0 && confidence < 70;

  // Map common language codes to human-readable names
  const languageNames: Record<string, string> = {
    en: 'English',
    hi: 'Hindi',
    ta: 'Tamil',
    te: 'Telugu',
    ml: 'Malayalam',
    kn: 'Kannada',
    bn: 'Bengali',
    mr: 'Marathi',
    gu: 'Gujarati',
    pa: 'Punjabi',
    ur: 'Urdu',
    ar: 'Arabic',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    ja: 'Japanese',
    zh: 'Chinese',
  };

  const displayLanguage = languageNames[language?.toLowerCase()] || language?.toUpperCase() || 'Unknown';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3 p-4 rounded-xl bg-zinc-800/60 border border-zinc-700/50 space-y-3"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Languages className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Transcript Review</span>
        </div>
        <button
          onClick={onCancel}
          className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 rounded-lg hover:bg-zinc-700/50"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Language badge and confidence */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-500/15 border border-indigo-500/25 rounded-full">
          <span className="text-[10px] font-bold text-indigo-300">
            {displayLanguage}
          </span>
        </div>
        {confidence > 0 && (
          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${
            isLowConfidence 
              ? 'bg-amber-500/15 border border-amber-500/25 text-amber-300' 
              : 'bg-emerald-500/15 border border-emerald-500/25 text-emerald-300'
          }`}>
            {isLowConfidence && <AlertTriangle className="w-3 h-3" />}
            {Math.round(confidence)}% confidence
          </div>
        )}
      </div>

      {/* Editable transcript */}
      <textarea
        value={transcript}
        onChange={(e) => onTranscriptChange(e.target.value)}
        className="w-full bg-zinc-900/80 border border-zinc-700/40 rounded-lg p-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 min-h-[100px] resize-none leading-relaxed"
        placeholder="Transcript will appear here..."
      />

      {isLowConfidence && (
        <p className="text-[10px] text-amber-400/80 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Low confidence — please review and correct any errors before proceeding.
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onProceed}
          disabled={!transcript.trim()}
          className="flex-1 px-4 py-2.5 bg-indigo-600/20 border border-indigo-500/30 text-indigo-200 rounded-lg hover:bg-indigo-600/30 transition-all text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <CheckCircle2 className="w-4 h-4" />
          Generate Invoice
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2.5 bg-zinc-800/60 border border-zinc-700/50 text-zinc-400 rounded-lg hover:bg-zinc-700/50 hover:text-zinc-300 transition-all text-sm font-medium"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  );
}
