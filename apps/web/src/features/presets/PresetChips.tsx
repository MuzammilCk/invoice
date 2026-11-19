import { Link } from 'react-router-dom'
import { COLUMN_MAP, orderColumns } from './columns'

interface PresetChipsProps {
  designName?: string
  columns: string[]
  onChangeDesign?: () => void
  onChangeColumns?: () => void
}

export function PresetChips({
  designName = 'Design 1',
  columns,
  onChangeDesign,
  onChangeColumns,
}: PresetChipsProps) {
  const orderedLabels = orderColumns(columns)
    .map((id) => COLUMN_MAP.get(id)?.label || id)
    .join(', ')

  return (
    <div className="flex flex-wrap gap-2.5 items-center justify-center">
      {/* Design Chip */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 min-h-[36px]">
        <span>Using {designName}</span>
        {onChangeDesign ? (
          <button
            type="button"
            onClick={onChangeDesign}
            className="text-indigo-600 font-semibold hover:underline cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2"
          >
            Change
          </button>
        ) : (
          <Link
            to="/new/design"
            className="text-indigo-600 font-semibold hover:underline cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2"
          >
            Change
          </Link>
        )}
      </div>

      {/* Columns Chip */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 min-h-[36px]">
        <span>Columns: {orderedLabels}</span>
        {onChangeColumns ? (
          <button
            type="button"
            onClick={onChangeColumns}
            className="text-indigo-600 font-semibold hover:underline cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2"
          >
            Change
          </button>
        ) : (
          <Link
            to="/new/columns"
            className="text-indigo-600 font-semibold hover:underline cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2"
          >
            Change
          </Link>
        )}
      </div>
    </div>
  )
}
