/**
 * Shared column registry and validation rules (BP 3.3, 3.4).
 */

export type ColumnKind = 'serial' | 'text' | 'number' | 'money' | 'percent'
export type FilledBy = 'auto' | 'voice' | 'computed'
export type ColumnAlign = 'left' | 'center' | 'right'

export interface ColumnRegistryItem {
  id: string
  label: string
  kind: ColumnKind
  filled_by: FilledBy
  width: string
  align: ColumnAlign
  version1: boolean
  description?: string
}

export const COLUMN_REGISTRY: ColumnRegistryItem[] = [
  {
    id: 'no',
    label: 'No.',
    kind: 'serial',
    filled_by: 'auto',
    width: 'fixed, narrow',
    align: 'center',
    version1: true,
    description: 'Automatic sequential item numbering',
  },
  {
    id: 'item',
    label: 'Item',
    kind: 'text',
    filled_by: 'voice',
    width: 'flexible, wraps',
    align: 'left',
    version1: true,
    description: 'Description of product or service (required)',
  },
  {
    id: 'qty',
    label: 'Qty',
    kind: 'number',
    filled_by: 'voice',
    width: 'fixed',
    align: 'right',
    version1: true,
    description: 'Number of units / quantity',
  },
  {
    id: 'unit',
    label: 'Unit',
    kind: 'text',
    filled_by: 'voice',
    width: 'fixed',
    align: 'left',
    version1: false,
    description: 'Unit of measurement (e.g. kg, pcs)',
  },
  {
    id: 'rate',
    label: 'Rate',
    kind: 'money',
    filled_by: 'voice',
    width: 'fixed',
    align: 'right',
    version1: true,
    description: 'Price per piece / unit (required)',
  },
  {
    id: 'discount',
    label: 'Disc %',
    kind: 'percent',
    filled_by: 'voice',
    width: 'fixed',
    align: 'right',
    version1: false,
    description: 'Line item percentage discount',
  },
  {
    id: 'tax',
    label: 'Tax %',
    kind: 'percent',
    filled_by: 'voice',
    width: 'fixed',
    align: 'right',
    version1: false,
    description: 'Line item GST or tax percentage',
  },
  {
    id: 'amount',
    label: 'Amount',
    kind: 'money',
    filled_by: 'computed',
    width: 'fixed',
    align: 'right',
    version1: true,
    description: 'Total amount calculated as Qty × Rate',
  },
]

export const COLUMN_MAP = new Map<string, ColumnRegistryItem>(
  COLUMN_REGISTRY.map((c) => [c.id, c]),
)

export const REGISTRY_ORDER: string[] = COLUMN_REGISTRY.map((c) => c.id)

export const V1_COLUMNS = COLUMN_REGISTRY.filter((c) => c.version1)

export function orderColumns(columnIds: string[]): string[] {
  const chosen = new Set(columnIds)
  return REGISTRY_ORDER.filter((id) => chosen.has(id))
}

export function resolveTotalColumn(columnIds: string[]): string {
  return columnIds.includes('amount') ? 'amount' : 'rate'
}

export interface ValidationResult {
  valid: boolean
  error?: string
}

export function validateColumns(columnIds: string[]): ValidationResult {
  if (!columnIds || columnIds.length === 0) {
    return { valid: false, error: 'At least one column is required.' }
  }

  const unknown = columnIds.filter((id) => !COLUMN_MAP.has(id))
  if (unknown.length > 0) {
    return { valid: false, error: `Unknown column(s): ${unknown.join(', ')}` }
  }

  const unique = Array.from(new Set(columnIds))
  if (unique.length > 6) {
    return { valid: false, error: 'At most 6 columns are permitted.' }
  }

  if (!unique.includes('item') || !unique.includes('rate')) {
    return { valid: false, error: 'Item and Rate are required.' }
  }

  const hasQty = unique.includes('qty')
  const hasAmount = unique.includes('amount')
  if (hasQty && !hasAmount) {
    return { valid: false, error: 'Qty requires Amount.' }
  }
  if (hasAmount && !hasQty) {
    return { valid: false, error: 'Amount requires Qty and Rate.' }
  }

  return { valid: true }
}
