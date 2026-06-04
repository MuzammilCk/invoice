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
    <div className="flex-1 min-h-screen bg-[#0f1115] bg-texture-canvas text-[#fcf6ba] p-8 overflow-y-auto font-sans">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-serif italic gold-gradient-text">Clients</h1>
            <p className="text-sm font-serif italic text-[#a09e91] mt-2">{clients.length} client{clients.length !== 1 ? 's' : ''} across {invoices.length} invoices</p>
          </div>
        </div>

        {/* CRM Summary Stats */}
        {clients.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-[#15171c]/50 sketched-border p-5">
              <p className="text-[10px] font-serif font-bold uppercase tracking-widest text-[#a09e91] mb-2">Total Clients</p>
              <p className="text-2xl font-serif italic text-[#fcf6ba]">{clients.length}</p>
            </div>
            <div className="bg-[#15171c]/50 sketched-border p-5">
              <p className="text-[10px] font-serif font-bold uppercase tracking-widest text-[#a09e91] mb-2">Total Revenue</p>
              <p className="text-2xl font-serif italic text-[#fcf6ba]">{formatCurrency(totalRevenue, primaryCurrency)}</p>
            </div>
            <div className="bg-[#15171c]/50 sketched-border p-5">
              <p className="text-[10px] font-serif font-bold uppercase tracking-widest text-emerald-600 mb-2">Collected</p>
              <p className="text-2xl font-serif italic text-emerald-500">{formatCurrency(totalPaid, primaryCurrency)}</p>
            </div>
            <div className="bg-[#15171c]/50 sketched-border p-5">
              <p className="text-[10px] font-serif font-bold uppercase tracking-widest text-red-600 mb-2">Overdue</p>
              <p className="text-2xl font-serif italic text-red-500">{formatCurrency(totalOverdue, primaryCurrency)}</p>
            </div>
          </div>
        )}

        {/* Search + Sort */}
        <div className="flex gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#bf953f]/50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clients by name or email..."
              className="w-full bg-[#15171c]/50 sketched-border pl-12 pr-4 py-4 text-sm font-serif italic text-[#fcf6ba] focus:outline-none focus:ring-1 focus:ring-[#bf953f] transition-all placeholder-[#bf953f]/30"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-[#15171c]/50 sketched-border px-4 py-4 text-sm font-serif italic text-[#bf953f] focus:outline-none focus:ring-1 focus:ring-[#bf953f] cursor-pointer appearance-none"
          >
            <option value="revenue" className="bg-[#15171c]">Highest Revenue</option>
            <option value="name" className="bg-[#15171c]">Name A→Z</option>
            <option value="recent" className="bg-[#15171c]">Most Recent</option>
            <option value="invoices" className="bg-[#15171c]">Most Invoices</option>
          </select>
        </div>

        {/* Client Cards */}
        {filtered.length === 0 ? (
          <div className="text-center py-24 text-[#a09e91] bg-[#15171c]/30 sketched-border border-[#bf953f]/10">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-20 text-[#bf953f]" />
            <p className="text-sm font-serif italic">{searchQuery ? 'No clients match your search.' : 'No clients yet. Create your first invoice to get started.'}</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map((client, index) => (
              <motion.div
                key={client.email || client.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="bg-[#15171c]/50 sketched-border p-6 hover:shadow-[0_0_15px_rgba(191,149,63,0.1)] transition-all group cursor-pointer"
                onClick={() => {
                  // Navigate to the most recent invoice for this client
                  if (client.invoiceIds.length > 0) {
                    navigate(`/editor/${client.invoiceIds[client.invoiceIds.length - 1]}`);
                  }
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-5 flex-1 min-w-0">
                    {/* Avatar */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-serif font-black italic flex-shrink-0 border ${
                      client.totalOverdue > 0 ? 'bg-red-950/30 text-red-500 border-red-900/50' : 'bg-[#1a1a1a] text-[#bf953f] border-[#bf953f]/30'
                    }`}>
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-serif italic text-[#fcf6ba] truncate group-hover:text-[#bf953f] transition-colors">{client.name}</h3>
                        <ArrowUpRight className="w-4 h-4 text-[#bf953f]/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      {client.email && (
                        <div className="flex items-center gap-2 mt-2 text-xs font-serif italic text-[#a09e91]">
                          <Mail className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
                          <span className="truncate">{client.email}</span>
                        </div>
                      )}
                      {client.address && (
                        <div className="flex items-center gap-2 mt-1.5 text-xs font-serif italic text-[#a09e91]">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
                          <span className="truncate">{client.address.split('\n')[0]}</span>
                        </div>
                      )}

                      {/* Status badges */}
                      <div className="flex items-center gap-2 mt-4 flex-wrap">
                        {Object.entries(client.statuses).map(([status, count]) => (
                          <span key={status} className={`text-[10px] font-serif font-bold italic px-2.5 py-1 rounded-sm uppercase tracking-wider border ${
                            status === 'paid' ? 'bg-emerald-950/30 text-emerald-500 border-emerald-900/50' :
                            status === 'overdue' ? 'bg-red-950/30 text-red-500 border-red-900/50' :
                            status === 'sent' ? 'bg-indigo-950/30 text-indigo-400 border-indigo-900/50' :
                            'bg-[#1a1a1a]/50 text-[#a09e91] border-[#bf953f]/20'
                          }`}>
                            {count} {status}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Revenue + Health */}
                  <div className="text-right flex-shrink-0 ml-4 pt-1">
                    <p className="text-xl font-serif italic text-[#fcf6ba]">{formatCurrency(client.totalBilled, client.currency)}</p>
                    <div className={`flex items-center gap-1.5 mt-2 text-xs font-serif italic justify-end ${getPaymentHealthColor(client) === 'text-emerald-400' ? 'text-emerald-500' : getPaymentHealthColor(client) === 'text-red-400' ? 'text-red-500' : getPaymentHealthColor(client) === 'text-amber-400' ? 'text-amber-500' : 'text-[#a09e91]'}`}>
                      {client.totalOverdue > 0 ? (
                        <><AlertTriangle className="w-3.5 h-3.5" /> {formatCurrency(client.totalOverdue, client.currency)} overdue</>
                      ) : client.totalPaid === client.totalBilled && client.totalBilled > 0 ? (
                        <><CheckCircle2 className="w-3.5 h-3.5" /> Fully paid</>
                      ) : (
                        <><FileText className="w-3.5 h-3.5" /> {client.invoiceCount} invoice{client.invoiceCount !== 1 ? 's' : ''}</>
                      )}
                    </div>
                    <p className="text-[10px] font-serif italic text-[#bf953f]/70 mt-2 flex items-center gap-1.5 justify-end uppercase tracking-widest">
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
