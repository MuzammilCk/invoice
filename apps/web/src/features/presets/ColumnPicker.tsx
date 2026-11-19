import { V1_COLUMNS, orderColumns, validateColumns } from './columns'
import { TableHeaderPreview } from './TableHeaderPreview'

interface ColumnPickerProps {
  selectedColumns: string[]
  onChange: (columns: string[]) => void
}

export function ColumnPicker({ selectedColumns, onChange }: ColumnPickerProps) {
  const validation = validateColumns(selectedColumns)

  function toggleColumn(columnId: string) {
    let updated: string[]
    if (selectedColumns.includes(columnId)) {
      updated = selectedColumns.filter((id) => id !== columnId)
    } else {
      updated = [...selectedColumns, columnId]
    }
    onChange(orderColumns(updated))
  }

  return (
    <div className="space-y-6">
      <TableHeaderPreview columns={selectedColumns} />

      {!validation.valid && validation.error && (
        <div
          role="alert"
          className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm font-medium flex items-center gap-2"
        >
          <span className="text-base">⚠️</span>
          <span>{validation.error}</span>
        </div>
      )}

      <div className="space-y-2">
        {V1_COLUMNS.map((col) => {
          const isChecked = selectedColumns.includes(col.id)
          const inputId = `col-toggle-${col.id}`

          return (
            <label
              key={col.id}
              htmlFor={inputId}
              className={`flex items-start gap-3 p-3.5 rounded-xl border transition-colors min-h-[44px] cursor-pointer select-none ${
                isChecked
                  ? 'bg-indigo-50/50 border-indigo-200'
                  : 'bg-white border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                id={inputId}
                type="checkbox"
                checked={isChecked}
                onChange={() => toggleColumn(col.id)}
                className="mt-1 h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-base font-semibold text-slate-900">
                    {col.label}
                  </span>
                  {(col.id === 'item' || col.id === 'rate') && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                      Required
                    </span>
                  )}
                  {col.id === 'amount' && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                      Computed
                    </span>
                  )}
                </div>
                {col.description && (
                  <p className="text-sm text-slate-500 mt-0.5">
                    {col.description}
                  </p>
                )}
              </div>
            </label>
          )
        })}
      </div>
    </div>
  )
}
