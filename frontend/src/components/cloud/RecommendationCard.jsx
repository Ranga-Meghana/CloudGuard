import { ArrowRight, Lightbulb, MapPin } from 'lucide-react'
import { CategoryBadge, PriorityBadge, StatusBadge } from '../ui/Badges'
import { currency } from '../../utils/format'

/** Premium recommendation tile. `onReview` opens the detail modal. */
export default function RecommendationCard({ rec, onReview, compact = false }) {
  const saves = rec.estimated_savings > 0
  return (
    <div className="glass glass-hover flex h-full flex-col p-5">
      <div className="flex flex-wrap items-center gap-2">
        <CategoryBadge category={rec.category} />
        {!compact && <PriorityBadge priority={rec.priority} />}
        {rec.status !== 'open' && <StatusBadge status={rec.status} />}
      </div>
      <h3 className="h-display mt-3.5 text-[15px] font-semibold leading-snug">{rec.title}</h3>
      <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-muted">{compact ? rec.description : rec.reason}</p>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted"><MapPin size={12} /> {rec.resource_name}</p>
      <div className="mt-4 flex items-end justify-between gap-3 border-t border-white/10 pt-4">
        <div className="min-w-0">
          <p className="text-[11px] text-muted">{saves ? 'Potential monthly savings' : 'Estimated impact'}</p>
          {saves
            ? <p className="num text-xl font-semibold text-ok">{currency(rec.estimated_savings)}</p>
            : <p className="flex items-center gap-1.5 text-[13px] font-semibold"><Lightbulb size={14} className="text-accent" />{rec.impact}</p>}
        </div>
        <button onClick={() => onReview(rec)} className="btn btn-ghost btn-sm shrink-0">Review <ArrowRight size={14} /></button>
      </div>
    </div>
  )
}
