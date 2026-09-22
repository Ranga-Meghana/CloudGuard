import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { StatusBadge } from '../ui/Badges'
import MiniBar from './MiniBar'
import { TYPE_META } from '../../utils/constants'
import { currency } from '../../utils/format'

export default function ResourceCard({ resource: r }) {
  const meta = TYPE_META[r.type]
  const Icon = meta.icon
  return (
    <Link to={`/resources/${r._id}`} className="glass glass-hover block p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/12" style={{ background: `${meta.color}22`, color: meta.color }}><Icon size={20} /></div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{r.name}</p>
            <p className="text-xs text-muted">{r.service}</p>
          </div>
        </div>
        <StatusBadge status={r.status} />
      </div>
      <div className="mt-5 space-y-3">
        <MiniBar label="CPU" value={r.cpu} />
        <MiniBar label="Memory" value={r.memory} />
        <MiniBar label="Storage" value={r.storage} />
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-xs">
        <span className="flex items-center gap-1.5 text-muted"><MapPin size={13} /> {r.region}</span>
        <span className="num text-sm font-semibold">{currency(r.monthly_cost)}<span className="text-xs font-normal text-muted">/mo</span></span>
      </div>
    </Link>
  )
}
