import { createBrowserRouter } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { HomePage } from './pages/HomePage'
import { SetupPage } from './pages/SetupPage'
import { NewDesignPage } from './pages/NewDesignPage'
import { NewColumnsPage } from './pages/NewColumnsPage'
import { DraftStubPage } from './pages/DraftStubPage'
import { AuthGuard } from './components/AuthGuard'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/setup',
    element: <SetupPage />,
  },
  {
    path: '/new/design',
    element: (
      <AuthGuard>
        {() => <NewDesignPage />}
      </AuthGuard>
    ),
  },
  {
    path: '/new/columns',
    element: (
      <AuthGuard>
        {() => <NewColumnsPage />}
      </AuthGuard>
    ),
  },
  {
    path: '/new/draft-stub',
    element: (
      <AuthGuard>
        {() => <DraftStubPage />}
      </AuthGuard>
    ),
  },
  {
    path: '/',
    element: (
      <AuthGuard>
        {(data) => <HomePage workspaceName={data.name} />}
      </AuthGuard>
    ),
  },
])
