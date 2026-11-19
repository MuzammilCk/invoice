import { describe, it, expect } from 'vitest'
import {
  COLUMN_REGISTRY,
  V1_COLUMNS,
  validateColumns,
  orderColumns,
  resolveTotalColumn,
} from '../columns'

describe('Column Registry & Validation (BP 3.3, 3.4)', () => {
  it('defines 8 registry items in exact order', () => {
    expect(COLUMN_REGISTRY.map((c) => c.id)).toEqual([
      'no',
      'item',
      'qty',
      'unit',
      'rate',
      'discount',
      'tax',
      'amount',
    ])
  })

  it('filters visible V1 columns correctly', () => {
    expect(V1_COLUMNS.map((c) => c.id)).toEqual(['no', 'item', 'qty', 'rate', 'amount'])
  })

  it('enforces Item and Rate as mandatory (BP 3.4 rule 1)', () => {
    const res1 = validateColumns(['no', 'qty', 'amount'])
    expect(res1.valid).toBe(false)
    expect(res1.error).toContain('Item and Rate are required')

    const res2 = validateColumns(['item'])
    expect(res2.valid).toBe(false)
    expect(res2.error).toContain('Item and Rate are required')

    const res3 = validateColumns(['rate'])
    expect(res3.valid).toBe(false)
    expect(res3.error).toContain('Item and Rate are required')
  })

  it('enforces Qty and Amount paired rule (BP 3.4 rule 2)', () => {
    const res1 = validateColumns(['item', 'rate', 'qty'])
    expect(res1.valid).toBe(false)
    expect(res1.error).toContain('Qty requires Amount')

    const res2 = validateColumns(['item', 'rate', 'amount'])
    expect(res2.valid).toBe(false)
    expect(res2.error).toContain('Amount requires Qty')
  })

  it('enforces maximum 6 columns (BP 3.4 rule 4)', () => {
    const res = validateColumns(['no', 'item', 'qty', 'unit', 'rate', 'discount', 'amount'])
    expect(res.valid).toBe(false)
    expect(res.error).toContain('At most 6 columns')
  })

  it('validates correct column sets', () => {
    expect(validateColumns(['item', 'rate']).valid).toBe(true)
    expect(validateColumns(['no', 'item', 'rate']).valid).toBe(true)
    expect(validateColumns(['no', 'item', 'qty', 'rate', 'amount']).valid).toBe(true)
  })

  it('orders columns by registry order (BP 3.4 rule 4)', () => {
    expect(orderColumns(['amount', 'rate', 'no', 'item', 'qty'])).toEqual([
      'no',
      'item',
      'qty',
      'rate',
      'amount',
    ])
    expect(orderColumns(['rate', 'item'])).toEqual(['item', 'rate'])
  })

  it('resolves total column dynamically (BP 3.4 rule 3)', () => {
    expect(resolveTotalColumn(['no', 'item', 'qty', 'rate', 'amount'])).toBe('amount')
    expect(resolveTotalColumn(['item', 'rate'])).toBe('rate')
  })
})
