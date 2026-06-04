import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Building2, Palette, Sparkles, ArrowRight, Check } from 'lucide-react';
import { TEMPLATES } from '../lib/templates';

const STEPS = [
  { id: 'business', title: 'Your Business', icon: Building2 },
  { id: 'defaults', title: 'Preferences', icon: Palette },
  { id: 'ready', title: 'Ready!', icon: Sparkles },
] as const;

export function OnboardingPage() {
  const navigate = useNavigate();
  const { updateBusinessInfo, setOnboardingComplete } = useStore();
  const [step, setStep] = useState(0);
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [taxId, setTaxId] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('minimal-executive');
  const [selectedCurrency, setSelectedCurrency] = useState('USD');

  const handleComplete = () => {
    updateBusinessInfo({
      name: businessName,
      address: businessAddress,
      taxId,
    });
    // B-12 FIX: Use Zustand instead of localStorage
    setOnboardingComplete(true);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#0f1115] bg-texture-canvas flex items-center justify-center p-8 font-sans">
      <div className="max-w-lg w-full">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-12 justify-center">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-serif font-bold italic transition-colors border ${
                i <= step ? 'bg-[#bf953f]/10 border-[#bf953f] text-[#fcf6ba]' : 'bg-[#15171c]/50 border-[#bf953f]/20 text-[#a09e91]'
              }`}>
                {i < step ? <Check className="w-4 h-4 text-[#bf953f]" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-12 h-[1px] ${i < step ? 'bg-[#bf953f]/50' : 'bg-[#bf953f]/20'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Business Info */}
        {step === 0 && (
          <div className="space-y-6 animate-in fade-in">
            <div className="text-center mb-10">
              <h1 className="text-3xl font-serif italic gold-gradient-text">Welcome to Invoice Studio</h1>
              <p className="text-sm font-serif text-[#a09e91] mt-2">Let's set up your business profile. This will appear on every invoice.</p>
            </div>
            <div>
              <label className="block text-xs font-serif text-[#a09e91] mb-2 uppercase tracking-widest">Business Name *</label>
              <input
                autoFocus
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                className="w-full bg-[#15171c]/50 sketched-border px-4 py-4 text-sm text-[#fcf6ba] font-serif italic focus:outline-none focus:ring-1 focus:ring-[#bf953f] transition-all placeholder-[#bf953f]/30"
                placeholder="Acme Corporation"
              />
            </div>
            <div>
              <label className="block text-xs font-serif text-[#a09e91] mb-2 uppercase tracking-widest">Address</label>
              <textarea
                value={businessAddress}
                onChange={e => setBusinessAddress(e.target.value)}
                rows={2}
                className="w-full bg-[#15171c]/50 sketched-border px-4 py-4 text-sm text-[#fcf6ba] font-serif italic focus:outline-none focus:ring-1 focus:ring-[#bf953f] transition-all placeholder-[#bf953f]/30 resize-none"
                placeholder="123 Business St, Suite 100"
              />
            </div>
            <div>
              <label className="block text-xs font-serif text-[#a09e91] mb-2 uppercase tracking-widest">Tax ID / GST / VAT</label>
              <input
                value={taxId}
                onChange={e => setTaxId(e.target.value)}
                className="w-full bg-[#15171c]/50 sketched-border px-4 py-4 text-sm text-[#fcf6ba] font-serif italic focus:outline-none focus:ring-1 focus:ring-[#bf953f] transition-all placeholder-[#bf953f]/30"
                placeholder="Optional"
              />
            </div>
          </div>
        )}

        {/* Step 2: Preferences */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in">
            <div className="text-center mb-10">
              <h1 className="text-3xl font-serif italic gold-gradient-text">Set Your Defaults</h1>
              <p className="text-sm font-serif text-[#a09e91] mt-2">These can be changed anytime in Settings.</p>
            </div>
            <div>
              <label className="block text-xs font-serif text-[#a09e91] mb-2 uppercase tracking-widest">Default Currency</label>
              <div className="grid grid-cols-3 gap-3">
                {['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD'].map(c => (
                  <button
                    key={c}
                    onClick={() => setSelectedCurrency(c)}
                    className={`py-3 text-sm font-serif italic transition-all sketched-border ${
                      selectedCurrency === c
                        ? 'bg-gradient-to-r from-[#bf953f] to-[#aa771c] text-[#0f1115] font-bold shadow-[0_0_15px_rgba(191,149,63,0.2)]'
                        : 'bg-[#15171c]/50 text-[#a09e91] hover:text-[#fcf6ba]'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-serif text-[#a09e91] mb-2 uppercase tracking-widest">Preferred Template</label>
              <select
                value={selectedTemplate}
                onChange={e => setSelectedTemplate(e.target.value)}
                className="w-full bg-[#15171c]/50 sketched-border px-4 py-4 text-sm text-[#fcf6ba] font-serif italic focus:outline-none focus:ring-1 focus:ring-[#bf953f] transition-all appearance-none cursor-pointer"
              >
                {TEMPLATES.map(t => (
                  <option key={t.id} value={t.id} className="bg-[#15171c] text-[#fcf6ba]">{t.name} — {t.description}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Step 3: Ready */}
        {step === 2 && (
          <div className="text-center animate-in fade-in">
            <div className="w-20 h-20 bg-gradient-to-br from-[#1a1a1a] to-[#0f1115] rounded-2xl flex items-center justify-center mx-auto mb-8 gold-border historical-shadow">
              <Sparkles className="w-10 h-10 text-[#bf953f]" />
            </div>
            <h1 className="text-3xl font-serif italic gold-gradient-text">You're All Set!</h1>
            <p className="text-sm font-serif text-[#a09e91] mt-3 max-w-sm mx-auto">
              Your business profile is saved. Start creating professional invoices with AI assistance.
            </p>
            <div className="mt-8 bg-[#15171c]/50 p-6 sketched-border text-left">
              <p className="text-xs font-serif text-[#a09e91] mb-3 uppercase tracking-widest">Quick tips:</p>
              <ul className="text-sm font-serif text-[#fcf6ba] space-y-2 italic opacity-80">
                <li>• Type natural language prompts to create invoices instantly</li>
                <li>• Use voice dictation in any language (Hindi, Tamil, Telugu, and 100+ more)</li>
                <li>• Switch between 20 professional templates</li>
                <li>• Export as vector PDF with selectable text</li>
              </ul>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-12">
          {step > 0 ? (
            <button
              onClick={() => setStep(s => s - 1)}
              className="px-6 py-3 text-sm font-serif italic text-[#a09e91] hover:text-[#fcf6ba] transition-colors underline decoration-[#bf953f]/30 underline-offset-4"
            >
              Back
            </button>
          ) : <div />}

          {step < 2 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={step === 0 && !businessName.trim()}
              className="px-8 py-3 bg-gradient-to-r from-[#bf953f] to-[#aa771c] hover:from-[#fcf6ba] hover:to-[#bf953f] text-[#0f1115] rounded-xl text-sm font-serif font-bold italic flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(191,149,63,0.2)] disabled:opacity-50"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="px-8 py-3 bg-gradient-to-r from-[#bf953f] to-[#aa771c] hover:from-[#fcf6ba] hover:to-[#bf953f] text-[#0f1115] rounded-xl text-sm font-serif font-bold italic flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(191,149,63,0.3)]"
            >
              Start Creating <Sparkles className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
