export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} />
}

export function CardSkeleton({ className = '', lines = 3 }) {
  return (
    <div className={`glass p-6 ${className}`}>
      <Skeleton className="mb-4 h-4 w-1/3" />
      <Skeleton className="mb-3 h-8 w-1/2" />
      {Array.from({ length: lines }).map((_, i) => <Skeleton key={i} className="mb-2 h-3 w-full" />)}
    </div>
  )
}

/** Generic page-level skeleton with a message. */
export default function PageSkeleton({ message = 'Loading cloud environment...' }) {
  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">{message}</p>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <CardSkeleton key={i} lines={1} />)}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <CardSkeleton className="lg:col-span-2 h-72" lines={5} />
        <CardSkeleton className="h-72" lines={5} />
      </div>
    </div>
  )
}
