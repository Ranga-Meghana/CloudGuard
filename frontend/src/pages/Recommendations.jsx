import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Lightbulb, PiggyBank } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import GlassCard from '../components/ui/GlassCard'
import Tabs from '../components/ui/Tabs'
import RecommendationCard from '../components/cloud/RecommendationCard'
import RecommendationModal from '../components/recommendations/RecommendationModal'
import { CardSkeleton } from '../components/ui/LoadingSkeleton'
import { EmptyState, ErrorState } from '../components/ui/StateViews'
import { useApi } from '../hooks/useApi'
import { useData } from '../context/DataContext'
import { api } from '../services/api'
import { currency } from '../utils/format'

const CATEGORY_TABS = [{ value: '', label: 'All' }, { value: 'security', label: 'Security' }, { value: 'cost', label: 'Cost' }, { value: 'performance', label: 'Performance' }, { value: 'reliability', label: 'Reliability' }]
const STATUS_TABS = [{ value: 'open', label: 'Open' }, { value: 'applied', label: 'Applied' }, { value: 'dismissed', label: 'Dismissed' }, { value: '', label: 'All' }]

export default function Recommendations() {
  const [params, setParams] = useSearchParams()
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('open')
  const { bump } = useData()
  const { data, loading, error, retry, reload } = useApi(() => api.recommendations({ category: category || undefined, status: status || undefined }), [category, status])
  const [focus, setFocus] = useState(null)

  useEffect(() => {
    const id = params.get('focus')
    if (id && data?.items) {
      const found = data.items.find((r) => r._id === id)
      if (found) { setFocus(found); setParams({}, { replace: true }) }
    }
  }, [data, params, setParams])

  const totals = data?.totals

  return (
    <div className="space-y-5">
      <PageHeader title="Recommendations" subtitle="Actionable, categorized advice generated from your resource data and metrics." />

      {totals && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <GlassCard pad="p-4" className="text-center"><p className="num text-2xl font-semibold">{totals.open}</p><p className="text-xs text-muted">Open</p></GlassCard>
          <GlassCard pad="p-4" className="text-center"><p className="num text-2xl font-semibold text-danger">{totals.high_priority}</p><p className="text-xs text-muted">High priority</p></GlassCard>
          <GlassCard pad="p-4" className="text-center"><p className="num text-2xl font-semibold text-ok">{currency(totals.potential_savings)}</p><p className="text-xs text-muted">Potential savings/mo</p></GlassCard>
          <GlassCard pad="p-4" className="text-center"><p className="num text-2xl font-semibold text-accent">{totals.applied}</p><p className="text-xs text-muted">Applied</p></GlassCard>
        </div>
      )}

      <div className="flex flex-wrap gap-2"><Tabs options={STATUS_TABS} value={status} onChange={setStatus} /><Tabs options={CATEGORY_TABS} value={category} onChange={setCategory} /></div>

      {error && !data ? <ErrorState message={error} onRetry={retry} /> : loading && !data ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <CardSkeleton key={i} />)}</div>
      ) : data.items.length === 0 ? (
        <GlassCard><EmptyState icon={Lightbulb} title="No recommendations" message="Nothing matches these filters right now." /></GlassCard>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{data.items.map((r) => <RecommendationCard key={r._id} rec={r} onReview={setFocus} />)}</div>
      )}

      <RecommendationModal rec={focus} onClose={() => setFocus(null)} onApplied={async () => { await reload(); bump() }} />
    </div>
  )
}
