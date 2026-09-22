import { Activity } from 'lucide-react'
import { SeverityBadge } from '../ui/Badges'
import { SEVERITY } from '../../utils/constants'
import { timeAgo } from '../../utils/format'

export default function AnomalyItem({ anomaly: a }) {
  const color = SEVERITY[a.severity].color
  return (
    <div className="inset flex gap-3 p-3.5">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl" style={{ background: `${color}22`, color }}><Activity size={19} /></div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="text-sm font-semibold">{a.message}</p>
          <SeverityBadge severity={a.severity} />
        </div>
        <p className="mt-0.5 text-xs text-muted">{a.resource_name} · {timeAgo(a.detected_at)}</p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{a.description}</p>
      </div>
    </div>
  )
}
