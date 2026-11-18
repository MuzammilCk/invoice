import { createBrowserRouter } from 'react-router-dom'
import { LoginPage } from './pages/LoginPage'
import { HomePage } from './pages/HomePage'
import { AuthGuard } from './components/AuthGuard'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
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
