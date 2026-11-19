export interface DesignOption {
  id: string
  name: string
  sample_preview_url: string
}

interface DesignPickerProps {
  designs: DesignOption[]
  selectedId: string
  onSelect: (designId: string) => void
}

export function DesignPicker({ designs, selectedId, onSelect }: DesignPickerProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {designs.map((design) => {
        const isSelected = design.id === selectedId

        return (
          <button
            key={design.id}
            type="button"
            role="button"
            aria-pressed={isSelected}
            aria-label={`Select ${design.name}`}
            onClick={() => onSelect(design.id)}
            className={`text-left rounded-2xl border-2 p-3 transition-all flex flex-col cursor-pointer min-h-[44px] ${
              isSelected
                ? 'border-indigo-600 bg-indigo-50/40 shadow-sm'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="aspect-[1/1.3] w-full bg-slate-100 rounded-xl overflow-hidden mb-3 border border-slate-200 flex items-center justify-center">
              <img
                src={design.sample_preview_url}
                alt={`${design.name} preview`}
                className="w-full h-full object-contain"
                onError={(e) => {
                  // Fallback placeholder if image not yet loaded
                  e.currentTarget.style.display = 'none'
                }}
              />
            </div>
            <div className="flex items-center justify-between w-full px-1">
              <span className="text-base font-semibold text-slate-900">
                {design.name}
              </span>
              {isSelected ? (
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold">
                  ✓
                </span>
              ) : (
                <span className="w-6 h-6 rounded-full border border-slate-300" />
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}
