import { useEffect, useState } from 'react'
import { ArrowRight, CheckCircle2, Lightbulb, MapPin, Wrench } from 'lucide-react'
import Modal from '../ui/Modal'
import { CategoryBadge, PriorityBadge, StatusBadge } from '../ui/Badges'
import { useToast } from '../../context/ToastContext'
import { api, getErrorMessage } from '../../services/api'
import { currency } from '../../utils/format'

export default function RecommendationModal({ rec, onClose, onApplied }) {
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [applied, setApplied] = useState(false)

  useEffect(() => { if (rec) setApplied(rec.status === 'applied') }, [rec])
  if (!rec) return null

  const apply = async () => {
    setBusy(true)
    try {
      await api.updateRecommendation(rec._id, 'applied')
      setApplied(true)
      toast.success(`Applied: ${rec.title}`)
      await onApplied?.()
    } catch (err) {
      toast.error(getErrorMessage(err, 'Unable to apply this recommendation.'))
    } finally {
      setBusy(false)
    }
  }

  const saves = rec.estimated_savings > 0

  return (
    <Modal open={!!rec} onClose={onClose} size="md" title={rec.title} subtitle={rec.resource_name}>
      <div className="flex flex-wrap items-center gap-2">
        <CategoryBadge category={rec.category} /><PriorityBadge priority={rec.priority} />
        {applied ? <StatusBadge status="applied" /> : <StatusBadge status={rec.status} />}
      </div>

      <p className="mt-4 text-sm leading-relaxed text-muted">{rec.description}</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="inset p-4"><p className="text-xs text-muted">Reason</p><p className="mt-1 text-sm">{rec.reason}</p></div>
        <div className="inset p-4"><p className="text-xs text-muted">Impact</p><p className="mt-1 flex items-center gap-1.5 text-sm"><Lightbulb size={14} className="text-accent" />{rec.impact}</p></div>
      </div>

      {saves && (
        <div className="mt-4 flex items-center justify-between rounded-2xl border border-ok/25 bg-ok/10 p-4">
          <div>
            {rec.current_cost != null && <p className="text-xs text-muted">Current: {currency(rec.current_cost)}/mo → Recommended: {currency(rec.recommended_cost)}/mo</p>}
            <p className="text-sm">Potential monthly savings</p>
          </div>
          <p className="num text-2xl font-semibold text-ok">{currency(rec.estimated_savings)}</p>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 text-xs text-muted"><MapPin size={13} /> Applies to {rec.resource_name}</div>

      <div className="mt-6 flex justify-end gap-2">
        <button onClick={onClose} className="btn btn-ghost">Close</button>
        {applied ? (
          <span className="btn btn-success pointer-events-none"><CheckCircle2 size={16} /> Applied</span>
        ) : (
          <button onClick={apply} disabled={busy} className="btn btn-primary"><Wrench size={16} /> {busy ? 'Applying...' : 'Apply Recommendation'} <ArrowRight size={15} /></button>
        )}
      </div>
    </Modal>
  )
}
