import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
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

describe('HomePage (BP 4.1, 4.2, 4.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url) => {
        if (url === '/settings') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              workspace_id: 'ws-1',
              name: 'Kerala Wood Works',
              default_preset_id: 'preset-1',
              default_preset: {
                id: 'preset-1',
                workspace_id: 'ws-1',
                name: 'Default',
                design_id: 'design1',
                columns: ['no', 'item', 'qty', 'rate', 'amount'],
              },
            }),
          })
        }
        if (url === '/auth/logout') {
          return Promise.resolve({
            ok: true,
            json: async () => ({ message: 'ok' }),
          })
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({}),
        })
      }),
    )
  })

  it('displays empty state, settings link, and remembered preset chips (AC12)', async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    // Wait for settings to load
    await waitFor(() => {
      expect(screen.getByText('Kerala Wood Works')).toBeInTheDocument()
    })

    expect(screen.getByText('No invoices yet')).toBeInTheDocument()
    expect(screen.getByText(/Create your first invoice to get started/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Create invoice/i })).toBeInTheDocument()

    // Settings link
    expect(screen.getByRole('link', { name: /Settings/i })).toHaveAttribute('href', '/settings')

    // Preset chips
    expect(screen.getByText(/Using Design 1/i)).toBeInTheDocument()
    expect(screen.getByText(/Columns: No\., Item, Qty, Rate, Amount/i)).toBeInTheDocument()
  })

  it('navigates to create-draft stub when Create Invoice is clicked', async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Kerala Wood Works')).toBeInTheDocument()
    })

    const createBtn = screen.getByRole('button', { name: /Create invoice/i })
    fireEvent.click(createBtn)

    expect(mockNavigate).toHaveBeenCalledWith('/new/draft-stub')
  })

  it('signs out and navigates to /login', async () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Kerala Wood Works')).toBeInTheDocument()
    })

    const signoutBtn = screen.getByRole('button', { name: /Sign out/i })
    fireEvent.click(signoutBtn)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true })
    })
  })
})
