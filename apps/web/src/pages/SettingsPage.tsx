import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { apiFetch, ApiException } from '../api/client'
import { PresetChips } from '../features/presets/PresetChips'

interface SettingsData {
  workspace_id: string
  name: string
  address_lines: string[]
  phones: string[]
  footer: string
  currency: string
  date_format: string
  help_improve_voice: boolean
  default_preset_id?: string
  default_preset?: {
    id: string
    design_id: string
    columns: string[]
  }
}

export function SettingsPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form fields
  const [name, setName] = useState('')
  const [addressLines, setAddressLines] = useState<string[]>([''])
  const [phones, setPhones] = useState<string[]>([''])
  const [footer, setFooter] = useState('')
  const [currency, setCurrency] = useState('₹')
  const [dateFormat, setDateFormat] = useState('DD MMMM YYYY')
  const [helpImproveVoice, setHelpImproveVoice] = useState(true)
  const [defaultPreset, setDefaultPreset] = useState<SettingsData['default_preset'] | undefined>(undefined)

  // PIN change
  const [newPin, setNewPin] = useState('')
  const [confirmNewPin, setConfirmNewPin] = useState('')

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await apiFetch<SettingsData>('/settings')
        setName(data.name || '')
        setAddressLines(data.address_lines?.length ? data.address_lines : [''])
        setPhones(data.phones?.length ? data.phones : [''])
        setFooter(data.footer || '')
        setCurrency(data.currency || '₹')
        setDateFormat(data.date_format || 'DD MMMM YYYY')
        setHelpImproveVoice(data.help_improve_voice ?? true)
        setDefaultPreset(data.default_preset)
      } catch {
        setMessage({ type: 'error', text: 'Failed to load settings.' })
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [])

  function handleAddressLineChange(index: number, val: string) {
    const updated = [...addressLines]
    updated[index] = val
    setAddressLines(updated)
  }

  function addAddressLine() {
    if (addressLines.length < 4) {
      setAddressLines([...addressLines, ''])
    }
  }

  function handlePhoneChange(index: number, val: string) {
    const updated = [...phones]
    updated[index] = val
    setPhones(updated)
  }

  function addPhone() {
    if (phones.length < 3) {
      setPhones([...phones, ''])
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setMessage({ type: 'error', text: 'Business name is required.' })
      return
    }

    if (newPin) {
      if (newPin.length < 4) {
        setMessage({ type: 'error', text: 'PIN must be at least 4 digits.' })
        return
      }
      if (newPin !== confirmNewPin) {
        setMessage({ type: 'error', text: 'PIN confirmation does not match.' })
        return
      }
    }

    setSaving(true)
    setMessage(null)

    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        address_lines: addressLines.map((l) => l.trim()).filter(Boolean),
        phones: phones.map((p) => p.trim()).filter(Boolean),
        footer: footer.trim(),
        currency,
        date_format: dateFormat,
        help_improve_voice: helpImproveVoice,
      }
      if (newPin) {
        payload.pin = newPin
      }

      await apiFetch('/settings', {
        method: 'PUT',
        body: JSON.stringify(payload),
      })

      setNewPin('')
      setConfirmNewPin('')
      setMessage({ type: 'success', text: 'Settings saved successfully.' })
    } catch (err) {
      if (err instanceof ApiException) {
        setMessage({ type: 'error', text: err.error.message || 'Failed to save settings.' })
      } else {
        setMessage({ type: 'error', text: 'Connection failed. Try again.' })
      }
    } finally {
      setSaving(false)
    }
  }

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
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="h-11 min-h-[44px] px-3 flex items-center justify-center text-slate-600 hover:text-slate-900 font-medium rounded-lg hover:bg-slate-100 transition-colors"
          >
            ← Back
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">Settings</h1>
        </div>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="h-11 min-h-[44px] px-3 text-sm text-slate-600 hover:text-slate-900 font-medium rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
        >
          {loggingOut ? 'Signing out...' : 'Sign out'}
        </button>
      </header>

      <main className="flex-1 max-w-xl w-full mx-auto p-4 sm:p-6 space-y-8">
        {loading ? (
          <div className="text-center py-8 text-sm text-slate-500">Loading settings...</div>
        ) : (
          <form onSubmit={handleSave} className="space-y-8">
            {message && (
              <div
                role="alert"
                className={`p-3 rounded-xl text-sm font-medium border ${
                  message.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
              >
                {message.text}
              </div>
            )}

            {/* Section 1: Business Profile */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-xs">
              <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                Business details
              </h2>

              <div>
                <label htmlFor="settings-name" className="block text-sm font-medium text-slate-700 mb-1">
                  Business name <span className="text-red-500">*</span>
                </label>
                <input
                  id="settings-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Address lines (max 4)
                </label>
                <div className="space-y-2">
                  {addressLines.map((line, idx) => (
                    <input
                      key={idx}
                      type="text"
                      value={line}
                      onChange={(e) => handleAddressLineChange(idx, e.target.value)}
                      placeholder={`Address line ${idx + 1}`}
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  ))}
                </div>
                {addressLines.length < 4 && (
                  <button
                    type="button"
                    onClick={addAddressLine}
                    className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer min-h-[44px] flex items-center"
                  >
                    + Add address line
                  </button>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Phone numbers (max 3)
                </label>
                <div className="space-y-2">
                  {phones.map((phone, idx) => (
                    <input
                      key={idx}
                      type="text"
                      value={phone}
                      onChange={(e) => handlePhoneChange(idx, e.target.value)}
                      placeholder={`Phone number ${idx + 1}`}
                      className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  ))}
                </div>
                {phones.length < 3 && (
                  <button
                    type="button"
                    onClick={addPhone}
                    className="mt-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer min-h-[44px] flex items-center"
                  >
                    + Add phone
                  </button>
                )}
              </div>

              <div>
                <label htmlFor="settings-footer" className="block text-sm font-medium text-slate-700 mb-1">
                  Invoice footer note
                </label>
                <input
                  id="settings-footer"
                  type="text"
                  value={footer}
                  onChange={(e) => setFooter(e.target.value)}
                  placeholder="Thank you for your business"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Section 2: Preset (Design & Columns) */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-xs">
              <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                Invoice design & columns
              </h2>
              <p className="text-sm text-slate-600">
                These settings determine the appearance and columns for your new invoices.
              </p>
              {defaultPreset && (
                <div className="pt-1">
                  <PresetChips
                    designName={defaultPreset.design_id === 'design1' ? 'Design 1' : defaultPreset.design_id}
                    columns={defaultPreset.columns}
                  />
                </div>
              )}
            </div>

            {/* Section 3: PIN Change */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-xs">
              <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                Change security PIN
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="settings-new-pin" className="block text-sm font-medium text-slate-700 mb-1">
                    New PIN
                  </label>
                  <input
                    id="settings-new-pin"
                    type="password"
                    inputMode="numeric"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="Leave blank to keep"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 tracking-wider text-center"
                  />
                </div>
                <div>
                  <label htmlFor="settings-confirm-pin" className="block text-sm font-medium text-slate-700 mb-1">
                    Confirm new PIN
                  </label>
                  <input
                    id="settings-confirm-pin"
                    type="password"
                    inputMode="numeric"
                    value={confirmNewPin}
                    onChange={(e) => setConfirmNewPin(e.target.value)}
                    placeholder="Leave blank to keep"
                    className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 tracking-wider text-center"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Voice Preferences */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4 shadow-xs">
              <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
                Voice recognition preferences
              </h2>
              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 min-h-[44px] cursor-pointer">
                <input
                  type="checkbox"
                  checked={helpImproveVoice}
                  onChange={(e) => setHelpImproveVoice(e.target.checked)}
                  className="mt-1 h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <div className="flex-1 text-sm text-slate-700">
                  <span className="font-semibold block text-slate-900 mb-0.5">
                    Help improve voice recognition
                  </span>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Voice clips are kept for 90 days to improve recognition and can be switched off.
                  </p>
                </div>
              </label>
            </div>

            {/* Save Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full h-12 min-h-[44px] rounded-xl bg-indigo-600 text-white font-medium text-base hover:bg-indigo-700 active:bg-indigo-800 transition-colors cursor-pointer"
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}
