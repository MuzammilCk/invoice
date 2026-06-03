import React, { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { Search, Users, Mail, MapPin, FileText } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { computeInvoiceTotals } from '../lib/calculations';

interface ClientSummary {
  name: string;
  email: string;
  address: string;
  invoiceCount: number;
  totalBilled: number;
  currency: string;
  lastInvoiceDate: string;
}

export function ClientsPage() {
  const { invoices } = useStore();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  // Extract unique clients from all invoices
  const clients = useMemo<ClientSummary[]>(() => {
    const clientMap = new Map<string, ClientSummary>();

    for (const invoice of invoices) {
      const key = invoice.customerInfo.email?.toLowerCase() || invoice.customerInfo.name?.toLowerCase() || '';
      if (!key) continue;

      const existing = clientMap.get(key);
      const total = computeInvoiceTotals(invoice).grandTotal;

      if (existing) {
        existing.invoiceCount++;
        existing.totalBilled += total;
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
          currency: invoice.currency,
          lastInvoiceDate: invoice.issueDate,
        });
      }
    }

    return Array.from(clientMap.values()).sort((a, b) => b.totalBilled - a.totalBilled);
  }, [invoices]);

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 min-h-screen bg-zinc-950 text-zinc-100 p-8 overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Clients</h1>
            <p className="text-sm text-zinc-500 mt-1">{clients.length} client{clients.length !== 1 ? 's' : ''} from your invoices</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search clients by name or email..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-zinc-600"
          />
        </div>

        {/* Client Cards */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-sm">{searchQuery ? 'No clients match your search.' : 'No clients yet. Create your first invoice to get started.'}</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((client, index) => (
              <div key={index} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors group">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-zinc-100">{client.name}</h3>
                    {client.email && (
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-500">
                        <Mail className="w-3 h-3" />
                        {client.email}
                      </div>
                    )}
                    {client.address && (
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-500">
                        <MapPin className="w-3 h-3" />
                        {client.address.split('\n')[0]}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold text-zinc-100">{formatCurrency(client.totalBilled, client.currency)}</p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-zinc-500 justify-end">
                      <FileText className="w-3 h-3" />
                      {client.invoiceCount} invoice{client.invoiceCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
