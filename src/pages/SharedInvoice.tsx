import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Invoice } from '../types';
import { Loader2, AlertCircle } from 'lucide-react';

export function SharedInvoicePage() {
  const { token } = useParams<{ token: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchShared() {
      try {
        const res = await fetch(`/api/v1/shared/${token}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: 'Failed to load shared invoice' }));
          throw new Error(errData.error || 'Failed to load shared invoice');
        }
        const data = await res.json();
        setInvoice(data.invoice);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      fetchShared();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
        <p className="text-zinc-400">Loading invoice...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h1 className="text-xl font-bold text-zinc-100 mb-2">Unavailable</h1>
        <p className="text-zinc-400">{error || 'Invoice not found.'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-4 sm:p-8 flex justify-center overflow-auto">
      <div className="w-full max-w-[800px] bg-white rounded-lg shadow-xl overflow-hidden self-start">
        {/* We would render the actual invoice HTML/Preview here. For now, a placeholder */}
        <div className="p-8 text-zinc-900">
          <h1 className="text-3xl font-bold mb-2">{invoice.title || 'Invoice'}</h1>
          <p className="text-zinc-500 mb-8">{invoice.invoiceNumber}</p>
          <div className="bg-zinc-100 p-4 rounded-md mb-4 text-sm font-mono whitespace-pre-wrap">
            {JSON.stringify(invoice, null, 2)}
          </div>
        </div>
      </div>
    </div>
  );
}
