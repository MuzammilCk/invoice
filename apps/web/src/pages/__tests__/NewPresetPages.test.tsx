import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { NewDesignPage } from '../NewDesignPage'
import { NewColumnsPage } from '../NewColumnsPage'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('Change Preset Pages (BP 4.2, 4.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url, opts) => {
        if (url === '/settings') {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              default_preset_id: 'preset-1',
              default_preset: {
                id: 'preset-1',
                name: 'Default',
                design_id: 'design1',
                columns: ['no', 'item', 'qty', 'rate', 'amount'],
              },
            }),
          })
        }
        if (url === '/designs') {
          return Promise.resolve({
            ok: true,
            json: async () => [
              {
                id: 'design1',
                name: 'Design 1 (Reference)',
                sample_preview_url: '/designs/design1/sample',
              },
            ],
          })
        }
        if (url.startsWith('/presets/preset-1') && opts?.method === 'PUT') {
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

  it('NewDesignPage loads current design, saves selection, and returns to home', async () => {
    render(
      <MemoryRouter>
        <NewDesignPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText(/Design 1 \(Reference\)/i)).toBeInTheDocument()
    })

    const saveBtn = screen.getByRole('button', { name: /Save design/i })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
    })
  })

  it('NewColumnsPage loads columns, allows toggling, saves, and returns to home', async () => {
    render(
      <MemoryRouter>
        <NewColumnsPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: /^No\./i })).toBeInTheDocument()
    })

    // Uncheck 'no'
    const noCheckbox = screen.getByRole('checkbox', { name: /^No\./i })
    fireEvent.click(noCheckbox)

    const saveBtn = screen.getByRole('button', { name: /Save columns/i })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
    })
  })
})
