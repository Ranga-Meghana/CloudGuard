import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { LayoutGrid, List, Server } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import SearchBar from '../components/ui/SearchBar'
import Tabs from '../components/ui/Tabs'
import GlassCard from '../components/ui/GlassCard'
import ResourceCard from '../components/cloud/ResourceCard'
import { CardSkeleton } from '../components/ui/LoadingSkeleton'
import { EmptyState, ErrorState } from '../components/ui/StateViews'
import { StatusBadge, SecurityBadge } from '../components/ui/Badges'
import ResourceDetailModal from '../components/resources/ResourceDetailModal'
import { useApi } from '../hooks/useApi'
import { useDebounce } from '../hooks/useDebounce'
import { api } from '../services/api'
import { TYPE_META } from '../utils/constants'
import { currency } from '../utils/format'

const TYPE_TABS = [{ value: '', label: 'All' }, { value: 'compute', label: 'Compute' }, { value: 'storage', label: 'Storage' },
  { value: 'database', label: 'Database' }, { value: 'network', label: 'Network' }]

export default function Resources() {
  const [params, setParams] = useSearchParams()
  const { id: routeId } = useParams()
  const navigate = useNavigate()
  const [type, setType] = useState(params.get('type') || '')
  const [q, setQ] = useState(params.get('q') || '')
  const [view, setView] = useState('grid')
  const [openId, setOpenId] = useState(routeId || null)
  const debouncedQ = useDebounce(q, 250)

  useEffect(() => { setOpenId(routeId || null) }, [routeId])
  const closeModal = () => { setOpenId(null); if (routeId) navigate('/resources') }

  const { data, loading, error, retry } = useApi(() => api.resources({ type: type || undefined, q: debouncedQ || undefined }), [type, debouncedQ])

  useEffect(() => {
    const next = {}
    if (type) next.type = type
    if (q) next.q = q
    setParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, debouncedQ])

  const counts = data?.counts
  const items = data?.items || []

  return (
    <div className="space-y-5">
      <PageHeader title="Cloud Resources" subtitle="Every simulated compute, storage, database and network resource in your environment."
        actions={<div className="flex gap-1.5 rounded-xl border border-white/10 bg-white/5 p-1">
          <button onClick={() => setView('grid')} className={`icon-btn !h-8 !w-8 ${view === 'grid' ? '!bg-white/18' : '!bg-transparent !border-transparent'}`} aria-label="Grid view"><LayoutGrid size={15} /></button>
          <button onClick={() => setView('list')} className={`icon-btn !h-8 !w-8 ${view === 'list' ? '!bg-white/18' : '!bg-transparent !border-transparent'}`} aria-label="List view"><List size={15} /></button>
        </div>} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs options={TYPE_TABS.map((t) => ({ ...t, count: counts ? (t.value ? counts[t.value] : counts.all) : undefined }))} value={type} onChange={setType} />
        <SearchBar value={q} onChange={setQ} placeholder="Search by name, service or region..." className="sm:w-72" />
      </div>

      {error && !data ? <ErrorState message={error} onRetry={retry} /> : loading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <CardSkeleton key={i} />)}</div>
      ) : items.length === 0 ? (
        <GlassCard><EmptyState icon={Server} title="No resources found" message="Try a different search term or filter." /></GlassCard>
      ) : view === 'grid' ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{items.map((r) => <ResourceCard key={r._id} resource={r} />)}</div>
      ) : (
        <GlassCard pad="p-0" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs text-muted">
                  {['Resource', 'Type', 'Region', 'Status', 'CPU', 'Memory', 'Monthly Cost', 'Security', ''].map((h) => <th key={h} className="px-5 py-3.5 font-semibold">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {items.map((r) => {
                  const meta = TYPE_META[r.type]
                  const Icon = meta.icon
                  return (
                    <tr key={r._id} onClick={() => setOpenId(r._id)} className="cursor-pointer border-b border-white/6 transition-colors last:border-0 hover:bg-white/6">
                      <td className="flex items-center gap-3 px-5 py-3.5"><Icon size={16} style={{ color: meta.color }} /><span className="font-semibold">{r.name}</span></td>
                      <td className="px-5 py-3.5 text-muted">{meta.label}</td>
                      <td className="px-5 py-3.5 text-muted">{r.region}</td>
                      <td className="px-5 py-3.5"><StatusBadge status={r.status} /></td>
                      <td className="num px-5 py-3.5">{r.cpu != null ? `${Math.round(r.cpu)}%` : '—'}</td>
                      <td className="num px-5 py-3.5">{r.memory != null ? `${Math.round(r.memory)}%` : '—'}</td>
                      <td className="num px-5 py-3.5 font-semibold">{currency(r.monthly_cost)}</td>
                      <td className="px-5 py-3.5"><SecurityBadge status={r.security_status} /></td>
                      <td className="px-5 py-3.5 text-right"><button onClick={(e) => { e.stopPropagation(); setOpenId(r._id) }} className="btn btn-ghost btn-sm">View</button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      <ResourceDetailModal resourceId={openId} onClose={closeModal} />
    </div>
  )
}
