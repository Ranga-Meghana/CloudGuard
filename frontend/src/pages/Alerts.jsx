import { useState } from 'react'
import { Bell, CheckCheck, Trash2 } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import GlassCard from '../components/ui/GlassCard'
import Tabs from '../components/ui/Tabs'
import SearchBar from '../components/ui/SearchBar'
import AlertItem from '../components/cloud/AlertItem'
import { Skeleton } from '../components/ui/LoadingSkeleton'
import { EmptyState, ErrorState } from '../components/ui/StateViews'
import { useApi } from '../hooks/useApi'
import { useDebounce } from '../hooks/useDebounce'
import { useConfirm } from '../context/ConfirmContext'
import { useToast } from '../context/ToastContext'
import { useData } from '../context/DataContext'
import { api, getErrorMessage } from '../services/api'

const CATEGORY_TABS = [{ value: '', label: 'All' }, { value: 'security', label: 'Security' }, { value: 'performance', label: 'Performance' }, { value: 'cost', label: 'Cost' }, { value: 'system', label: 'System' }]
const STATUS_TABS = [{ value: 'open', label: 'Open' }, { value: 'resolved', label: 'Resolved' }, { value: 'archived', label: 'Archived' }, { value: '', label: 'All' }]

export default function Alerts() {
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('open')
  const [q, setQ] = useState('')
  const debouncedQ = useDebounce(q, 250)
  const confirm = useConfirm()
  const toast = useToast()
  const { bump } = useData()

  const { data, loading, error, retry, reload } = useApi(
    () => api.alerts({ category: category || undefined, status: status || undefined, q: debouncedQ || undefined }), [category, status, debouncedQ])

  const act = async (fn, successMsg) => {
    try { await fn(); await reload(); bump(); if (successMsg) toast.success(successMsg) }
    catch (err) { toast.error(getErrorMessage(err)) }
  }

  const markRead = (a) => act(() => api.updateAlert(a._id, { read: true }))
  const resolve = (a) => act(() => api.updateAlert(a._id, { status: 'resolved' }), 'Alert resolved.')
  const archive = (a) => act(() => api.updateAlert(a._id, { status: 'archived' }), 'Alert archived.')
  const remove = async (a) => {
    const ok = await confirm({ title: 'Delete this alert?', tone: 'danger', message: `"${a.title}" will be permanently removed.`, confirmLabel: 'Delete' })
    if (ok) act(() => api.deleteAlert(a._id), 'Alert deleted.')
  }
  const readAll = () => act(() => api.readAllAlerts(), 'All alerts marked as read.')

  const items = data?.items || []
  const counts = data?.counts

  return (
    <div className="space-y-5">
      <PageHeader title="Alerts" subtitle="Security, performance, cost and system alerts across your environment."
        actions={<button onClick={readAll} className="btn btn-ghost"><CheckCheck size={16} /> Mark all as read</button>} />

      {counts && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[['Open', counts.open, 'text-warn'], ['Unread', counts.unread, 'text-accent'], ['Critical', counts.critical, 'text-danger'], ['Total', counts.total, 'text-ink']].map(([l, v, c]) => (
            <GlassCard key={l} pad="p-4" className="text-center"><p className={`num text-2xl font-semibold ${c}`}>{v}</p><p className="text-xs text-muted">{l}</p></GlassCard>
          ))}
        </div>
      )}

      <GlassCard>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Tabs options={STATUS_TABS} value={status} onChange={setStatus} />
            <Tabs options={CATEGORY_TABS} value={category} onChange={setCategory} />
          </div>
          <SearchBar value={q} onChange={setQ} placeholder="Search alerts..." className="sm:w-64" />
        </div>

        {error && !data ? <ErrorState compact message={error} onRetry={retry} /> : loading && !data ? (
          <div className="space-y-2.5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
        ) : items.length === 0 ? (
          <EmptyState icon={Bell} title="No alerts" message="Nothing matches these filters." />
        ) : (
          <div className="space-y-2.5">
            {items.map((a) => (
              <AlertItem key={a._id} alert={a}>
                {!a.read && <button onClick={() => markRead(a)} className="btn btn-ghost btn-sm">Mark read</button>}
                {a.status === 'open' && <button onClick={() => resolve(a)} className="btn btn-success btn-sm">Resolve</button>}
                {a.status !== 'archived' && <button onClick={() => archive(a)} className="btn btn-ghost btn-sm">Archive</button>}
                <button onClick={() => remove(a)} className="icon-btn !h-8 !w-8 text-danger" aria-label="Delete"><Trash2 size={14} /></button>
              </AlertItem>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  )
}
