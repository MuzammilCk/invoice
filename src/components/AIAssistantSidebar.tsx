import React, { useState } from 'react';
import { Invoice } from '../types';
import { generateId } from '../lib/utils';
import { Send, UploadCloud, FileText, CheckCircle2 } from 'lucide-react';

interface AIFormProps {
  onGenerate: (data: Partial<Invoice>) => void;
}

export function AIAssistantSidebar({ onGenerate }: AIFormProps) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
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

  return (
    <div className="w-[320px] border-r border-zinc-800 flex flex-col bg-zinc-900/20 flex-shrink-0 h-full overflow-hidden">
      <div className="p-6 flex-1 flex flex-col overflow-y-auto">
        <div className="mb-8">
          <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-4">AI Smart Controls</label>
          <div className="space-y-3">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Create an invoice for Acme Corp for website redesign, 40 hours at $100/hr..."
              className="w-full text-xs bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 min-h-[120px] transition-colors"
            />
            {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
            
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="w-full text-left p-3 rounded-xl bg-zinc-800/50 border border-zinc-700 hover:border-indigo-500 transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <div className="w-8 h-8 flex-shrink-0 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:text-indigo-300 transition-colors">
                {isGenerating ? (
                   <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                   </svg>
                ) : (
                   <Send className="w-4 h-4" />
                )}
              </div>
              <div>
                <div className="text-xs font-bold text-zinc-300">{isGenerating ? 'Generating...' : 'Generate with AI'}</div>
                <div className="text-[10px] text-zinc-500 mt-1">Extract full details</div>
              </div>
            </button>

            <button className="w-full text-left p-3 rounded-xl bg-zinc-800/50 border border-zinc-700 hover:border-indigo-500 transition-all flex items-center gap-3 group">
              <div className="w-8 h-8 flex-shrink-0 rounded-lg bg-zinc-700/30 flex items-center justify-center text-zinc-400 group-hover:text-amber-400 transition-colors">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-zinc-300">Audit Compliance</div>
                <div className="text-[10px] text-zinc-500 mt-1">Tax & terms validation</div>
              </div>
            </button>
          </div>
        </div>

        <div className="mt-auto pt-8">
          <div className="bg-zinc-800/80 rounded-2xl p-4 border border-zinc-700/50">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                 <svg className="w-3 h-3" fill="white" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 11-7.6-11.2V3a11 11 0 1011 11h-2.5z"></path></svg>
              </div>
              <span className="text-xs font-bold text-zinc-100">Gemini Assistant</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed italic">"I automatically structure your prompt into clean line items. Try asking me to create a consulting invoice for 10 hours at $150."</p>
          </div>
        </div>
      </div>
    </div>
  );
}
