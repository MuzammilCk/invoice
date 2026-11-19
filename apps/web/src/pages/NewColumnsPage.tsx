import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch, ApiException } from '../api/client'
import { ColumnPicker } from '../features/presets/ColumnPicker'
import { validateColumns } from '../features/presets/columns'

interface SettingsData {
  default_preset_id?: string
  default_preset?: {
    id: string
    columns: string[]
  }
}

export function NewColumnsPage() {
  const navigate = useNavigate()
  const [columns, setColumns] = useState<string[]>(['no', 'item', 'qty', 'rate', 'amount'])
  const [presetId, setPresetId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const settingsData = await apiFetch<SettingsData>('/settings')
        if (settingsData.default_preset) {
          setColumns(settingsData.default_preset.columns)
          setPresetId(settingsData.default_preset.id)
        }
      } catch {
        // Fall back gracefully
      }
    }
    loadData()
  }, [])

  async function handleSave() {
    const validation = validateColumns(columns)
    if (!validation.valid) {
      setError(validation.error || 'Invalid columns')
      return
    }

    setSaving(true)
    setError(null)

    try {
      if (presetId) {
        await apiFetch(`/presets/${presetId}`, {
          method: 'PUT',
          body: JSON.stringify({ columns }),
        })
      }
      navigate('/', { replace: true })
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.error.message || 'Failed to update columns')
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
        <h1 className="text-lg font-semibold text-slate-900">Change invoice columns</h1>
        <button
          onClick={() => navigate('/')}
          className="h-11 min-h-[44px] px-3 text-sm text-slate-600 hover:text-slate-900 font-medium rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </header>

      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 space-y-6">
        <p className="text-sm text-slate-600">
          Customize which columns appear in your items table.
        </p>

        {error && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium"
          >
            {error}
          </div>
        )}

        <ColumnPicker selectedColumns={columns} onChange={setColumns} />

        <div className="pt-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full h-12 min-h-[44px] rounded-xl bg-indigo-600 text-white font-medium text-base hover:bg-indigo-700 active:bg-indigo-800 transition-colors cursor-pointer"
          >
            {saving ? 'Saving...' : 'Save columns'}
          </button>
        </div>
      </main>
    </div>
  )
}
