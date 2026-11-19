import { useNavigate } from 'react-router-dom'

export function DraftStubPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 text-center">
        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
          🚀
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">
          Starting UI is ready!
        </h1>
        <p className="text-sm text-slate-600 leading-relaxed mb-6">
          Your business profile, design template, and column preset are configured.
          Interactive draft creation, row filling, and invoice lifecycle begin in <strong>S04 (Invoice Core)</strong>.
        </p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="w-full h-12 min-h-[44px] px-6 rounded-xl bg-indigo-600 text-white font-medium text-base hover:bg-indigo-700 active:bg-indigo-800 transition-colors cursor-pointer"
        >
          Back to home
        </button>
      </div>
    </div>
  )
}
