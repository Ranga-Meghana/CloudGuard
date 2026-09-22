import { Inbox, RotateCw, WifiOff } from 'lucide-react'

export function ErrorState({ message = 'Unable to retrieve data.', onRetry, compact = false }) {
  return (
    <div className={`glass flex flex-col items-center justify-center text-center ${compact ? 'p-6' : 'p-10'}`}>
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-danger/15 text-danger"><WifiOff size={22} /></div>
      <h3 className="h-display text-base font-semibold">Something went wrong</h3>
      <p className="mt-1 max-w-md text-sm text-muted">{message}</p>
      {onRetry && <button onClick={onRetry} className="btn btn-primary mt-4"><RotateCw size={16} /> Retry</button>}
    </div>
  )
}

export function EmptyState({ title = 'Nothing to show', message, icon: Icon = Inbox, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-white/8 text-muted"><Icon size={22} /></div>
      <h3 className="text-sm font-semibold">{title}</h3>
      {message && <p className="mt-1 max-w-xs text-sm text-muted">{message}</p>}
      {action}
    </div>
  )
}
