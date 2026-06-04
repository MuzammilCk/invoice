import React, { useState, useEffect } from 'react';
import { X, Clock, Shield, FileText, User, Eye, Pencil, Trash, Share, Download, CheckCircle2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDate } from '../lib/utils';
import { apiClient } from '../lib/apiClient';

interface AuditEntry {
  id: string;
  action: string;
  userId: string;
  timestamp: string;
  details?: string;
  ip?: string;
}

interface AuditLogDrawerProps {
  invoiceId: string;
  isOpen: boolean;
  onClose: () => void;
}

const ACTION_ICONS: Record<string, any> = {
  created: FileText,
  updated: Pencil,
  viewed: Eye,
  shared: Share,
  exported: Download,
  deleted: Trash,
  status_changed: CheckCircle2,
};

const ACTION_COLORS: Record<string, string> = {
  created: 'text-emerald-400 bg-emerald-500/15',
  updated: 'text-indigo-400 bg-indigo-500/15',
  viewed: 'text-zinc-400 bg-zinc-700/50',
  shared: 'text-violet-400 bg-violet-500/15',
  exported: 'text-blue-400 bg-blue-500/15',
  deleted: 'text-red-400 bg-red-500/15',
  status_changed: 'text-amber-400 bg-amber-500/15',
};

export function AuditLogDrawer({ invoiceId, isOpen, onClose }: AuditLogDrawerProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && invoiceId) {
      loadAuditLog();
    }
  }, [isOpen, invoiceId]);

  const loadAuditLog = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await apiClient(`/api/v1/invoices/${invoiceId}/audit-log`);
      if (!res.ok) throw new Error('Failed to load audit log');
      const data = await res.json();
      setEntries(data.entries || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-zinc-900 border-l border-zinc-800 shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-500/15 rounded-xl flex items-center justify-center">
                  <Shield className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-zinc-100">Audit Log</h2>
                  <p className="text-xs text-zinc-500">{entries.length} event{entries.length !== 1 ? 's' : ''} recorded</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                </div>
              ) : error ? (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              ) : entries.length === 0 ? (
                <div className="text-center py-20">
                  <Clock className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                  <p className="text-sm text-zinc-500">No audit events recorded yet.</p>
                  <p className="text-xs text-zinc-600 mt-1">Events will appear here as actions are taken on this invoice.</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-5 top-0 bottom-0 w-px bg-zinc-800" />

                  <div className="space-y-4">
                    {entries.map((entry, i) => {
                      const IconComp = ACTION_ICONS[entry.action] || Clock;
                      const colorClass = ACTION_COLORS[entry.action] || 'text-zinc-400 bg-zinc-700/50';

                      return (
                        <motion.div
                          key={entry.id || i}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="relative pl-12"
                        >
                          {/* Timeline dot */}
                          <div className={`absolute left-2.5 w-5 h-5 rounded-full flex items-center justify-center ${colorClass}`}>
                            <IconComp className="w-3 h-3" />
                          </div>

                          <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-lg p-3.5">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold text-zinc-200 capitalize">{entry.action.replace(/_/g, ' ')}</span>
                              <span className="text-[10px] text-zinc-600 font-mono">{new Date(entry.timestamp).toLocaleString()}</span>
                            </div>
                            {entry.details && (
                              <p className="text-xs text-zinc-400 mt-1">{entry.details}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2 text-[10px] text-zinc-600">
                              <User className="w-3 h-3" />
                              <span>{entry.userId?.slice(0, 8) || 'system'}...</span>
                              {entry.ip && <span className="font-mono">• {entry.ip}</span>}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-zinc-800 flex-shrink-0">
              <button
                onClick={loadAuditLog}
                disabled={isLoading}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
                Refresh
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
