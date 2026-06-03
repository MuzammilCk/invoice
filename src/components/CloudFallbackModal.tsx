import React from 'react';

export function CloudFallbackModal({ onAccept, onDecline }: { onAccept: () => void; onDecline: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-zinc-900 rounded-2xl p-6 max-w-md w-full mx-4 border border-zinc-700 shadow-2xl">
        <h2 className="text-lg font-bold text-zinc-100 mb-2">Local AI Unavailable</h2>
        <p className="text-sm text-zinc-400 mb-4">
          Ollama is not running or the model is not loaded. Would you like to use Groq cloud as a temporary fallback?
        </p>
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 mb-4">
          <p className="text-xs text-amber-300">
            ⚠️ Cloud fallback sends invoice prompts to Groq's servers. No PII is included (stripped automatically), but the prompt text will leave your machine.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onAccept} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold transition-colors">
            Use Cloud Temporarily
          </button>
          <button onClick={onDecline} className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-bold transition-colors">
            Stay Offline
          </button>
        </div>
      </div>
    </div>
  );
}
