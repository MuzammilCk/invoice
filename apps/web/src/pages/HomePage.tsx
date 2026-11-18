import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api/client'

interface HomePageProps {
  workspaceName?: string
}

export function HomePage({ workspaceName = 'My Business' }: HomePageProps) {
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await apiFetch('/auth/logout', { method: 'POST' })
    } finally {
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-4 py-3 sm:px-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">{workspaceName}</h1>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="h-11 min-h-[44px] px-3 text-sm text-slate-600 hover:text-slate-900 font-medium rounded-lg hover:bg-slate-100 transition-colors"
        >
          {loggingOut ? 'Signing out...' : 'Sign out'}
        </button>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center items-center text-center">
        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 text-2xl font-bold">
          📄
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          No invoices yet
        </h2>
        <p className="text-base text-slate-600 mb-6 max-w-md">
          Create your first invoice to get started. You can fill details step-by-step.
        </p>
        <button
          type="button"
          className="h-12 min-h-[44px] px-6 rounded-xl bg-indigo-600 text-white font-medium text-base hover:bg-indigo-700 active:bg-indigo-800 transition-colors cursor-pointer"
        >
          Create invoice
        </button>
      </main>
    </div>
  )
}
