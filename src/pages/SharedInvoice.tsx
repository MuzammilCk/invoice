import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Invoice } from '../types';
import { InvoicePreview } from '../components/InvoicePreview';
import { Loader2, AlertCircle, Download, CreditCard, Eye, CheckCircle2 } from 'lucide-react';

export function SharedInvoicePage() {
  const { token } = useParams<{ token: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [viewRecorded, setViewRecorded] = useState(false);

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

        // B-08: Record view event (fire-and-forget)
        if (!viewRecorded) {
          fetch(`/api/v1/shared/${token}/view`, { method: 'POST' }).catch(() => {});
          setViewRecorded(true);
        }
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

  const handleDownloadPDF = async () => {
    if (!token || isDownloadingPDF) return;
    setIsDownloadingPDF(true);
    try {
      const res = await fetch(`/api/v1/shared/${token}/pdf`);
      if (!res.ok) throw new Error('PDF download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice?.title || 'Invoice'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to download PDF. Please try again.');
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  const handlePay = async () => {
    if (!token || isPaying || !invoice) return;
    
    // Simulate payment gateway
    setIsPaying(true);
    try {
      const res = await fetch(`/api/v1/shared/${token}/pay`, { method: 'POST' });
      if (!res.ok) throw new Error('Payment failed');
      
      // Update local invoice state to show as paid
      setInvoice({ ...invoice, status: 'paid' });
    } catch (err) {
      alert('Payment processing failed. Please try again.');
    } finally {
      setIsPaying(false);
    }
  };

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

  // Compute a formatted total for the header
  const formatMoney = (amount: number) => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: invoice.currency || 'USD',
      }).format(amount);
    } catch {
      return `$${amount.toFixed(2)}`;
    }
  };

  const subtotal = invoice.items.reduce((sum, item) => sum + item.quantity * item.rate, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Portal Header */}
      <header className="sticky top-0 z-50 bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-800">
        <div className="max-w-[900px] mx-auto px-4 sm:px-8 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-serif italic text-sm" 
                   style={{ backgroundColor: invoice.themeColor || '#4f46e5' }}>
                {(invoice.businessInfo?.name || 'I').charAt(0).toUpperCase()}
              </div>
              <h1 className="text-lg font-semibold text-zinc-100">{invoice.title || 'Invoice'}</h1>
            </div>
            <div className="flex items-center gap-4 text-xs text-zinc-500">
              <span className="font-mono">#{(invoice.invoiceNumber || 'DRAFT').toUpperCase()}</span>
              {invoice.dueDate && (
                <span>Due: {new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(invoice.dueDate))}</span>
              )}
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" /> Viewed
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadPDF}
              disabled={isDownloadingPDF}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-zinc-900 font-bold text-sm rounded-xl hover:bg-zinc-200 transition-all shadow-lg shadow-white/10 disabled:opacity-50"
            >
              {isDownloadingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Download PDF
            </button>
            
            {/* Razorpay Payment Stub */}
            {invoice.status === 'paid' ? (
              <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 text-emerald-500 font-bold text-sm rounded-xl border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4" />
                Paid
              </div>
            ) : (
              <button
                disabled={isPaying}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white font-bold text-sm rounded-xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                onClick={handlePay}
              >
                {isPaying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                {isPaying ? 'Processing...' : 'Pay Now'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Invoice Content */}
      <main className="max-w-[900px] mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <div className="bg-white rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
          <InvoicePreview invoice={invoice} />
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-zinc-600">
            This invoice was shared securely via AI Invoice Studio. 
            <span className="text-zinc-500 ml-1">Powered by local AI.</span>
          </p>
        </div>
      </main>
    </div>
  );
}
