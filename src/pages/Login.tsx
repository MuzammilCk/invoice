import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Sparkles, Eye, EyeOff, Loader2, Mail, Lock, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export function LoginPage() {
  const navigate = useNavigate();
  const { setAuth, loadFromCloud } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store auth state in Zustand
      setAuth(
        { id: data.user.id, email: data.user.email, name: data.user.name },
        data.accessToken,
        data.refreshToken
      );

      // Load user's invoices from cloud
      try {
        await loadFromCloud();
      } catch (e) {
        // Non-fatal — user can still work offline
        console.warn('[login] Cloud sync failed:', e);
      }

      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1115] bg-texture-canvas flex relative overflow-hidden font-sans">
      
      {/* Left Art Panel (Hidden on Mobile) */}
      <div className="hidden md:flex md:w-1/2 relative flex-col justify-between p-12 border-r border-[#bf953f]/20 historical-shadow bg-[#15171c]/50">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1605721911519-3dfeb3be25e7?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
        
        <div className="relative z-10">
          <div className="w-16 h-16 bg-gradient-to-br from-[#1a1a1a] to-[#0f1115] rounded-2xl flex items-center justify-center font-serif font-black italic text-4xl gold-gradient-text gold-border historical-shadow mb-8">
            Da
          </div>
          <h1 className="text-5xl font-serif italic text-[#bf953f] leading-tight max-w-md">
            AI Invoice Studio <br/> Enterprise Billing.
          </h1>
        </div>
        
        <div className="relative z-10">
          <p className="font-serif italic text-[#a09e91] max-w-md">
            "Simplicity is the ultimate sophistication." <br/>
            <span className="text-xs tracking-widest uppercase opacity-50 mt-2 block">— Leonardo da Vinci</span>
          </p>
        </div>
      </div>

      {/* Right Login Panel */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="text-center md:text-left mb-10">
            <h2 className="text-3xl font-serif italic gold-gradient-text mb-2">Welcome Back</h2>
            <p className="text-[#a09e91] font-serif text-sm">Please sign in to your account.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-4 rounded-xl bg-red-950/20 border border-red-900/30 flex items-center gap-3 text-sm text-red-400 font-serif italic"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500/80" />
                {error}
              </motion.div>
            )}

            <div>
              <label htmlFor="login-email" className="block text-xs font-serif text-[#a09e91] mb-2 uppercase tracking-widest">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#bf953f]/50" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-[#15171c]/50 sketched-border pl-12 pr-4 py-4 text-sm text-[#fcf6ba] font-serif italic focus:outline-none focus:ring-1 focus:ring-[#bf953f] transition-all placeholder-[#bf953f]/30"
                  placeholder="you@company.com"
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-serif text-[#a09e91] mb-2 uppercase tracking-widest">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#bf953f]/50" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-[#15171c]/50 sketched-border pl-12 pr-12 py-4 text-sm text-[#fcf6ba] font-serif italic focus:outline-none focus:ring-1 focus:ring-[#bf953f] transition-all placeholder-[#bf953f]/30"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#bf953f]/50 hover:text-[#bf953f] transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full bg-gradient-to-r from-[#bf953f] to-[#aa771c] text-[#0f1115] font-serif font-bold italic py-4 rounded-2xl hover:from-[#fcf6ba] hover:to-[#bf953f] transition-all shadow-[0_0_20px_rgba(191,149,63,0.3)] disabled:opacity-50 flex items-center justify-center gap-2 text-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Sign In'
              )}
            </button>

            <div className="text-center mt-8">
              <p className="text-sm font-serif italic text-[#a09e91]">
                Don't have an account?{' '}
                <Link to="/register" className="text-[#bf953f] hover:text-[#fcf6ba] transition-colors underline decoration-[#bf953f]/30 underline-offset-4">
                  Create one
                </Link>
              </p>
            </div>

            {(import.meta as any).env?.DEV && (
              <div className="mt-8 p-4 rounded-2xl bg-[#15171c]/30 sketched-border border-[#bf953f]/10">
                <p className="text-xs text-[#a09e91] font-mono text-center">
                  Dev: admin@invoicestudio.local / admin123
                </p>
              </div>
            )}
          </form>
        </motion.div>
      </div>
    </div>
  );
}
