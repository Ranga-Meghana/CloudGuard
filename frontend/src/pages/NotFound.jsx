import { Link } from 'react-router-dom'
import { CloudOff } from 'lucide-react'
import Logo from '../components/ui/Logo'

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="scene-layer" aria-hidden="true" />
      <div className="glass max-w-md animate-scale-in p-9 text-center">
        <div className="mb-5 flex justify-center"><Logo showTagline={false} /></div>
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-white/8 text-muted"><CloudOff size={26} /></div>
        <h1 className="h-display text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-muted">The page you're looking for drifted out of the cloud.</p>
        <Link to="/" className="btn btn-primary mt-6">Back to Dashboard</Link>
      </div>
    </div>
  )
}
