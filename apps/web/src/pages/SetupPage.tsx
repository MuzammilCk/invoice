import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch, ApiException } from '../api/client'
import { DesignPicker, DesignOption } from '../features/presets/DesignPicker'
import { ColumnPicker } from '../features/presets/ColumnPicker'
import { validateColumns } from '../features/presets/columns'

export function SetupPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Step 1: Profile
  const [name, setName] = useState('')
  const [addressLines, setAddressLines] = useState<string[]>([''])
  const [phones, setPhones] = useState<string[]>([''])
  const [footer, setFooter] = useState('')

  // Step 2: Design
  const [designs, setDesigns] = useState<DesignOption[]>([
    {
      id: 'design1',
      name: 'Design 1 (Reference)',
      sample_preview_url: '/designs/design1/sample',
    },
  ])
  const [selectedDesignId, setSelectedDesignId] = useState('design1')

  // Step 3: Columns
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    'no',
    'item',
    'qty',
    'rate',
    'amount',
  ])

  // Step 4: PIN & Voice
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [helpImproveVoice, setHelpImproveVoice] = useState(true)

  useEffect(() => {
    async function loadDesigns() {
      try {
        const data = await apiFetch<DesignOption[]>('/designs')
        if (Array.isArray(data) && data.length > 0) {
          setDesigns(data)
        }
      } catch {
        // Fall back to default
      }
    }
    loadDesigns()
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

  function handleStep1Next() {
    if (!name.trim()) {
      setError('Business name is required')
      return
    }
    setError(null)
    setStep(2)
  }

  function handleStep2Next() {
    setError(null)
    setStep(3)
  }

  function handleStep3Next() {
    const validation = validateColumns(selectedColumns)
    if (!validation.valid) {
      setError(validation.error || 'Invalid columns')
      return
    }
    setError(null)
    setStep(4)
  }

  async function handleFinish(e: React.FormEvent) {
    e.preventDefault()
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits')
      return
    }
    if (pin !== confirmPin) {
      setError('PIN confirmation does not match')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      await apiFetch('/setup', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          address_lines: addressLines.map((l) => l.trim()).filter(Boolean),
          phones: phones.map((p) => p.trim()).filter(Boolean),
          footer: footer.trim(),
          currency: '₹',
          date_format: 'DD MMMM YYYY',
          design_id: selectedDesignId,
          columns: selectedColumns,
          pin,
          help_improve_voice: helpImproveVoice,
        }),
      })
      navigate('/', { replace: true })
    } catch (err) {
      if (err instanceof ApiException) {
        setError(err.error.message || 'Setup failed')
      } else {
        setError('Connection failed. Try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
        {/* Progress indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
            <span>
              {step === 1 && 'Step 1 of 4: Business details'}
              {step === 2 && 'Step 2 of 4: Pick a design'}
              {step === 3 && 'Step 3 of 4: Choose columns'}
              {step === 4 && 'Step 4 of 4: Set PIN and voice'}
            </span>
            <span>{step} / 4</span>
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium"
          >
            {error}
          </div>
        )}

        {/* Step 1: Business Profile */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label
                htmlFor="biz-name"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Business name <span className="text-red-500">*</span>
              </label>
              <input
                id="biz-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Kerala Wood Works"
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Address lines (up to 4)
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
                  + Add another address line
                </button>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Phone numbers (up to 3)
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
                  + Add another phone
                </button>
              )}
            </div>

            <div>
              <label
                htmlFor="biz-footer"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Invoice footer note (optional)
              </label>
              <input
                id="biz-footer"
                type="text"
                value={footer}
                onChange={(e) => setFooter(e.target.value)}
                placeholder="e.g. Thank you for your business"
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="pt-4">
              <button
                type="button"
                onClick={handleStep1Next}
                className="w-full h-12 min-h-[44px] rounded-xl bg-indigo-600 text-white font-medium text-base hover:bg-indigo-700 active:bg-indigo-800 transition-colors cursor-pointer"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Design */}
        {step === 2 && (
          <div className="space-y-6">
            <p className="text-sm text-slate-600">
              Select the invoice template style you want to use. You can change this anytime later.
            </p>
            <DesignPicker
              designs={designs}
              selectedId={selectedDesignId}
              onSelect={setSelectedDesignId}
            />
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 h-12 min-h-[44px] rounded-xl border border-slate-300 text-slate-700 font-medium text-base hover:bg-slate-50 cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleStep2Next}
                className="flex-1 h-12 min-h-[44px] rounded-xl bg-indigo-600 text-white font-medium text-base hover:bg-indigo-700 active:bg-indigo-800 transition-colors cursor-pointer"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Columns */}
        {step === 3 && (
          <div className="space-y-6">
            <p className="text-sm text-slate-600">
              Choose the columns on your invoice items table.
            </p>
            <ColumnPicker
              selectedColumns={selectedColumns}
              onChange={setSelectedColumns}
            />
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 h-12 min-h-[44px] rounded-xl border border-slate-300 text-slate-700 font-medium text-base hover:bg-slate-50 cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleStep3Next}
                className="flex-1 h-12 min-h-[44px] rounded-xl bg-indigo-600 text-white font-medium text-base hover:bg-indigo-700 active:bg-indigo-800 transition-colors cursor-pointer"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 4: PIN and Voice */}
        {step === 4 && (
          <form onSubmit={handleFinish} className="space-y-4">
            <div>
              <label
                htmlFor="setup-pin"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                PIN (at least 4 digits) <span className="text-red-500">*</span>
              </label>
              <input
                id="setup-pin"
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 tracking-widest text-center"
              />
            </div>

            <div>
              <label
                htmlFor="setup-confirm-pin"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Confirm PIN <span className="text-red-500">*</span>
              </label>
              <input
                id="setup-confirm-pin"
                type="password"
                inputMode="numeric"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                placeholder="••••"
                className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 tracking-widest text-center"
              />
            </div>

            <div className="pt-2">
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

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={submitting}
                className="flex-1 h-12 min-h-[44px] rounded-xl border border-slate-300 text-slate-700 font-medium text-base hover:bg-slate-50 cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 h-12 min-h-[44px] rounded-xl bg-indigo-600 text-white font-medium text-base hover:bg-indigo-700 active:bg-indigo-800 transition-colors cursor-pointer"
              >
                {submitting ? 'Setting up...' : 'Finish setup'}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  )
}
