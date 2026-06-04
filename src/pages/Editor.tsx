import React, { useRef, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AIAssistantSidebar } from '../components/AIAssistantSidebar';
import { EditableInvoice } from '../components/EditableInvoice';
import { SyncIndicator } from '../components/SyncIndicator';
import { useStore } from '../store/useStore';
import { TEMPLATES } from '../lib/templates';
import { EmailCompositionModal } from '../components/EmailCompositionModal';
import { AuditLogDrawer } from '../components/AuditLogDrawer';
import { AnalysisSuggestionCard } from '../components/AnalysisSuggestionCard';
import { RecurringBillingModal } from '../components/RecurringBillingModal';
import { Printer, Save, FileSignature, ArrowLeft, Palette, ZoomIn, ZoomOut, CheckCircle2, Undo2, Redo2, LayoutTemplate, Loader2, ChevronDown, Mail, Shield, CalendarClock, MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Invoice } from '../types';
import { apiClient } from '../lib/apiClient';

// Issue 6.2: CSS moved to external file — no more dangerouslySetInnerHTML
import '../styles/invoice-export.css';

function Dropdown({ options, value, onChange, placeholder }: { options: {value: string, label: string}[], value: string, onChange: (val: string) => void, placeholder: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = options.find(o => o.value === value) || options[0];

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-[#15171c]/50 sketched-border text-[#fcf6ba] font-serif italic text-sm p-3 flex justify-between items-center focus:outline-none focus:ring-1 focus:ring-[#bf953f] transition-all hover:shadow-[0_0_15px_rgba(191,149,63,0.1)]"
      >
        <span>{selected?.label || placeholder}</span>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} className="text-[#bf953f]"><ChevronDown className="w-4 h-4" /></motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            key="dropdown-menu"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 w-full mt-2 bg-[#15171c] border border-[#bf953f]/20 historical-shadow z-[100] max-h-60 overflow-auto custom-scrollbar"
          >
            {options.map(opt => (
              <button 
                key={opt.value}
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                className={`w-full text-left px-4 py-3 text-sm font-serif italic transition-colors ${value === opt.value ? 'text-[#bf953f] bg-[#bf953f]/10' : 'text-[#a09e91] hover:bg-[#1a1a1a] hover:text-[#fcf6ba]'}`}
              >
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { invoices, updateInvoice, undo, redo, history } = useStore();
  const printRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(0.8);
  
  const invoice = invoices.find(inv => inv.id === id);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfProgress, setPdfProgress] = useState<string>('');
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isAuditLogOpen, setIsAuditLogOpen] = useState(false);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  if (!invoice) {
    return <div className="flex h-screen items-center justify-center text-zinc-400">Invoice not found.</div>;
  }

  const handleHandleAIGeneration = (generatedData: Partial<Invoice>) => {
    updateInvoice(invoice.id, {
      ...generatedData,
      customerInfo: generatedData.customerInfo || invoice.customerInfo,
      items: generatedData.items?.length ? generatedData.items : invoice.items,
      taxRate: generatedData.taxRate !== undefined ? generatedData.taxRate : invoice.taxRate,
      notes: generatedData.notes !== undefined ? generatedData.notes : invoice.notes,
    });
  };

  const handlePrint = async () => {
    if (isGeneratingPDF) return;
    setIsGeneratingPDF(true);
    setPdfProgress('Validating invoice...');

    try {
      // ── Step 1: Validate invoice before export ──
      const validationRes = await apiClient(`/api/v1/invoices/${invoice.id}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice }),
      });

      if (validationRes.ok) {
        const validation = await validationRes.json();
        if (!validation.valid && invoice.status !== 'draft') {
          const errorMessages = validation.issues
            .filter((i: any) => i.severity === 'error')
            .map((i: any) => i.message)
            .join('\\n• ');
          alert(`Cannot export — please fix these issues:\\n\\n• ${errorMessages}`);
          return;
        }
      }

      // ── Step 2: Request server-side PDF ──
      setPdfProgress('Generating PDF...');

      const response = await apiClient(`/api/v1/invoices/${invoice.id}/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoice }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'PDF generation failed' }));
        throw new Error(errorData.error || `PDF generation failed (${response.status})`);
      }

      // ── Step 3: Download the PDF ──
      setPdfProgress('Downloading...');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.title || 'Invoice'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (error: any) {
      console.error('PDF export failed:', error);
      alert(`PDF export failed: ${error.message}`);
    } finally {
      setIsGeneratingPDF(false);
      setPdfProgress('');
    }
  };

  return (
    <div className="editor-layout flex h-screen overflow-hidden">
      {/* Left AI Sidebar */}
      <AIAssistantSidebar onGenerate={handleHandleAIGeneration} />

      {/* Main Area */}
      <div className="flex-1 min-w-0 flex flex-col h-full bg-[#0f1115] bg-texture-canvas">
        <header className="h-16 px-3 sm:px-6 flex justify-between items-center bg-[#15171c]/80 backdrop-blur-md border-b border-[#bf953f]/20 flex-shrink-0 z-10 shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition-all duration-200">
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-1 min-w-0">
            <button onClick={() => navigate('/')} className="text-[#a09e91] hover:text-[#fcf6ba] transition-colors bg-[#1a1a1a]/50 p-2 rounded-lg hover:bg-[#1a1a1a] flex-shrink-0 border border-transparent hover:border-[#bf953f]/30">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="hidden sm:block h-5 w-px bg-[#bf953f]/20 flex-shrink-0"></div>
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
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
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            {/* Desktop only tools */}
            <div className="hidden lg:flex items-center gap-3">
              <SyncIndicator />
              <div className="flex items-center gap-1 bg-[#0f1115] p-1 rounded-lg border border-[#bf953f]/20 mx-2">
                <button onClick={undo} disabled={history.past.length === 0} className="p-2 text-[#a09e91] hover:text-[#fcf6ba] hover:bg-[#1a1a1a] rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors" title="Undo">
                  <Undo2 className="w-4 h-4" />
                </button>
                <div className="h-4 w-px bg-[#bf953f]/20"></div>
                <button onClick={redo} disabled={history.future.length === 0} className="p-2 text-[#a09e91] hover:text-[#fcf6ba] hover:bg-[#1a1a1a] rounded disabled:opacity-30 disabled:hover:bg-transparent transition-colors" title="Redo">
                  <Redo2 className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => setIsAuditLogOpen(true)}
                className="p-2 text-[#a09e91] hover:text-[#bf953f] bg-[#1a1a1a]/50 hover:bg-[#1a1a1a] rounded-lg transition-colors border border-transparent hover:border-[#bf953f]/30"
                title="Audit Log"
              >
                <Shield className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsRecurringModalOpen(true)}
                className="p-2 text-[#a09e91] hover:text-[#bf953f] bg-[#1a1a1a]/50 hover:bg-[#1a1a1a] rounded-lg transition-colors border border-transparent hover:border-[#bf953f]/30"
                title="Recurring Billing"
              >
                <CalendarClock className="w-4 h-4" />
              </button>
            </div>

            {/* Always visible Primary Tools */}
            <button
              onClick={() => setIsEmailModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 p-2 sm:px-4 sm:py-2 text-xs font-serif font-bold italic text-[#bf953f] bg-[#bf953f]/10 border border-[#bf953f]/30 rounded-lg hover:bg-[#bf953f]/20 hover:text-[#fcf6ba] transition-colors"
              title="Email"
            >
              <Mail className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              <span className="hidden xl:inline">Email</span>
            </button>
            <button
              onClick={handlePrint}
              disabled={isGeneratingPDF}
              className="inline-flex items-center justify-center gap-2 p-2 sm:px-4 sm:py-2 text-xs font-serif font-bold italic text-[#0f1115] bg-gradient-to-r from-[#bf953f] to-[#aa771c] hover:from-[#fcf6ba] hover:to-[#bf953f] rounded-lg transition-colors shadow-[0_0_15px_rgba(191,149,63,0.3)] disabled:opacity-50"
              title="Export PDF"
            >
              {isGeneratingPDF ? <Loader2 className="w-4 h-4 sm:w-3.5 sm:h-3.5 animate-spin" /> : <Printer className="w-4 h-4 sm:w-3.5 sm:h-3.5" />}
              <span className="hidden xl:inline">{pdfProgress || 'Export PDF'}</span>
            </button>

            {/* Mobile More Menu */}
            <div className="relative lg:hidden">
              <button 
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                className="p-2 text-[#a09e91] hover:text-[#fcf6ba] bg-[#1a1a1a]/50 hover:bg-[#1a1a1a] rounded-lg transition-colors border border-transparent hover:border-[#bf953f]/30"
              >
                <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <AnimatePresence>
                {isMoreMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full right-0 mt-2 w-48 bg-[#15171c] border border-[#bf953f]/20 rounded-xl shadow-2xl z-[100] py-1 historical-shadow"
                  >
                    <div className="px-3 py-2 border-b border-[#bf953f]/20 flex justify-center">
                      <SyncIndicator />
                    </div>
                    <div className="flex justify-around px-3 py-2 border-b border-[#bf953f]/20">
                      <button onClick={undo} disabled={history.past.length === 0} className="p-2 text-[#a09e91] hover:text-[#fcf6ba] hover:bg-[#1a1a1a] rounded disabled:opacity-30 transition-colors" title="Undo">
                        <Undo2 className="w-4 h-4" />
                      </button>
                      <button onClick={redo} disabled={history.future.length === 0} className="p-2 text-[#a09e91] hover:text-[#fcf6ba] hover:bg-[#1a1a1a] rounded disabled:opacity-30 transition-colors" title="Redo">
                        <Redo2 className="w-4 h-4" />
                      </button>
                    </div>
                    <button 
                      onClick={() => { setIsAuditLogOpen(true); setIsMoreMenuOpen(false); }}
                      className="w-full text-left px-4 py-3 text-sm font-serif italic text-[#a09e91] hover:bg-[#1a1a1a] hover:text-[#fcf6ba] flex items-center gap-3 transition-colors"
                    >
                      <Shield className="w-4 h-4 text-[#bf953f]" />
                      Audit Log
                    </button>
                    <button 
                      onClick={() => { setIsRecurringModalOpen(true); setIsMoreMenuOpen(false); }}
                      className="w-full text-left px-4 py-3 text-sm font-serif italic text-[#a09e91] hover:bg-[#1a1a1a] hover:text-[#fcf6ba] flex items-center gap-3 transition-colors"
                    >
                      <CalendarClock className="w-4 h-4 text-[#bf953f]" />
                      Recurring Billing
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <div className="invoice-canvas-container flex-1 overflow-auto bg-[#0f1115]/80 relative custom-scrollbar">
          {/* Floating Zoom Controls */}
          <div className="fixed bottom-16 right-[340px] flex items-center bg-zinc-800 backdrop-blur-md rounded-full p-1.5 border border-zinc-700 shadow-2xl z-[100] print:hidden hidden md:flex">
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
                className="print:p-0 print:m-0 print-shadow-none h-max origin-top"
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
        
        <footer className="h-10 px-6 flex flex-shrink-0 items-center justify-between border-t border-[#bf953f]/20 bg-[#15171c] text-[10px] font-serif font-bold italic tracking-widest uppercase text-[#a09e91]">
          <div className="flex gap-4 items-center">
            {/* B-13 FIX: Dynamic sync status instead of static "Saved" */}
            <SyncIndicator />
            <span className="text-[#a09e91] hidden sm:inline">Invoice: {invoice.invoiceNumber}</span>
          </div>
        </footer>
      </div>

      {/* Right Properties Sidebar */}
      <div className="w-[320px] bg-[#15171c] flex flex-col h-full border-l border-[#bf953f]/20 flex-shrink-0 relative z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
         <div className="h-16 border-b border-[#bf953f]/20 flex items-center px-6 bg-[#15171c]/80 backdrop-blur-sm z-30">
           <label className="text-xs font-serif font-bold text-[#fcf6ba] uppercase tracking-widest flex items-center gap-2">
             <Palette className="w-4 h-4 text-[#bf953f]" /> Document Settings
           </label>
         </div>
         
         <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar relative">
           
           <div className="space-y-3 relative z-40">
             <span className="text-[10px] font-serif font-bold text-[#a09e91] uppercase tracking-widest">Design Family</span>
             <Dropdown 
               value={invoice.templateId}
               onChange={(val) => updateInvoice(invoice.id, { templateId: val })}
               placeholder="Select Template"
               options={TEMPLATES.map(tpl => ({ value: tpl.id, label: tpl.name }))}
             />
           </div>
           
           <div className="space-y-3 relative z-30">
             <span className="text-[10px] font-serif font-bold text-[#a09e91] uppercase tracking-widest">Accent Color</span>
             <div className="flex justify-between items-center bg-[#15171c]/50 p-3 sketched-border">
               <span className="text-sm font-serif italic text-[#fcf6ba]">Custom Color</span>
               <input type="color" className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer" value={invoice.themeColor} onChange={(e) => updateInvoice(invoice.id, { themeColor: e.target.value })} title="Custom Color" />
             </div>
             <div className="grid grid-cols-5 gap-3 bg-[#15171c]/50 p-4 sketched-border">
               {['#4f46e5', '#059669', '#ea580c', '#e11d48', '#7c3aed', '#0f172a', '#2563eb', '#16a34a', '#d97706', '#be123c'].map(color => (
                 <button 
                   key={color}
                   onClick={() => updateInvoice(invoice.id, { themeColor: color })}
                   className="w-full aspect-square rounded-lg border-2 transition-all hover:scale-110 flex items-center justify-center shadow-inner"
                   style={{ backgroundColor: color, borderColor: invoice.themeColor === color ? 'white' : 'transparent' }}
                 >
                    {invoice.themeColor === color && <CheckCircle2 className="w-4 h-4 text-white drop-shadow-md" />}
                 </button>
               ))}
             </div>
           </div>

           <div className="space-y-3 relative z-20">
             <span className="text-[10px] font-serif font-bold text-[#a09e91] uppercase tracking-widest flex items-center gap-2"><LayoutTemplate className="w-4 h-4 text-[#bf953f]" /> Document Modules</span>
             <div className="grid grid-cols-2 gap-3">
               {(function() {
                 const currentSettings = invoice.displaySettings || {
                   showTitle: true, showInvoiceId: true,
                   showLogo: true, showFrom: true, showBilledTo: true,
                   showIssueDate: true, showDueDate: true, showDiscount: true,
                   showTax: true, showShipping: true, showNotes: true, showPaymentMethods: true
                 };
                 return [
                   { key: 'showTitle', label: 'Invoice Title' },
                   { key: 'showInvoiceId', label: 'Invoice ID' },
                   { key: 'showLogo', label: 'Company Logo' },
                   { key: 'showFrom', label: 'From Address' },
                   { key: 'showBilledTo', label: 'Billed To Address' },
                   { key: 'showIssueDate', label: 'Issue Date' },
                   { key: 'showDueDate', label: 'Due Date' },
                   { key: 'showDiscount', label: 'Discount Row' },
                   { key: 'showTax', label: 'Tax Row' },
                   { key: 'showShipping', label: 'Shipping Row' },
                   { key: 'showNotes', label: 'Notes & Terms' },
                   { key: 'showPaymentMethods', label: 'Payment Box' },
                 ].map((module) => (
                   <button
                     key={module.key}
                     onClick={() => updateInvoice(invoice.id, { 
                       displaySettings: { 
                         ...currentSettings, 
                         [module.key]: !currentSettings[module.key as keyof typeof currentSettings] 
                       } 
                     })}
                     className={`p-3 sketched-border text-center transition-all ${
                       currentSettings[module.key as keyof typeof currentSettings] 
                         ? 'border-[#bf953f] bg-[#bf953f]/10 text-[#fcf6ba] shadow-[0_0_15px_rgba(191,149,63,0.1)]' 
                         : 'border-[#bf953f]/20 bg-[#15171c]/30 text-[#a09e91] hover:border-[#bf953f]/50 hover:text-[#fcf6ba]'
                     }`}
                   >
                     <span className="text-[10px] font-serif italic tracking-widest uppercase block truncate">{module.label}</span>
                   </button>
                 ));
               })()}
             </div>
           </div>
           
           <div className="space-y-3 relative z-10">
             <span className="text-[10px] font-serif font-bold text-[#a09e91] uppercase tracking-widest">Currency Profile</span>
             <Dropdown 
               value={invoice.currency}
               onChange={(val) => updateInvoice(invoice.id, { currency: val })}
               placeholder="Select Currency"
               options={[
                 { value: 'USD', label: 'USD ($) - United States' },
                 { value: 'EUR', label: 'EUR (€) - European Union' },
                 { value: 'GBP', label: 'GBP (£) - United Kingdom' },
                 { value: 'INR', label: 'INR (₹) - India' },
                 { value: 'AUD', label: 'AUD ($) - Australia' },
                 { value: 'CAD', label: 'CAD ($) - Canada' },
                 { value: 'JPY', label: 'JPY (¥) - Japan' },
                 { value: 'SGD', label: 'SGD ($) - Singapore' },
                 { value: 'AED', label: 'AED (د.إ) - UAE' },
               ]}
             />
           </div>
           
           <div className="pt-8 border-t border-[#bf953f]/20 relative z-0">
             <div className="space-y-3">
               <label className="text-[10px] font-serif font-bold text-[#a09e91] uppercase tracking-widest block">Document State</label>
               {/* Issue 2.4: Expanded status options for enterprise workflows */}
               <Dropdown 
                 value={invoice.status}
                 onChange={(val) => updateInvoice(invoice.id, { status: val as any })}
                 placeholder="Select State"
                 options={[
                   { value: 'draft', label: 'Draft - Unsent' },
                   { value: 'pending', label: 'Pending - Waiting Payment' },
                   { value: 'sent', label: 'Sent - Dispatched' },
                   { value: 'viewed', label: 'Viewed - Client Opened' },
                   { value: 'approved', label: 'Approved - Confirmed' },
                   { value: 'partially-paid', label: 'Partially Paid' },
                   { value: 'paid', label: 'Paid - Completed' },
                   { value: 'overdue', label: 'Overdue - Action Required' },
                   { value: 'in-review', label: 'In Review - Under Audit' },
                   { value: 'disputed', label: 'Disputed - Contested' },
                   { value: 'cancelled', label: 'Cancelled' },
                   { value: 'void', label: 'Void - Invalidated' },
                 ]}
               />
             </div>
           </div>
         </div>
      </div>

      <EmailCompositionModal 
        invoice={invoice} 
        isOpen={isEmailModalOpen} 
        onClose={() => setIsEmailModalOpen(false)} 
      />
      <AuditLogDrawer 
        invoiceId={invoice.id} 
        isOpen={isAuditLogOpen} 
        onClose={() => setIsAuditLogOpen(false)} 
      />
      <RecurringBillingModal
        invoice={invoice}
        isOpen={isRecurringModalOpen}
        onClose={() => setIsRecurringModalOpen(false)}
      />
    </div>
  );
}
