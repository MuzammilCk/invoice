import React, { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Mail, MapPin, FileText, TrendingUp, Clock, CheckCircle2, AlertTriangle, ArrowUpRight } from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';
import { computeInvoiceTotals } from '../lib/calculations';
import { motion } from 'motion/react';

interface ClientSummary {
  name: string;
  email: string;
  address: string;
  invoiceCount: number;
  totalBilled: number;
  totalPaid: number;
  totalOverdue: number;
  currency: string;
  lastInvoiceDate: string;
  invoiceIds: string[];
  statuses: Record<string, number>;
}

export function ClientsPage() {
  const { invoices } = useStore();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'revenue' | 'name' | 'recent' | 'invoices'>('revenue');

  // Extract unique clients from all invoices with enriched CRM data
  const clients = useMemo<ClientSummary[]>(() => {
    const clientMap = new Map<string, ClientSummary>();

    for (const invoice of invoices) {
      const key = invoice.customerInfo.email?.toLowerCase() || invoice.customerInfo.name?.toLowerCase() || '';
      if (!key) continue;

      const existing = clientMap.get(key);
      const total = computeInvoiceTotals(invoice).grandTotal;
      const status = invoice.status || 'draft';

      if (existing) {
        existing.invoiceCount++;
        existing.totalBilled += total;
        existing.invoiceIds.push(invoice.id);
        existing.statuses[status] = (existing.statuses[status] || 0) + 1;
        if (status === 'paid') existing.totalPaid += total;
        if (status === 'overdue') existing.totalOverdue += total;
        if (invoice.issueDate > existing.lastInvoiceDate) {
          existing.lastInvoiceDate = invoice.issueDate;
        }
      } else {
        clientMap.set(key, {
          name: invoice.customerInfo.name || 'Unknown',
          email: invoice.customerInfo.email || '',
          address: invoice.customerInfo.address || '',
          invoiceCount: 1,
          totalBilled: total,
          totalPaid: status === 'paid' ? total : 0,
          totalOverdue: status === 'overdue' ? total : 0,
          currency: invoice.currency,
          lastInvoiceDate: invoice.issueDate,
          invoiceIds: [invoice.id],
          statuses: { [status]: 1 },
        });
      }
    }

    const arr = Array.from(clientMap.values());
    switch (sortBy) {
      case 'name': return arr.sort((a, b) => a.name.localeCompare(b.name));
      case 'recent': return arr.sort((a, b) => new Date(b.lastInvoiceDate).getTime() - new Date(a.lastInvoiceDate).getTime());
      case 'invoices': return arr.sort((a, b) => b.invoiceCount - a.invoiceCount);
      default: return arr.sort((a, b) => b.totalBilled - a.totalBilled);
    }
  }, [invoices, sortBy]);

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Aggregate stats
  const totalRevenue = clients.reduce((s, c) => s + c.totalBilled, 0);
  const totalPaid = clients.reduce((s, c) => s + c.totalPaid, 0);
  const totalOverdue = clients.reduce((s, c) => s + c.totalOverdue, 0);
  const primaryCurrency = clients[0]?.currency || 'USD';

  const getPaymentHealthColor = (client: ClientSummary) => {
    if (client.totalOverdue > 0) return 'text-red-400';
    const paidRatio = client.totalBilled > 0 ? client.totalPaid / client.totalBilled : 0;
    if (paidRatio >= 0.8) return 'text-emerald-400';
    if (paidRatio >= 0.5) return 'text-amber-400';
    return 'text-zinc-400';
  };

  return (
    <div className="flex-1 min-h-screen bg-zinc-950 text-zinc-100 p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Clients</h1>
            <p className="text-sm text-zinc-500 mt-1">{clients.length} client{clients.length !== 1 ? 's' : ''} across {invoices.length} invoices</p>
          </div>
        </div>

        {/* CRM Summary Stats */}
        {clients.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Total Clients</p>
              <p className="text-2xl font-bold text-zinc-100">{clients.length}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1">Total Revenue</p>
              <p className="text-2xl font-bold text-zinc-100">{formatCurrency(totalRevenue, primaryCurrency)}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-1">Collected</p>
              <p className="text-2xl font-bold text-emerald-400">{formatCurrency(totalPaid, primaryCurrency)}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-red-500 mb-1">Overdue</p>
              <p className="text-2xl font-bold text-red-400">{formatCurrency(totalOverdue, primaryCurrency)}</p>
            </div>
          </div>
        )}

        {/* Search + Sort */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clients by name or email..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-zinc-600"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="revenue">Highest Revenue</option>
            <option value="name">Name A→Z</option>
            <option value="recent">Most Recent</option>
            <option value="invoices">Most Invoices</option>
          </select>
        </div>

        {/* Client Cards */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-zinc-500 bg-zinc-900/40 rounded-3xl border border-zinc-800/50 border-dashed">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-sm">{searchQuery ? 'No clients match your search.' : 'No clients yet. Create your first invoice to get started.'}</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((client, index) => (
              <motion.div
                key={client.email || client.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-all group cursor-pointer"
                onClick={() => {
                  // Navigate to the most recent invoice for this client
                  if (client.invoiceIds.length > 0) {
                    navigate(`/editor/${client.invoiceIds[client.invoiceIds.length - 1]}`);
                  }
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      client.totalOverdue > 0 ? 'bg-red-500/20 text-red-400' : 'bg-indigo-500/20 text-indigo-400'
                    }`}>
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-zinc-100 truncate group-hover:text-indigo-400 transition-colors">{client.name}</h3>
                        <ArrowUpRight className="w-3.5 h-3.5 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      {client.email && (
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-500">
                          <Mail className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{client.email}</span>
                        </div>
                      )}
                      {client.address && (
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-500">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{client.address.split('\n')[0]}</span>
                        </div>
                      )}

                      {/* Status badges */}
                      <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                        {Object.entries(client.statuses).map(([status, count]) => (
                          <span key={status} className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            status === 'paid' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' :
                            status === 'overdue' ? 'bg-red-500/15 text-red-400 border border-red-500/25' :
                            status === 'sent' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/25' :
                            'bg-zinc-800 text-zinc-400 border border-zinc-700'
                          }`}>
                            {count} {status}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Revenue + Health */}
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-base font-bold text-zinc-100">{formatCurrency(client.totalBilled, client.currency)}</p>
                    <div className={`flex items-center gap-1 mt-1 text-xs justify-end ${getPaymentHealthColor(client)}`}>
                      {client.totalOverdue > 0 ? (
                        <><AlertTriangle className="w-3 h-3" /> {formatCurrency(client.totalOverdue, client.currency)} overdue</>
                      ) : client.totalPaid === client.totalBilled && client.totalBilled > 0 ? (
                        <><CheckCircle2 className="w-3 h-3" /> Fully paid</>
                      ) : (
                        <><FileText className="w-3 h-3" /> {client.invoiceCount} invoice{client.invoiceCount !== 1 ? 's' : ''}</>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-600 mt-1.5 flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" />
                      {formatDate(client.lastInvoiceDate)}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
