import React, { useState, useEffect } from 'react';
import { Sparkles, AlertTriangle, Info, ShieldAlert, ArrowRight, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Invoice } from '../types';
import { apiClient } from '../lib/apiClient';

interface Suggestion {
  type: string;
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
}

interface AnalysisSuggestionCardProps {
  invoice: Invoice;
}

export function AnalysisSuggestionCard({ invoice }: AnalysisSuggestionCardProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Analyze whenever invoice changes
  useEffect(() => {
    // Debounce analysis
    const timer = setTimeout(() => {
      analyzeInvoice();
    }, 1500);
    return () => clearTimeout(timer);
  }, [invoice]);

  const analyzeInvoice = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient(`/api/v1/invoices/${invoice.id}/suggestions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice }),
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (err) {
      console.error('Failed to get suggestions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const activeSuggestions = suggestions.filter(s => !dismissed.has(s.type));

  if (!isVisible || (activeSuggestions.length === 0 && !isLoading)) {
    return null;
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'medium': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      default: return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <ShieldAlert className="w-4 h-4" />;
      case 'medium': return <AlertTriangle className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-zinc-900 border border-indigo-500/30 rounded-xl overflow-hidden shadow-lg shadow-indigo-500/5 mb-6 relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500"></div>
      
      <div className="p-4 border-b border-zinc-800/50 flex justify-between items-center bg-zinc-900/50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-semibold text-zinc-100">AI Analysis</h3>
          {isLoading && <Loader2 className="w-3 h-3 text-zinc-500 animate-spin ml-2" />}
        </div>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-2 space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
        <AnimatePresence>
          {activeSuggestions.map((suggestion) => (
            <motion.div
              key={suggestion.type}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={`p-3 rounded-lg border ${getPriorityColor(suggestion.priority)} flex items-start gap-3 group relative`}
            >
              <div className="mt-0.5 flex-shrink-0">
                {getPriorityIcon(suggestion.priority)}
              </div>
              <div className="flex-1 pr-6">
                <h4 className="text-sm font-bold">{suggestion.title}</h4>
                <p className="text-xs mt-1 opacity-90 leading-relaxed">{suggestion.message}</p>
              </div>
              <button
                onClick={() => setDismissed(prev => new Set(prev).add(suggestion.type))}
                className="absolute top-2 right-2 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity rounded-md hover:bg-black/20"
                title="Dismiss"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
