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
    <div className="flex-1 min-h-screen bg-zinc-950 text-zinc-100 p-8 overflow-y-auto">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Settings</h1>
        <p className="text-sm text-zinc-500 mb-8">Configure your business profile and application defaults.</p>

        {/* Account Section */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold">Account</h2>
          </div>
          <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
            {authUser ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {authUser.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-100">{authUser.name}</p>
                    <p className="text-sm text-zinc-500">{authUser.email}</p>
                    <p className="text-[10px] text-zinc-600 font-mono mt-1">ID: {authUser.id.slice(0, 8)}...</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="text-sm text-zinc-400">
                Not signed in. <button onClick={() => navigate('/login')} className="text-indigo-400 hover:text-indigo-300 font-medium">Sign in</button>
              </div>
            )}
          </div>
        </section>

        {/* Business Profile Section */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold">Business Profile</h2>
          </div>
          <div className="space-y-4 bg-zinc-900 rounded-xl p-6 border border-zinc-800">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Business Name</label>
              <input
                type="text"
                value={businessInfo.name}
                onChange={(e) => updateBusinessInfo({ ...businessInfo, name: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Your Business Name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Address</label>
              <textarea
                value={businessInfo.address}
                onChange={(e) => updateBusinessInfo({ ...businessInfo, address: e.target.value })}
                rows={3}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                placeholder="123 Business Street, Suite 100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Tax ID / GST / VAT</label>
              <input
                type="text"
                value={businessInfo.taxId}
                onChange={(e) => updateBusinessInfo({ ...businessInfo, taxId: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="TAX-XXXXXXXX"
              />
            </div>
          </div>
        </section>

        {/* Invoice Defaults Section */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold">Invoice Defaults</h2>
          </div>
          <div className="space-y-4 bg-zinc-900 rounded-xl p-6 border border-zinc-800">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Default Currency</label>
                <select
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'JPY', 'SGD', 'AED'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Default Tax Rate (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={0}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">Default Template</label>
              <select
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
            <Database className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold">Cloud Sync</h2>
          </div>
          <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
            {isSupabaseConfigured() ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-400">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                  <span className="text-sm">Connected to Supabase</span>
                </div>
                <div className="text-xs text-zinc-500 space-y-1">
                  <p>Status: <span className="text-zinc-300 capitalize">{syncStatus}</span></p>
                  {lastSyncedAt && <p>Last synced: <span className="text-zinc-300">{new Date(lastSyncedAt).toLocaleString()}</span></p>}
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-zinc-400 mb-3">Cloud sync is not configured. Data is stored locally only.</p>
                <p className="text-xs text-zinc-500">
                  Set <code className="bg-zinc-800 px-1 rounded">VITE_SUPABASE_URL</code> and{' '}
                  <code className="bg-zinc-800 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> in your <code className="bg-zinc-800 px-1 rounded">.env</code> file to enable cloud persistence.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Danger Zone */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-red-400" />
            <h2 className="text-lg font-semibold text-red-400">Danger Zone</h2>
          </div>
          <div className="bg-zinc-900 rounded-xl p-6 border border-red-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-200">Clear All Local Data</p>
                <p className="text-xs text-zinc-500 mt-0.5">Remove all invoices, settings, and cached data from this browser.</p>
              </div>
              <button
                onClick={() => {
                  if (confirm('This will permanently delete all local data. Are you sure?')) {
                    localStorage.clear();
                    window.location.reload();
                  }
                }}
                className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors text-sm font-medium"
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
