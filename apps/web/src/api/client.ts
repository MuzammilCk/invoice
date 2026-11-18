export interface ApiError {
  code: string
  message: string
  field?: string
}

export class ApiException extends Error {
  constructor(
    public status: number,
    public error: ApiError,
  ) {
    super(error.message)
    this.name = 'ApiException'
  }
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(endpoint, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    let errorData: ApiError
    try {
      errorData = await response.json()
    } catch {
      errorData = {
        code: 'NETWORK_OR_SERVER_ERROR',
        message: response.statusText || 'Unknown error occurred',
      }
    }
    throw new ApiException(response.status, errorData)
  }

  return response.json()
}
