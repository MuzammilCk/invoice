import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { LoginPage } from '../LoginPage'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
  })

  it('renders PIN input and submit button with proper touch targets and labels', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    )

    const pinInput = screen.getByLabelText(/PIN/i)
    const submitBtn = screen.getByRole('button', { name: /Sign in/i })

    expect(pinInput).toBeInTheDocument()
    expect(pinInput).toHaveAttribute('type', 'password')
    expect(submitBtn).toBeInTheDocument()
    // touch target class verification
    expect(submitBtn.className).toContain('min-h-[44px]')
  })

  it('shows error if submitted without a PIN', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    )

    const submitBtn = screen.getByRole('button', { name: /Sign in/i })
    fireEvent.click(submitBtn)

    expect(await screen.findByRole('alert')).toHaveTextContent('Enter your PIN to continue')
  })

  it('navigates to / on successful login', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'ok' }),
      } as Response),
    )

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    )

    const pinInput = screen.getByLabelText(/PIN/i)
    const submitBtn = screen.getByRole('button', { name: /Sign in/i })

    fireEvent.change(pinInput, { target: { value: '1234' } })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
    })
  })

  it('displays error on invalid PIN (401)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ code: 'INVALID_PIN', message: 'Incorrect PIN' }),
      } as Response),
    )

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    )

    const pinInput = screen.getByLabelText(/PIN/i)
    const submitBtn = screen.getByRole('button', { name: /Sign in/i })

    fireEvent.change(pinInput, { target: { value: '9999' } })
    fireEvent.click(submitBtn)

    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect PIN. Try again.')
  })
})
