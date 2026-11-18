import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { apiFetch, ApiException } from '../api/client'

interface MeData {
  workspace_id: string
  name: string
}

export function AuthGuard({ children }: { children: (data: MeData) => React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [authData, setAuthData] = useState<MeData | null>(null)

  useEffect(() => {
    let isMounted = true
    apiFetch<MeData>('/auth/me')
      .then((data) => {
        if (isMounted) {
          setAuthData(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (isMounted) {
          if (err instanceof ApiException && err.status === 401) {
            setAuthData(null)
          }
          setLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-500 text-sm">Loading...</div>
      </div>
    )
  }

  if (!authData) {
    return <Navigate to="/login" replace />
  }

  return <>{children(authData)}</>
}
