import React, { useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AIAssistantSidebar } from '../components/AIAssistantSidebar';
import { EditableInvoice } from '../components/EditableInvoice';
import { useStore } from '../store/useStore';
import { ArrowLeft, ZoomIn, ZoomOut, Undo2, Redo2, Loader2, Printer } from 'lucide-react';
import { motion } from 'motion/react';
import { Invoice } from '../types';

import '../styles/invoice-export.css';

export function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { invoices, updateInvoice, undo, redo, history } = useStore();
  const printRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.8);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const invoice = invoices.find(inv => inv.id === id);

  if (!invoice) {
    return <div className="flex h-screen items-center justify-center text-zinc-400">Invoice not found.</div>;
  }

  const handleAIGeneration = (generatedData: Partial<Invoice>) => {
    updateInvoice(invoice.id, {
      ...generatedData,
      customerInfo: generatedData.customerInfo || invoice.customerInfo,
      items: generatedData.items?.length ? generatedData.items : invoice.items,
      notes: generatedData.notes !== undefined ? generatedData.notes : invoice.notes,
    });
  };

  const handlePrint = async () => {
    if (isGeneratingPDF) return;
    setIsGeneratingPDF(true);
    try {
      const response = await fetch(`/api/v1/generate-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'PDF generation failed' }));
        throw new Error(err.error || `PDF generation failed (${response.status})`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.invoiceNumber || 'Invoice'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      alert(`PDF export failed: ${error.message}`);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="editor-layout flex h-screen overflow-hidden">
      {/* Left Voice Sidebar */}
      <AIAssistantSidebar onGenerate={handleAIGeneration} />

      {/* Main Area */}
      <div className="flex-1 min-w-0 flex flex-col h-full bg-[#0f1115] bg-texture-canvas">
        <header className="h-16 px-3 sm:px-6 flex justify-between items-center bg-[#15171c]/80 backdrop-blur-md border-b border-[#bf953f]/20 flex-shrink-0 z-10 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-1 min-w-0">
            <button onClick={() => navigate('/')} className="text-[#a09e91] hover:text-[#fcf6ba] transition-colors bg-[#1a1a1a]/50 p-2 rounded-lg hover:bg-[#1a1a1a] flex-shrink-0 border border-transparent hover:border-[#bf953f]/30">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="hidden sm:block h-5 w-px bg-[#bf953f]/20 flex-shrink-0"></div>
            <input
              value={invoice.title}
              onChange={(e) => updateInvoice(invoice.id, { title: e.target.value })}
              className="bg-transparent text-lg font-serif italic font-bold text-[#fcf6ba] hover:bg-[#1a1a1a]/50 focus:bg-[#1a1a1a]/50 px-2 sm:px-3 py-1.5 rounded-lg outline-none transition-colors border border-transparent focus:border-[#bf953f]/50 w-full min-w-[60px] max-w-[12rem] md:max-w-[16rem] truncate"
              placeholder="Invoice Title"
            />
            <span className="inline-block px-2.5 py-1 rounded-sm text-[10px] font-serif font-bold italic uppercase tracking-widest bg-[#1a1a1a] text-[#bf953f] border border-[#bf953f]/30 flex-shrink-0">
              {invoice.status}
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            {/* Undo / Redo */}
            <div className="flex items-center gap-1 bg-[#0f1115] p-1 rounded-lg border border-[#bf953f]/20">
              <button onClick={undo} disabled={history.past.length === 0} className="p-2 text-[#a09e91] hover:text-[#fcf6ba] hover:bg-[#1a1a1a] rounded disabled:opacity-30 transition-colors" title="Undo">
                <Undo2 className="w-4 h-4" />
              </button>
              <div className="h-4 w-px bg-[#bf953f]/20"></div>
              <button onClick={redo} disabled={history.future.length === 0} className="p-2 text-[#a09e91] hover:text-[#fcf6ba] hover:bg-[#1a1a1a] rounded disabled:opacity-30 transition-colors" title="Redo">
                <Redo2 className="w-4 h-4" />
              </button>
            </div>

            {/* Export PDF */}
            <button
              onClick={handlePrint}
              disabled={isGeneratingPDF}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-serif font-bold italic text-[#0f1115] bg-gradient-to-r from-[#bf953f] to-[#aa771c] hover:from-[#fcf6ba] hover:to-[#bf953f] rounded-lg transition-colors shadow-[0_0_15px_rgba(191,149,63,0.3)] disabled:opacity-50"
              title="Export PDF"
            >
              {isGeneratingPDF ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
              <span>Export PDF</span>
            </button>
          </div>
        </header>

        <div className="invoice-canvas-container flex-1 overflow-auto bg-[#0f1115]/80 relative custom-scrollbar">
          {/* Zoom controls */}
          <div className="fixed bottom-8 right-8 flex items-center bg-zinc-800 backdrop-blur-md rounded-full p-1.5 border border-zinc-700 shadow-2xl z-[100] print:hidden">
            <button onClick={() => setZoom(Math.max(0.3, zoom - 0.1))} className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700 transition-colors">
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono w-14 text-center text-zinc-200 font-bold">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(Math.min(2, zoom + 0.1))} className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700 transition-colors">
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          <div className="w-full min-h-max flex justify-center py-16">
            <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.2s ease-out' }}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="print:p-0 print:m-0 h-max origin-top"
                ref={printRef}
              >
                <EditableInvoice
                  invoice={invoice}
                  updateInvoice={(updates) => updateInvoice(invoice.id, updates)}
                  isExporting={isGeneratingPDF}
                />
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
