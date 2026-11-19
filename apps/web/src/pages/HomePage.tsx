import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { apiFetch } from '../api/client'
import { PresetChips } from '../features/presets/PresetChips'

interface PresetData {
  id: string
  name: string
  design_id: string
  columns: string[]
}

interface SettingsData {
  workspace_id: string
  name: string
  default_preset_id?: string
  default_preset?: PresetData
}

interface HomePageProps {
  workspaceName?: string
}

export function HomePage({ workspaceName }: HomePageProps) {
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await apiFetch<SettingsData>('/settings')
        setSettings(data)
      } catch {
        // Fall back gracefully
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [])

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await apiFetch('/auth/logout', { method: 'POST' })
    } finally {
      navigate('/login', { replace: true })
    }
  }

  const displayName = settings?.name || workspaceName || 'My Business'
  const activePreset = settings?.default_preset

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-4 py-3 sm:px-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">{displayName}</h1>
        <div className="flex items-center gap-2">
          <Link
            to="/settings"
            aria-label="Settings"
            className="h-11 min-h-[44px] px-3 flex items-center justify-center text-slate-600 hover:text-slate-900 font-medium rounded-lg hover:bg-slate-100 transition-colors"
          >
            <span className="text-lg mr-1.5" aria-hidden="true">
              ⚙️
            </span>
            <span className="text-sm">Settings</span>
          </Link>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="h-11 min-h-[44px] px-3 text-sm text-slate-600 hover:text-slate-900 font-medium rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            {loggingOut ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      </header>

      {/* Preset Chips Bar */}
      {activePreset && (
        <div className="bg-white border-b border-slate-200 py-2.5 px-4">
          <PresetChips
            designName={activePreset.design_id === 'design1' ? 'Design 1' : activePreset.design_id}
            columns={activePreset.columns}
          />
        </div>
      )}

      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center items-center text-center">
        {loading ? (
          <div className="text-sm text-slate-500">Loading...</div>
        ) : (
          <>
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
              onClick={() => navigate('/new/draft-stub')}
              className="h-12 min-h-[44px] px-6 rounded-xl bg-indigo-600 text-white font-medium text-base hover:bg-indigo-700 active:bg-indigo-800 transition-colors cursor-pointer"
            >
              Create invoice
            </button>
          </>
        )}
      </main>
    </div>
  )
}
