import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { DesignPicker, DesignOption } from '../DesignPicker'

const mockDesigns: DesignOption[] = [
  {
    id: 'design1',
    name: 'Design 1 (Reference)',
    sample_preview_url: '/designs/design1/sample',
  },
]

describe('DesignPicker Component (BP 4.2)', () => {
  it('renders available designs with thumbnails and labels', () => {
    const onSelect = vi.fn()
    render(<DesignPicker designs={mockDesigns} selectedId="design1" onSelect={onSelect} />)

    expect(screen.getByText('Design 1 (Reference)')).toBeInTheDocument()
    const img = screen.getByRole('img', { name: /Design 1 \(Reference\) preview/i })
    expect(img).toHaveAttribute('src', '/designs/design1/sample')
  })

  it('calls onSelect when a design card is clicked', () => {
    const onSelect = vi.fn()
    render(<DesignPicker designs={mockDesigns} selectedId="design1" onSelect={onSelect} />)

    const card = screen.getByRole('button', { name: /Select Design 1/i })
    fireEvent.click(card)
    expect(onSelect).toHaveBeenCalledWith('design1')
  })

  it('marks the currently selected design with aria-pressed or checked state', () => {
    render(<DesignPicker designs={mockDesigns} selectedId="design1" onSelect={vi.fn()} />)
    const card = screen.getByRole('button', { name: /Select Design 1/i })
    expect(card).toHaveAttribute('aria-pressed', 'true')
  })
})
