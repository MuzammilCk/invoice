import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch, ApiException } from '../api/client'
import { DesignPicker, DesignOption } from '../features/presets/DesignPicker'

interface SettingsData {
  default_preset_id?: string
  default_preset?: {
    id: string
    design_id: string
  }
}

export function NewDesignPage() {
  const navigate = useNavigate()
  const [designs, setDesigns] = useState<DesignOption[]>([
    {
      id: 'design1',
      name: 'Design 1 (Reference)',
      sample_preview_url: '/designs/design1/sample',
    },
  ])
  const [selectedId, setSelectedId] = useState('design1')
  const [presetId, setPresetId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const [designsData, settingsData] = await Promise.all([
          apiFetch<DesignOption[]>('/designs'),
          apiFetch<SettingsData>('/settings'),
        ])
        if (Array.isArray(designsData) && designsData.length > 0) {
          setDesigns(designsData)
        }
        if (settingsData.default_preset) {
          setSelectedId(settingsData.default_preset.design_id)
          setPresetId(settingsData.default_preset.id)
        }
      } catch {
        // Fall back gracefully
      }
    }
    loadData()
  }, [])

  async function handleSave() {
    setSaving(true)
    setError(null)

    try {
      if (presetId) {
        await apiFetch(`/presets/${presetId}`, {
          method: 'PUT',
          body: JSON.stringify({ design_id: selectedId }),
        })
      }
      navigate('/', { replace: true })
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.error.message || 'Failed to update design')
      } else {
        setError('Connection failed. Try again.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-4 py-3 sm:px-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Change invoice design</h1>
        <button
          onClick={() => navigate('/')}
          className="h-11 min-h-[44px] px-3 text-sm text-slate-600 hover:text-slate-900 font-medium rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </header>

      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 space-y-6">
        <p className="text-sm text-slate-600">
          Pick the visual style for your invoices. Changes apply to newly created invoices.
        </p>

        {error && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium"
          >
            {error}
          </div>
        )}

        <DesignPicker
          designs={designs}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />

        <div className="pt-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full h-12 min-h-[44px] rounded-xl bg-indigo-600 text-white font-medium text-base hover:bg-indigo-700 active:bg-indigo-800 transition-colors cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save design'}
          </button>
        </div>
      </main>
    </div>
  )
}
