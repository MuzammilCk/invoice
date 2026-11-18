import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { HomePage } from '../HomePage'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('HomePage', () => {
  it('displays empty state message and create invoice button (AC11)', () => {
    render(
      <MemoryRouter>
        <HomePage workspaceName="Test Store" />
      </MemoryRouter>,
    )

    expect(screen.getByText('Test Store')).toBeInTheDocument()
    expect(screen.getByText('No invoices yet')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Create invoice/i })).toBeInTheDocument()
  })

  it('signs out and navigates to /login', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'ok' }),
      } as Response),
    )

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    const signoutBtn = screen.getByRole('button', { name: /Sign out/i })
    fireEvent.click(signoutBtn)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true })
    })
  })
})
