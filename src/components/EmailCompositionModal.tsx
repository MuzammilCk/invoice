import React, { useState } from 'react';
import { X, Mail, Send, Paperclip, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Invoice } from '../types';
import { apiClient } from '../lib/apiClient';

interface EmailCompositionModalProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
}

export function EmailCompositionModal({ invoice, isOpen, onClose }: EmailCompositionModalProps) {
  const [to, setTo] = useState(invoice.customerInfo?.email || '');
  const [subject, setSubject] = useState(`Invoice ${invoice.invoiceNumber} from ${invoice.businessInfo?.name || 'Us'}`);
  const [body, setBody] = useState(
    `Hi ${invoice.customerInfo?.name || 'there'},\n\nPlease find attached the invoice ${invoice.invoiceNumber} for your recent project.\n\nThank you for your business!\n\nBest regards,\n${invoice.businessInfo?.name || ''}`
  );
  const [attachPdf, setAttachPdf] = useState(true);
  
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSend = async () => {
    if (!to || !subject) return;
    
    setIsSending(true);
    setStatus('idle');
    setErrorMessage('');

    try {
      const res = await apiClient(`/api/v1/invoices/${invoice.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          subject,
          body: body.replace(/\n/g, '<br/>'),
          attachPdf,
          invoice // passing invoice so server can generate PDF on the fly
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send email');
      }

      setStatus('success');
      setTimeout(() => {
        onClose();
        setStatus('idle');
      }, 2000);
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={status !== 'success' ? onClose : undefined}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg shadow-2xl pointer-events-auto flex flex-col overflow-hidden"
            >
              <div className="p-5 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-zinc-100">Send via Email</h2>
                    <p className="text-xs text-zinc-500">Nodemailer delivery system</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {status === 'success' ? (
                <div className="p-12 flex flex-col items-center justify-center text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 15 }}
                  >
                    <CheckCircle2 className="w-16 h-16 text-emerald-400 mb-4" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-zinc-100 mb-2">Email Sent!</h3>
                  <p className="text-sm text-zinc-500">Your invoice has been successfully dispatched.</p>
                </div>
              ) : (
                <>
                  <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                    {status === 'error' && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-400 leading-relaxed">{errorMessage}</p>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">To</label>
                      <input
                        type="email"
                        value={to}
                        onChange={e => setTo(e.target.value)}
                        placeholder="client@example.com"
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Subject</label>
                      <input
                        type="text"
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Message</label>
                      <textarea
                        value={body}
                        onChange={e => setBody(e.target.value)}
                        rows={6}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none custom-scrollbar"
                      />
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-zinc-950 border border-zinc-800 rounded-xl cursor-pointer" onClick={() => setAttachPdf(!attachPdf)}>
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${attachPdf ? 'bg-blue-500 border-blue-500' : 'bg-transparent border-zinc-600'}`}>
                        {attachPdf && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-zinc-300">
                        <Paperclip className="w-4 h-4 text-zinc-500" />
                        Attach invoice as PDF ({invoice.invoiceNumber}.pdf)
                      </div>
                    </div>
                  </div>

                  <div className="p-5 border-t border-zinc-800 bg-zinc-900/50 flex justify-end gap-3">
                    <button
                      onClick={onClose}
                      className="px-5 py-2.5 text-sm font-semibold text-zinc-300 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSend}
                      disabled={isSending || !to || !subject}
                      className="px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {isSending ? 'Sending...' : 'Send Email'}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
