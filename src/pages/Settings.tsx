import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Save, Building2, Shield } from 'lucide-react';

export function SettingsPage() {
  const { businessInfo, updateBusinessInfo } = useStore();
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex-1 min-h-screen bg-transparent text-zinc-100 p-8 overflow-y-auto relative">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-serif italic mb-1 gold-gradient-text">Settings</h1>
        <p className="text-sm text-[#a09e91] font-serif italic mb-8">Configure your business profile. These details appear on every invoice.</p>

        {/* Business Profile Section */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-[#bf953f]" />
            <h2 className="text-xl font-serif italic gold-gradient-text">Business Profile</h2>
          </div>
          <div className="space-y-4 bg-[#15171c]/50 rounded-[2rem] p-6 sketched-border historical-shadow">
            <div>
              <label className="block text-xs font-serif text-[#a09e91] mb-1.5 uppercase tracking-widest">Business Name</label>
              <input
                type="text"
                value={businessInfo.name}
                onChange={(e) => updateBusinessInfo({ ...businessInfo, name: e.target.value })}
                className="w-full bg-[#0f1115]/50 sketched-border px-4 py-3 text-sm text-[#fcf6ba] font-serif italic focus:outline-none focus:ring-1 focus:ring-[#bf953f] transition-all"
                placeholder="Your Business Name"
              />
            </div>
            <div>
              <label className="block text-xs font-serif text-[#a09e91] mb-1.5 uppercase tracking-widest">Address</label>
              <textarea
                value={businessInfo.address}
                onChange={(e) => updateBusinessInfo({ ...businessInfo, address: e.target.value })}
                rows={3}
                className="w-full bg-[#0f1115]/50 sketched-border px-4 py-3 text-sm text-[#fcf6ba] font-serif italic focus:outline-none focus:ring-1 focus:ring-[#bf953f] resize-none transition-all"
                placeholder="123 Business Street&#10;City, State, PIN"
              />
            </div>
            <div>
              <label className="block text-xs font-serif text-[#a09e91] mb-1.5 uppercase tracking-widest">Phone Numbers</label>
              <input
                type="text"
                value={(businessInfo as any).phone ?? ''}
                onChange={(e) => updateBusinessInfo({ ...businessInfo, phone: e.target.value } as any)}
                className="w-full bg-[#0f1115]/50 sketched-border px-4 py-3 text-sm text-[#fcf6ba] font-serif italic focus:outline-none focus:ring-1 focus:ring-[#bf953f] transition-all"
                placeholder="+91 98765 43210"
              />
            </div>
            <div>
              <label className="block text-xs font-serif text-[#a09e91] mb-1.5 uppercase tracking-widest">Footer Text</label>
              <input
                type="text"
                value={(businessInfo as any).footerText ?? ''}
                onChange={(e) => updateBusinessInfo({ ...businessInfo, footerText: e.target.value } as any)}
                className="w-full bg-[#0f1115]/50 sketched-border px-4 py-3 text-sm text-[#fcf6ba] font-serif italic focus:outline-none focus:ring-1 focus:ring-[#bf953f] transition-all"
                placeholder="Thank you for your business!"
              />
            </div>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#bf953f] to-[#aa771c] text-[#0f1115] font-serif font-black italic rounded-xl transition-all hover:from-[#fcf6ba] hover:to-[#bf953f]"
            >
              <Save className="w-4 h-4" />
              {saved ? 'Saved!' : 'Save Settings'}
            </button>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-red-500/80" />
            <h2 className="text-xl font-serif italic text-red-500/80">Danger Zone</h2>
          </div>
          <div className="bg-red-950/10 rounded-[2rem] p-6 border border-red-900/30 historical-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-serif italic font-bold text-red-400">Clear All Local Data</p>
                <p className="text-xs font-serif italic text-red-500/70 mt-1">Remove all invoices and settings from this browser.</p>
              </div>
              <button
                onClick={() => {
                  if (confirm('This will permanently delete all local data. Are you sure?')) {
                    localStorage.clear();
                    window.location.reload();
                  }
                }}
                className="px-5 py-2.5 bg-red-950/40 border border-red-900 text-red-500 rounded-xl hover:bg-red-900/40 transition-colors text-sm font-serif italic font-bold"
              >
                Clear Data
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
