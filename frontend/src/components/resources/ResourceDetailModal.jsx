import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Calendar, MapPin, Power, RotateCcw, Square, Wrench } from 'lucide-react'
import Modal from '../ui/Modal'
import { StatusBadge, SecurityBadge, SeverityBadge, CategoryBadge } from '../ui/Badges'
import MiniBar from '../cloud/MiniBar'
import ChartTooltip from '../ui/ChartTooltip'
import { Skeleton } from '../ui/LoadingSkeleton'
import { ErrorState } from '../ui/StateViews'
import { useApi } from '../../hooks/useApi'
import { useConfirm } from '../../context/ConfirmContext'
import { useToast } from '../../context/ToastContext'
import { api, getErrorMessage } from '../../services/api'
import { TYPE_META, CHART } from '../../utils/constants'
import { currency, formatDate, formatDateTime, tickFormatter, tooltipDate } from '../../utils/format'

const ACTIONS = { running: [['stop', 'Stop', Square], ['reboot', 'Reboot', RotateCcw]], stopped: [['start', 'Start', Power]], warning: [['stop', 'Stop', Square], ['reboot', 'Reboot', RotateCcw]] }

export default function ResourceDetailModal({ resourceId, onClose }) {
  const confirm = useConfirm()
  const toast = useToast()
  const [busy, setBusy] = useState('')
  const { data: res, loading, error, retry, setData } = useApi(() => (resourceId ? api.resource(resourceId) : Promise.resolve(null)), [resourceId])

  const doAction = async (action) => {
    const label = { stop: 'stop', start: 'start', reboot: 'reboot' }[action]
    const ok = await confirm({ title: `${label[0].toUpperCase()}${label.slice(1)} ${res.name}?`, tone: action === 'stop' ? 'danger' : 'primary',
      message: `This will simulate a ${label} action on this resource. No real cloud infrastructure is affected.`, confirmLabel: `Yes, ${label}` })
    if (!ok) return
    setBusy(action)
    try {
      const updated = await api.resourceAction(res._id, action)
      setData(updated)
      toast.success(`${res.name} ${action === 'stop' ? 'stopped' : action === 'start' ? 'started' : 'rebooted'} successfully.`)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setBusy('')
    }
  }

  return (
    <Modal open={!!resourceId} onClose={onClose} size="xl" title={loading ? 'Loading...' : res?.name}
      subtitle={res && `${res.service} · ${res.size}`}
      headerExtra={res && <SecurityBadge status={res.security_status} />}>
      {error && !res ? <ErrorState compact message={error} onRetry={retry} /> : loading || !res ? (
        <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-48 w-full" /></div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={res.status} />
            <span className="chip"><MapPin size={12} /> {res.region}</span>
            <span className="chip"><Calendar size={12} /> Created {formatDate(res.created_at)}</span>
            <span className="chip">Uptime {res.uptime.pct}%</span>
            {(ACTIONS[res.status] || []).map(([action, label, Icon]) => (
              <button key={action} onClick={() => doAction(action)} disabled={!!busy}
                className={`btn btn-sm ml-auto ${action === 'stop' ? 'btn-danger' : 'btn-ghost'}`}>
                <Icon size={14} /> {busy === action ? `${label}ping...` : label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <MiniBar label="CPU" value={res.cpu} /><MiniBar label="Memory" value={res.memory} /><MiniBar label="Storage" value={res.storage} />
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">Performance (last 72 hours)</h4>
            <div className="h-[190px] w-full">
              <ResponsiveContainer>
                <AreaChart data={res.series} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                  <defs><linearGradient id="rdCpu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={CHART.cpu} stopOpacity=".3" /><stop offset="1" stopColor={CHART.cpu} stopOpacity="0" /></linearGradient></defs>
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis dataKey="ts" tickFormatter={tickFormatter('7d')} tickLine={false} axisLine={false} minTickGap={40} />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} width={40} tickFormatter={(v) => `${v}%`} />
                  <Tooltip content={<ChartTooltip formatLabel={(l) => tooltipDate(l, '24h')} formatValue={(v) => `${Number(v).toFixed(1)}%`} />} />
                  <Area type="monotone" dataKey="cpu" name="CPU" stroke={CHART.cpu} fill="url(#rdCpu)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="memory" name="Memory" stroke={CHART.memory} fill="transparent" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <h4 className="mb-3 text-sm font-semibold">Security findings</h4>
              {res.findings.length === 0 ? <p className="inset p-4 text-sm text-muted">No active findings for this resource.</p> : (
                <div className="space-y-2">
                  {res.findings.map((f) => (
                    <div key={f._id} className="inset p-3.5">
                      <div className="flex items-start justify-between gap-2"><p className="text-sm font-semibold">{f.title}</p><SeverityBadge severity={f.severity} /></div>
                      <p className="mt-1 text-xs text-muted">{f.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold">Recent events</h4>
              <div className="space-y-2">
                {res.events.slice(0, 5).map((e, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs">
                    <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${e.level === 'warning' ? 'bg-warn' : e.level === 'success' ? 'bg-ok' : 'bg-accent'}`} />
                    <span className="min-w-0 flex-1"><span className="block text-[13px] text-ink">{e.message}</span><span className="text-muted">{formatDateTime(e.time)}</span></span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {res.recommendations.length > 0 && (
            <div>
              <h4 className="mb-3 text-sm font-semibold">Recommendations for this resource</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                {res.recommendations.map((r) => (
                  <Link key={r._id} to={`/recommendations?focus=${r._id}`} onClick={onClose} className="inset flex items-center justify-between gap-3 p-3.5 hover:bg-white/10">
                    <span className="min-w-0"><span className="flex items-center gap-2 text-sm font-semibold"><CategoryBadge category={r.category} /></span>
                      <span className="mt-1 block truncate text-xs text-muted">{r.title}</span></span>
                    <Wrench size={15} className="shrink-0 text-muted" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-white/10 pt-4 text-sm">
            <span className="text-muted">Monthly cost</span>
            <span className="num text-lg font-semibold">{currency(res.monthly_cost)}</span>
          </div>
        </div>
      )}
    </Modal>
  )
}
