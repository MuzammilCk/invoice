import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch, ApiException } from '../api/client'

export function LoginPage() {
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!pin) {
      setError('Enter your PIN to continue')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ pin }),
      })
      navigate('/', { replace: true })
    } catch (err) {
      if (err instanceof ApiException) {
        if (err.status === 401) {
          setError('Incorrect PIN. Try again.')
        } else if (err.status === 429) {
          setError(err.error.message || 'Too many attempts. Try again in 10 minutes.')
        } else if (err.error.code === 'PIN_NOT_SET') {
          setError('PIN has not been set up yet.')
        } else {
          setError(err.error.message || 'Could not sign in.')
        }
      } else {
        setError('Connection failed. Check your network.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 mb-2">
          Sign in
        </h1>
        <p className="text-base text-slate-600 mb-6">
          Enter your PIN to access your workspace.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="pin-input"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              PIN
            </label>
            <input
              id="pin-input"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              disabled={loading}
              autoFocus
              className="w-full px-4 h-12 text-center text-2xl tracking-widest rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-transparent transition-all disabled:opacity-50"
              placeholder="••••"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 min-h-[44px] flex items-center justify-center rounded-xl bg-indigo-600 text-white font-medium text-base hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  )
}
