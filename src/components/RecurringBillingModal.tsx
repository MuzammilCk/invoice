import React, { useState, useEffect } from 'react';
import { CalendarClock, Clock, Loader2, X, CheckCircle2, PlayCircle, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Invoice } from '../types';
import { formatCurrency, formatDate } from '../lib/utils';
import { computeInvoiceTotals } from '../lib/calculations';
import { apiClient } from '../lib/apiClient';

interface RecurringSchedule {
  id: string;
  templateInvoiceId: string;
  frequency: string;
  cronExpression: string;
  autoSend: boolean;
  nextRunAt: string;
  isActive: boolean;
}

interface RecurringBillingModalProps {
  invoice: Invoice;
  isOpen: boolean;
  onClose: () => void;
}

export function RecurringBillingModal({ invoice, isOpen, onClose }: RecurringBillingModalProps) {
  const [frequency, setFrequency] = useState('monthly');
  const [autoSend, setAutoSend] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSchedule, setActiveSchedule] = useState<RecurringSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && invoice.id) {
      loadSchedules();
    }
  }, [isOpen, invoice.id]);

  const loadSchedules = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient('/api/v1/schedules');
      if (res.ok) {
        const data = await res.json();
        const schedule = data.schedules?.find((s: any) => s.templateInvoiceId === invoice.id);
        if (schedule) {
          setActiveSchedule(schedule);
          setFrequency(schedule.frequency);
          setAutoSend(schedule.autoSend);
        } else {
          setActiveSchedule(null);
        }
      }
    } catch (err) {
      console.error('Failed to load schedules', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    setIsSubmitting(true);
    try {
      const res = await apiClient(`/api/v1/invoices/${invoice.id}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frequency, autoSend })
      });
      if (!res.ok) throw new Error('Failed to create schedule');
      await loadSchedules();
    } catch (err) {
      alert('Error creating schedule.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!activeSchedule) return;
    setIsSubmitting(true);
    try {
      const res = await apiClient(`/api/v1/schedules/${activeSchedule.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to cancel schedule');
      setActiveSchedule(null);
    } catch (err) {
      alert('Error cancelling schedule.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totals = computeInvoiceTotals(invoice);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
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
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                    <CalendarClock className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-zinc-100">Recurring Billing</h2>
                    <p className="text-xs text-zinc-500">Automate this invoice schedule</p>
                  </div>
                </div>
                <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {isLoading ? (
                <div className="p-12 flex justify-center">
                  <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                </div>
              ) : activeSchedule ? (
                <div className="p-6">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5 text-center mb-6">
                    <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-emerald-400 mb-1">Schedule Active</h3>
                    <p className="text-sm text-emerald-500/80">This invoice will automatically generate {activeSchedule.frequency}.</p>
                  </div>

                  <div className="space-y-3 mb-8">
                    <div className="flex justify-between items-center p-3 bg-zinc-800/50 rounded-lg">
                      <span className="text-sm text-zinc-400">Next Generation</span>
                      <span className="text-sm font-semibold text-zinc-200">{formatDate(activeSchedule.nextRunAt)}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-zinc-800/50 rounded-lg">
                      <span className="text-sm text-zinc-400">Auto-Send via Email</span>
                      <span className={`text-sm font-semibold ${activeSchedule.autoSend ? 'text-emerald-400' : 'text-zinc-500'}`}>
                        {activeSchedule.autoSend ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleCancel}
                    disabled={isSubmitting}
                    className="w-full px-4 py-3 bg-red-500/10 text-red-400 font-bold rounded-xl hover:bg-red-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                    Cancel Subscription
                  </button>
                </div>
              ) : (
                <div className="p-6">
                  <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 mb-6 flex items-start gap-3">
                    <PlayCircle className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-indigo-100">Set up automation</h4>
                      <p className="text-xs text-indigo-300 mt-1">A new invoice will be cloned from this template at your chosen interval. The amount billed will be {formatCurrency(totals.grandTotal, invoice.currency)}.</p>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Billing Frequency</label>
                      <select
                        value={frequency}
                        onChange={(e) => setFrequency(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      >
                        <option value="weekly">Weekly (Every Monday)</option>
                        <option value="biweekly">Bi-weekly (1st and 15th)</option>
                        <option value="monthly">Monthly (1st of Month)</option>
                        <option value="quarterly">Quarterly</option>
                        <option value="annually">Annually (Jan 1st)</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-3 p-4 bg-zinc-950 border border-zinc-800 rounded-xl cursor-pointer" onClick={() => setAutoSend(!autoSend)}>
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${autoSend ? 'bg-indigo-500 border-indigo-500' : 'bg-transparent border-zinc-600'}`}>
                        {autoSend && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-200">Auto-send to client</p>
                        <p className="text-xs text-zinc-500 mt-0.5">Automatically email the generated invoice to the client.</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8">
                    <button
                      onClick={handleCreate}
                      disabled={isSubmitting}
                      className="w-full px-4 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-indigo-500/20"
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                      Start Recurring Schedule
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
