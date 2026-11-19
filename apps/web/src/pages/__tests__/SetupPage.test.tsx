import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { SetupPage } from '../SetupPage'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('SetupPage / SetupWizard (BP 4.9)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url) => {
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
        if (url === '/setup') {
          return Promise.resolve({
            ok: true,
            json: async () => ({ message: 'ok', workspace_id: 'ws-1' }),
          })
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({}),
        })
      }),
    )
  })

  it('progresses through all 4 wizard steps and submits setup payload', async () => {
    render(
      <MemoryRouter>
        <SetupPage />
      </MemoryRouter>,
    )

    // Step 1: Business Profile
    expect(screen.getByText(/Step 1 of 4: Business details/i)).toBeInTheDocument()
    const nameInput = screen.getByLabelText(/Business name/i)
    fireEvent.change(nameInput, { target: { value: 'Kerala Wood Works' } })

    const continueBtn = screen.getByRole('button', { name: /Continue/i })
    fireEvent.click(continueBtn)

    // Step 2: Design
    await waitFor(() => {
      expect(screen.getByText(/Step 2 of 4: Pick a design/i)).toBeInTheDocument()
    })
    const step2Continue = screen.getByRole('button', { name: /Continue/i })
    fireEvent.click(step2Continue)

    // Step 3: Columns
    await waitFor(() => {
      expect(screen.getByText(/Step 3 of 4: Choose columns/i)).toBeInTheDocument()
    })
    const step3Continue = screen.getByRole('button', { name: /Continue/i })
    fireEvent.click(step3Continue)

    // Step 4: PIN and Voice
    await waitFor(() => {
      expect(screen.getByText(/Step 4 of 4: Set PIN and voice/i)).toBeInTheDocument()
    })

    // Check voice disclosure copy (BP 4.9)
    expect(
      screen.getByText(/Voice clips are kept for 90 days to improve recognition and can be switched off\./i),
    ).toBeInTheDocument()

    const pinInput = screen.getByLabelText(/^PIN/i)
    const confirmInput = screen.getByLabelText(/Confirm PIN/i)
    fireEvent.change(pinInput, { target: { value: '1234' } })
    fireEvent.change(confirmInput, { target: { value: '1234' } })

    const finishBtn = screen.getByRole('button', { name: /Finish setup/i })
    fireEvent.click(finishBtn)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
    })
  })

  it('validates required business name before advancing Step 1', () => {
    render(
      <MemoryRouter>
        <SetupPage />
      </MemoryRouter>,
    )

    const continueBtn = screen.getByRole('button', { name: /Continue/i })
    fireEvent.click(continueBtn)

    expect(screen.getByRole('alert')).toHaveTextContent(/Business name is required/i)
    expect(screen.queryByText(/Step 2 of 4/i)).not.toBeInTheDocument()
  })
})
