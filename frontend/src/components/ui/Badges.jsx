import { SEVERITY, PRIORITY_CLS } from '../../utils/constants'

const STATUS = {
  running: ['Running', 'text-ok', 'bg-ok/12 border-ok/35'],
  warning: ['Degraded', 'text-warn', 'bg-warn/12 border-warn/35'],
  stopped: ['Stopped', 'text-muted', 'bg-white/8 border-white/15'],
  open: ['Open', 'text-warn', 'bg-warn/12 border-warn/35'],
  investigating: ['Investigating', 'text-accent', 'bg-accent/12 border-accent/35'],
  resolved: ['Resolved', 'text-ok', 'bg-ok/12 border-ok/35'],
  archived: ['Archived', 'text-muted', 'bg-white/8 border-white/15'],
  applied: ['Applied', 'text-ok', 'bg-ok/12 border-ok/35'],
  dismissed: ['Dismissed', 'text-muted', 'bg-white/8 border-white/15'],
}

export function StatusBadge({ status, label }) {
  const [text, color, box] = STATUS[status] || [status, 'text-muted', 'bg-white/8 border-white/15']
  return (
    <span className={`chip ${color} ${box}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label || text}
    </span>
  )
}

export function SeverityBadge({ severity, className = '' }) {
  const s = SEVERITY[severity]
  return <span className={`chip ${s?.cls} ${className}`}>{s?.label || severity}</span>
}

const SECURITY = {
  secure: ['Secure', 'text-ok bg-ok/12 border-ok/35'],
  warning: ['Needs attention', 'text-warn bg-warn/12 border-warn/35'],
  critical: ['At risk', 'text-[#ff6b86] bg-[#ff4d6d]/15 border-[#ff4d6d]/40'],
}

/** Security posture of a resource (secure / needs attention / at risk). */
export function SecurityBadge({ status }) {
  const [label, cls] = SECURITY[status] || SECURITY.secure
  return <span className={`chip ${cls}`}>{label}</span>
}

export function PriorityBadge({ priority }) {
  return <span className={`chip ${PRIORITY_CLS[priority]}`}>{priority[0].toUpperCase() + priority.slice(1)} priority</span>
}

const CATEGORY = {
  security: 'text-[#ff8aa0] bg-[#ff4d6d]/12 border-[#ff4d6d]/30',
  cost: 'text-emerald-300 bg-emerald-400/12 border-emerald-400/30',
  performance: 'text-sky-300 bg-sky-400/12 border-sky-400/30',
  reliability: 'text-violet bg-violet/12 border-violet/30',
  system: 'text-muted bg-white/8 border-white/15',
}
export function CategoryBadge({ category }) {
  return <span className={`chip ${CATEGORY[category] || CATEGORY.system}`}>{category[0].toUpperCase() + category.slice(1)}</span>
}
