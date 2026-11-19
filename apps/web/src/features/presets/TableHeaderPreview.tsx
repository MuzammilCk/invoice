import { COLUMN_MAP, orderColumns } from './columns'

interface TableHeaderPreviewProps {
  columns: string[]
}

export function TableHeaderPreview({ columns }: TableHeaderPreviewProps) {
  const ordered = orderColumns(columns)

  return (
    <div
      data-testid="table-header-preview"
      className="w-full bg-slate-100 border border-slate-200 rounded-xl overflow-hidden p-3"
    >
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
        Live table header preview
      </div>
      <div className="flex border border-slate-300 rounded-lg overflow-x-auto bg-white shadow-xs">
        {ordered.map((colId) => {
          const col = COLUMN_MAP.get(colId)
          if (!col) return null

          const alignClass =
            col.align === 'center'
              ? 'text-center'
              : col.align === 'right'
              ? 'text-right'
              : 'text-left'

          const widthClass =
            col.id === 'item' ? 'flex-1 min-w-[120px]' : 'w-24 shrink-0'

          return (
            <div
              key={col.id}
              className={`px-3 py-2 text-xs font-bold text-slate-700 border-r border-slate-200 last:border-r-0 ${widthClass} ${alignClass}`}
            >
              {col.label}
            </div>
          )
        })}
      </div>
    </div>
  )
}
