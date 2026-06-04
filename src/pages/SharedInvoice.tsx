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
    <div className="min-h-screen bg-[#0f1115] bg-texture-canvas font-sans text-[#fcf6ba]">
      {/* Portal Header */}
      <header className="sticky top-0 z-50 bg-[#15171c]/90 backdrop-blur-xl border-b border-[#bf953f]/20 historical-shadow">
        <div className="max-w-[900px] mx-auto px-4 sm:px-8 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-[#0f1115] font-serif font-black italic text-lg gold-gradient-text bg-gradient-to-br from-[#bf953f] to-[#aa771c] shadow-[0_0_15px_rgba(191,149,63,0.3)]">
                {(invoice.businessInfo?.name || 'I').charAt(0).toUpperCase()}
              </div>
              <h1 className="text-xl font-serif italic text-[#fcf6ba]">{invoice.title || 'Invoice'}</h1>
            </div>
            <div className="flex items-center gap-5 text-xs font-serif italic text-[#a09e91] tracking-widest uppercase">
              <span>#{(invoice.invoiceNumber || 'DRAFT').toUpperCase()}</span>
              {invoice.dueDate && (
                <span>Due: {new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(invoice.dueDate))}</span>
              )}
              <span className="flex items-center gap-1.5 opacity-70">
                <Eye className="w-3.5 h-3.5" /> Viewed
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleDownloadPDF}
              disabled={isDownloadingPDF}
              className="inline-flex items-center gap-2 px-5 py-3 bg-[#15171c] text-[#fcf6ba] font-serif italic text-sm sketched-border hover:text-[#bf953f] hover:border-[#bf953f]/50 transition-all shadow-lg disabled:opacity-50"
            >
              {isDownloadingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 text-[#bf953f]" />}
              Download PDF
            </button>
            
            {/* Razorpay Payment Stub */}
            {invoice.status === 'paid' ? (
              <div className="inline-flex items-center gap-2 px-5 py-3 bg-emerald-950/30 text-emerald-500 font-serif font-bold italic text-sm border border-emerald-900/50 shadow-[inset_0_0_15px_rgba(16,185,129,0.1)]">
                <CheckCircle2 className="w-4 h-4" />
                Paid
              </div>
            ) : (
              <button
                disabled={isPaying}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#bf953f] to-[#aa771c] text-[#0f1115] font-serif font-bold italic text-sm hover:from-[#fcf6ba] hover:to-[#bf953f] transition-all shadow-[0_0_20px_rgba(191,149,63,0.3)] disabled:opacity-50"
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
      <main className="max-w-[900px] mx-auto px-4 sm:px-8 py-10 sm:py-16">
        <div className="bg-[#fcf6ba] text-[#0f1115] shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden historical-shadow border-4 border-[#bf953f]/20 relative">
          {/* Da Vinci Canvas Texture Overlay for the white invoice area */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/white-wall.png')] mix-blend-multiply z-10"></div>
          <div className="relative z-0">
            <InvoicePreview invoice={invoice} />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center border-t border-[#bf953f]/10 pt-6">
          <p className="text-xs font-serif italic text-[#a09e91]">
            This invoice was shared securely via AI Invoice Studio. 
            <span className="text-[#bf953f]/50 ml-1 uppercase tracking-widest text-[10px]">Powered by local AI.</span>
          </p>
        </div>
      </main>
    </div>
  );
}
