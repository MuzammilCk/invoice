import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { TEMPLATES } from '../lib/templates';
import { SUPPORTED_CURRENCIES } from '../types';
import { Save, Building2, Palette, Globe, Shield, Database, LogOut, User, CheckCircle2 } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

export function SettingsPage() {
  const navigate = useNavigate();
  const { businessInfo, updateBusinessInfo, authUser, clearAuth, syncStatus, lastSyncedAt } = useStore();
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <div className="flex-1 min-h-screen bg-transparent text-zinc-100 p-8 overflow-y-auto relative">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-serif italic mb-1 gold-gradient-text">Settings</h1>
        <p className="text-sm text-[#a09e91] font-serif italic mb-8">Configure your business profile and application defaults.</p>

        {/* Account Section */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-[#bf953f]" />
            <h2 className="text-xl font-serif italic gold-gradient-text">Account</h2>
          </div>
          <div className="bg-[#15171c]/50 rounded-[2rem] p-6 sketched-border historical-shadow">
            {authUser ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#bf953f] to-[#aa771c] rounded-full flex items-center justify-center text-[#0f1115] font-serif font-black italic text-lg shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                    {authUser.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="font-serif italic font-bold text-[#fcf6ba]">{authUser.name}</p>
                    <p className="text-sm font-serif italic text-[#a09e91]">{authUser.email}</p>
                    <p className="text-[10px] text-[#bf953f] font-serif italic uppercase tracking-widest mt-1">ID: {authUser.id.slice(0, 8)}...</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-5 py-2.5 bg-red-950/20 border border-red-900/50 text-red-500 rounded-xl hover:bg-red-900/40 transition-colors text-sm font-serif italic font-bold flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="text-sm font-serif italic text-[#a09e91]">
                Not signed in. <button onClick={() => navigate('/login')} className="text-[#bf953f] hover:text-[#fcf6ba] font-bold">Sign in</button>
              </div>
            )}
          </div>
        </section>

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
                placeholder="123 Business Street, Suite 100"
              />
            </div>
            <div>
              <label className="block text-xs font-serif text-[#a09e91] mb-1.5 uppercase tracking-widest">Tax ID / GST / VAT</label>
              <input
                type="text"
                value={businessInfo.taxId}
                onChange={(e) => updateBusinessInfo({ ...businessInfo, taxId: e.target.value })}
                className="w-full bg-[#0f1115]/50 sketched-border px-4 py-3 text-sm text-[#fcf6ba] font-serif italic focus:outline-none focus:ring-1 focus:ring-[#bf953f] transition-all"
                placeholder="TAX-XXXXXXXX"
              />
            </div>
          </div>
        </section>

        {/* Invoice Defaults Section */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-5 h-5 text-[#bf953f]" />
            <h2 className="text-xl font-serif italic gold-gradient-text">Invoice Defaults</h2>
          </div>
          <div className="space-y-4 bg-[#15171c]/50 rounded-[2rem] p-6 sketched-border historical-shadow">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-serif text-[#a09e91] mb-1.5 uppercase tracking-widest">Default Currency</label>
                <select
                  className="w-full bg-[#0f1115]/50 sketched-border px-4 py-3 text-sm text-[#fcf6ba] font-serif italic focus:outline-none focus:ring-1 focus:ring-[#bf953f] transition-all"
                >
                  {['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'JPY', 'SGD', 'AED'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-serif text-[#a09e91] mb-1.5 uppercase tracking-widest">Default Tax Rate (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={0}
                  className="w-full bg-[#0f1115]/50 sketched-border px-4 py-3 text-sm text-[#fcf6ba] font-serif italic focus:outline-none focus:ring-1 focus:ring-[#bf953f] transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-serif text-[#a09e91] mb-1.5 uppercase tracking-widest">Default Template</label>
              <select
                className="w-full bg-[#0f1115]/50 sketched-border px-4 py-3 text-sm text-[#fcf6ba] font-serif italic focus:outline-none focus:ring-1 focus:ring-[#bf953f] transition-all"
              >
                {TEMPLATES.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* Cloud Sync Section */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-5 h-5 text-[#bf953f]" />
            <h2 className="text-xl font-serif italic gold-gradient-text">Cloud Sync</h2>
          </div>
          <div className="bg-[#15171c]/50 rounded-[2rem] p-6 sketched-border historical-shadow">
            {isSupabaseConfigured() ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-500 font-serif italic">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                  <span className="text-sm font-bold">Connected to Supabase</span>
                </div>
                <div className="text-xs font-serif italic text-[#a09e91] space-y-1">
                  <p>Status: <span className="text-[#fcf6ba] capitalize">{syncStatus}</span></p>
                  {lastSyncedAt && <p>Last synced: <span className="text-[#fcf6ba]">{new Date(lastSyncedAt).toLocaleString()}</span></p>}
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm font-serif italic text-[#a09e91] mb-3">Cloud sync is not configured. Data is stored locally only.</p>
                <p className="text-xs font-serif italic text-[#a09e91]/70 leading-relaxed">
                  Set <code className="bg-[#0f1115] border border-[#bf953f]/30 px-1.5 py-0.5 rounded-md text-[#bf953f]">VITE_SUPABASE_URL</code> and{' '}
                  <code className="bg-[#0f1115] border border-[#bf953f]/30 px-1.5 py-0.5 rounded-md text-[#bf953f]">VITE_SUPABASE_ANON_KEY</code> in your <code className="bg-[#0f1115] border border-[#bf953f]/30 px-1.5 py-0.5 rounded-md text-[#bf953f]">.env</code> file to enable cloud persistence.
                </p>
              </div>
            )}
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
                <p className="text-xs font-serif italic text-red-500/70 mt-1">Remove all invoices, settings, and cached data from this browser.</p>
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
