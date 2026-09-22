import { AlertTriangle, CircleDot, ShieldAlert } from 'lucide-react'
import { CategoryBadge, SeverityBadge, StatusBadge } from '../ui/Badges'
import { SEVERITY } from '../../utils/constants'
import { timeAgo } from '../../utils/format'

/** One alert row. `children` renders the action buttons (used on the Alerts page). */
export default function AlertItem({ alert: a, compact = false, children }) {
  const Icon = a.severity === 'critical' ? ShieldAlert : a.severity === 'high' ? AlertTriangle : CircleDot
  const color = SEVERITY[a.severity].color
  const fresh = a.status === 'open' && !a.read
  return (
    <div className={`inset flex gap-3 p-3.5 sm:gap-4 sm:p-4 ${a.status !== 'open' ? 'opacity-70' : ''}`}>
      <div className="relative mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-2xl" style={{ background: `${color}22`, color }}>
        <Icon size={19} />
        {fresh && (a.severity === 'critical' || a.severity === 'high') && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full" style={{ background: color }}><span className="absolute inset-0 animate-ping2 rounded-full" style={{ background: color }} /></span>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <p className={`text-sm ${fresh ? 'font-bold' : 'font-semibold'}`}>{a.title}</p>
          <SeverityBadge severity={a.severity} />
        </div>
        <p className="mt-0.5 text-xs text-muted">{a.resource_name} · {timeAgo(a.created_at)}</p>
        {!compact && <p className="mt-2 text-[13px] leading-relaxed text-muted">{a.message}</p>}
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <StatusBadge status={a.status} />
          {!compact && <CategoryBadge category={a.category} />}
          {fresh && <span className="chip border-accent/35 bg-accent/12 text-accent">New</span>}
          {children && <div className="ml-auto flex flex-wrap gap-2">{children}</div>}
        </div>
      </div>
    </div>
  )
}
