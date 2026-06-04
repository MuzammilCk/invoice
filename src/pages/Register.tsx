import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Sparkles, Eye, EyeOff, Loader2, Mail, Lock, User, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

const PASSWORD_REQUIREMENTS = [
  { label: '8+ characters', test: (p: string) => p.length >= 8 },
  { label: 'Contains a number', test: (p: string) => /\d/.test(p) },
  { label: 'Contains uppercase', test: (p: string) => /[A-Z]/.test(p) },
];

export function RegisterPage() {
  const navigate = useNavigate();
  const { setAuth } = useStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isPasswordValid = PASSWORD_REQUIREMENTS.every(r => r.test(password));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !name || !isPasswordValid) return;

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Auto-login after successful registration
      setAuth(
        { id: data.user.id, email: data.user.email, name: data.user.name },
        data.accessToken,
        data.refreshToken
      );

      // New user → go to onboarding
      navigate('/onboarding');
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

      {/* Right Register Panel */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 lg:p-12 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md py-12"
        >
          <div className="text-center md:text-left mb-10">
            <h2 className="text-3xl font-serif italic gold-gradient-text mb-2">Create Account</h2>
            <p className="text-[#a09e91] font-serif text-sm">Start building enterprise invoices with AI.</p>
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
              <label htmlFor="register-name" className="block text-xs font-serif text-[#a09e91] mb-2 uppercase tracking-widest">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#bf953f]/50" />
                <input
                  id="register-name"
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-[#15171c]/50 sketched-border pl-12 pr-4 py-4 text-sm text-[#fcf6ba] font-serif italic focus:outline-none focus:ring-1 focus:ring-[#bf953f] transition-all placeholder-[#bf953f]/30"
                  placeholder="John Doe"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label htmlFor="register-email" className="block text-xs font-serif text-[#a09e91] mb-2 uppercase tracking-widest">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#bf953f]/50" />
                <input
                  id="register-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-[#15171c]/50 sketched-border pl-12 pr-4 py-4 text-sm text-[#fcf6ba] font-serif italic focus:outline-none focus:ring-1 focus:ring-[#bf953f] transition-all placeholder-[#bf953f]/30"
                  placeholder="you@company.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="register-password" className="block text-xs font-serif text-[#a09e91] mb-2 uppercase tracking-widest">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#bf953f]/50" />
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-[#15171c]/50 sketched-border pl-12 pr-12 py-4 text-sm text-[#fcf6ba] font-serif italic focus:outline-none focus:ring-1 focus:ring-[#bf953f] transition-all placeholder-[#bf953f]/30"
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
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

              {/* Password strength indicator */}
              {password.length > 0 && (
                <div className="mt-4 space-y-2">
                  {PASSWORD_REQUIREMENTS.map((req) => (
                    <div key={req.label} className="flex items-center gap-2 text-xs font-serif italic">
                      {req.test(password) ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#bf953f]" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-[#bf953f]/30" />
                      )}
                      <span className={req.test(password) ? 'text-[#fcf6ba]' : 'text-[#a09e91]'}>{req.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !email || !password || !name || !isPasswordValid}
              className="w-full bg-gradient-to-r from-[#bf953f] to-[#aa771c] text-[#0f1115] font-serif font-bold italic py-4 rounded-2xl hover:from-[#fcf6ba] hover:to-[#bf953f] transition-all shadow-[0_0_20px_rgba(191,149,63,0.3)] disabled:opacity-50 flex items-center justify-center gap-2 text-lg mt-6"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>

            <div className="text-center mt-8">
              <p className="text-sm font-serif italic text-[#a09e91]">
                Already have an account?{' '}
                <Link to="/login" className="text-[#bf953f] hover:text-[#fcf6ba] transition-colors underline decoration-[#bf953f]/30 underline-offset-4">
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
