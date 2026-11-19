import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ColumnPicker } from '../ColumnPicker'

describe('ColumnPicker Component (BP 4.3)', () => {
  it('renders all visible V1 columns with checkboxes and descriptions', () => {
    render(<ColumnPicker selectedColumns={['no', 'item', 'qty', 'rate', 'amount']} onChange={vi.fn()} />)

    expect(screen.getByRole('checkbox', { name: /^No\./i })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /^Item/i })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /^Qty/i })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /^Rate/i })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /^Amount/i })).toBeInTheDocument()

    // Off columns hidden in V1
    expect(screen.queryByRole('checkbox', { name: /^Unit/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: /^Disc %/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: /^Tax %/i })).not.toBeInTheDocument()
  })

  it('renders live table header preview in registry order', () => {
    render(<ColumnPicker selectedColumns={['amount', 'rate', 'no']} onChange={vi.fn()} />)
    const previewHeader = screen.getByTestId('table-header-preview')
    // Should display in registry order: No. -> Rate -> Amount
    expect(previewHeader).toHaveTextContent('No.')
    expect(previewHeader).toHaveTextContent('Rate')
    expect(previewHeader).toHaveTextContent('Amount')
  })

  it('displays inline rule error when selection is invalid', () => {
    // Missing Rate
    render(<ColumnPicker selectedColumns={['no', 'item']} onChange={vi.fn()} />)
    expect(screen.getByRole('alert')).toHaveTextContent(/Item and Rate are required/i)
  })

  it('displays inline error when Qty is present without Amount', () => {
    render(<ColumnPicker selectedColumns={['item', 'rate', 'qty']} onChange={vi.fn()} />)
    expect(screen.getByRole('alert')).toHaveTextContent(/Qty requires Amount/i)
  })

  it('calls onChange with updated columns when toggled', () => {
    const onChange = vi.fn()
    render(<ColumnPicker selectedColumns={['no', 'item', 'rate']} onChange={onChange} />)

    const noCheckbox = screen.getByRole('checkbox', { name: /^No\./i })
    fireEvent.click(noCheckbox)
    // Should uncheck 'no' and pass remaining
    expect(onChange).toHaveBeenCalledWith(['item', 'rate'])
  })
})
