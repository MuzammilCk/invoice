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
  const { updateBusinessInfo } = useStore();
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
    localStorage.setItem('onboarding_complete', 'true');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-8">
      <div className="max-w-lg w-full">
        {/* Progress */}
        <div className="flex items-center gap-2 mb-12 justify-center">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                i <= step ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-500'
              }`}>
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-12 h-0.5 ${i < step ? 'bg-indigo-600' : 'bg-zinc-800'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Business Info */}
        {step === 0 && (
          <div className="space-y-6 animate-in fade-in">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-zinc-100">Welcome to AI Invoice Studio</h1>
              <p className="text-sm text-zinc-500 mt-2">Let's set up your business profile. This will appear on every invoice.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Business Name *</label>
              <input
                autoFocus
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Acme Corporation"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Address</label>
              <textarea
                value={businessAddress}
                onChange={e => setBusinessAddress(e.target.value)}
                rows={2}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="123 Business St, Suite 100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Tax ID / GST / VAT</label>
              <input
                value={taxId}
                onChange={e => setTaxId(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Optional"
              />
            </div>
          </div>
        )}

        {/* Step 2: Preferences */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-zinc-100">Set Your Defaults</h1>
              <p className="text-sm text-zinc-500 mt-2">These can be changed anytime in Settings.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2">Default Currency</label>
              <div className="grid grid-cols-3 gap-2">
                {['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD'].map(c => (
                  <button
                    key={c}
                    onClick={() => setSelectedCurrency(c)}
                    className={`py-2 rounded-lg text-sm font-semibold transition-colors ${
                      selectedCurrency === c
                        ? 'bg-indigo-600 text-white'
                        : 'bg-zinc-900 text-zinc-400 border border-zinc-700 hover:border-zinc-600'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-2">Preferred Template</label>
              <select
                value={selectedTemplate}
                onChange={e => setSelectedTemplate(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {TEMPLATES.map(t => (
                  <option key={t.id} value={t.id}>{t.name} — {t.description}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Step 3: Ready */}
        {step === 2 && (
          <div className="text-center animate-in fade-in">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-zinc-100">You're All Set!</h1>
            <p className="text-sm text-zinc-500 mt-2 max-w-sm mx-auto">
              Your business profile is saved. Start creating professional invoices with AI assistance.
            </p>
            <div className="mt-8 bg-zinc-900 rounded-xl p-4 border border-zinc-800 text-left">
              <p className="text-xs text-zinc-500 mb-2">Quick tips:</p>
              <ul className="text-xs text-zinc-400 space-y-1.5">
                <li>• Type natural language prompts to create invoices instantly</li>
                <li>• Use voice dictation in any language (Hindi, Tamil, Telugu, and 100+ more)</li>
                <li>• Switch between 20 professional templates</li>
                <li>• Export as vector PDF with selectable text</li>
              </ul>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-10">
          {step > 0 ? (
            <button
              onClick={() => setStep(s => s - 1)}
              className="px-6 py-2.5 text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Back
            </button>
          ) : <div />}

          {step < 2 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={step === 0 && !businessName.trim()}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="px-8 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
            >
              Start Creating <Sparkles className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
