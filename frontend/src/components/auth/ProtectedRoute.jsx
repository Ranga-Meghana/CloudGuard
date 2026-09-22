import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Skeleton } from '../ui/LoadingSkeleton'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="relative flex min-h-screen items-center justify-center">
        <div className="scene-layer" aria-hidden="true" />
        <div className="w-full max-w-sm space-y-3 px-4"><Skeleton className="h-3 w-1/2" /><Skeleton className="h-10 w-full" /><p className="text-center text-xs text-muted">Loading cloud environment...</p></div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return children
}
