import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { ConfirmProvider } from './context/ConfirmContext'
import { DataProvider } from './context/DataContext'
import ProtectedRoute from './components/auth/ProtectedRoute'
import AppLayout from './layouts/AppLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Resources from './pages/Resources'
import Security from './pages/Security'
import Costs from './pages/Costs'
import Analytics from './pages/Analytics'
import Alerts from './pages/Alerts'
import Recommendations from './pages/Recommendations'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'

function LoginRoute() {
  const { user, loading } = useAuth()
  if (!loading && user) return <Navigate to="/" replace />
  return <Login />
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <ConfirmProvider>
          <DataProvider>
            <Routes>
              <Route path="/login" element={<LoginRoute />} />
              <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="resources" element={<Resources />} />
                <Route path="resources/:id" element={<Resources />} />
                <Route path="security" element={<Security />} />
                <Route path="costs" element={<Costs />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="alerts" element={<Alerts />} />
                <Route path="recommendations" element={<Recommendations />} />
                <Route path="settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </DataProvider>
        </ConfirmProvider>
      </AuthProvider>
    </ToastProvider>
  )
}
