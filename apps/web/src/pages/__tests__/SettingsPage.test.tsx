import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { SettingsPage } from '../SettingsPage'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('SettingsPage (BP 4.8)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url, opts) => {
        if (url === '/settings' && (!opts || !opts.method || opts.method === 'GET')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              workspace_id: 'ws-1',
              name: 'Kerala Wood Works',
              address_lines: ['123 Market St', 'Calicut'],
              phones: ['+91 94000 00000'],
              footer: 'Original Footer',
              currency: '₹',
              date_format: 'DD MMMM YYYY',
              help_improve_voice: true,
              default_preset_id: 'preset-1',
              default_preset: {
                id: 'preset-1',
                design_id: 'design1',
                columns: ['no', 'item', 'qty', 'rate', 'amount'],
              },
            }),
          })
        }
        if (url === '/settings' && opts?.method === 'PUT') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              workspace_id: 'ws-1',
              name: 'Kerala Wood Works Updated',
              address_lines: ['123 Market St', 'Calicut'],
              phones: ['+91 94000 00000'],
              footer: 'Updated Footer',
              currency: '₹',
              date_format: 'DD MMMM YYYY',
              help_improve_voice: false,
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

  it('renders business profile, voice toggle copy, and preset chips', async () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue('Kerala Wood Works')).toBeInTheDocument()
    })

    expect(screen.getByDisplayValue('Original Footer')).toBeInTheDocument()
    expect(
      screen.getByText(/Voice clips are kept for 90 days to improve recognition and can be switched off\./i),
    ).toBeInTheDocument()

    // Preset chips
    expect(screen.getByText(/Using Design 1/i)).toBeInTheDocument()
    expect(screen.getByText(/Columns: No\., Item, Qty, Rate, Amount/i)).toBeInTheDocument()
  })

  it('updates business profile and saves', async () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue('Kerala Wood Works')).toBeInTheDocument()
    })

    const nameInput = screen.getByLabelText(/Business name/i)
    fireEvent.change(nameInput, { target: { value: 'Kerala Wood Works Updated' } })

    const saveBtn = screen.getByRole('button', { name: /Save changes/i })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(screen.getByText(/Settings saved/i)).toBeInTheDocument()
    })
  })

  it('signs out and navigates to /login', async () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue('Kerala Wood Works')).toBeInTheDocument()
    })

    const signoutBtn = screen.getByRole('button', { name: /Sign out/i })
    fireEvent.click(signoutBtn)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true })
    })
  })
})
