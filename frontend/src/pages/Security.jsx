import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ScanSearch, ShieldCheck, ShieldAlert } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import GlassCard from '../components/ui/GlassCard'
import ProgressRing from '../components/ui/ProgressRing'
import Tabs from '../components/ui/Tabs'
import SearchBar from '../components/ui/SearchBar'
import { SeverityBadge, StatusBadge, CategoryBadge } from '../components/ui/Badges'
import { CardSkeleton, Skeleton } from '../components/ui/LoadingSkeleton'
import { EmptyState, ErrorState } from '../components/ui/StateViews'
import { useApi } from '../hooks/useApi'
import { useDebounce } from '../hooks/useDebounce'
import { useToast } from '../context/ToastContext'
import { useData } from '../context/DataContext'
import { api, getErrorMessage } from '../services/api'
import { SEVERITY, SEVERITY_LIST } from '../utils/constants'
import { formatDateTime, timeAgo } from '../utils/format'

const STATUS_TABS = [{ value: '', label: 'All' }, { value: 'open', label: 'Open' }, { value: 'investigating', label: 'Investigating' }, { value: 'resolved', label: 'Resolved' }]

function ScanOverlay({ active, phase }) {
  if (!active) return null
  return (
    <div className="glass fixed inset-x-4 top-24 z-[70] mx-auto max-w-md animate-scale-in !rounded-2xl p-5 sm:inset-x-auto sm:right-6">
      <div className="relative mb-3 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="absolute inset-0 animate-scan bg-gradient-to-b from-transparent via-accent to-transparent" />
      </div>
      <p className="flex items-center gap-2 text-sm font-semibold"><ScanSearch size={16} className="text-accent" /> {phase}</p>
    </div>
  )
}

export default function Security() {
  const [params, setParams] = useSearchParams()
  const [status, setStatus] = useState('')
  const [severity, setSeverity] = useState('')
  const [q, setQ] = useState('')
  const debouncedQ = useDebounce(q, 250)
  const toast = useToast()
  const { bump } = useData()
  const [scanning, setScanning] = useState(false)
  const [scanPhase, setScanPhase] = useState('')

  const { data, loading, error, retry, reload } = useApi(
    () => api.findings({ status: status || undefined, severity: severity || undefined, q: debouncedQ || undefined }), [status, severity, debouncedQ])

  const runScan = async () => {
    setScanning(true)
    setScanPhase('Scanning cloud environment...')
    try {
      const [result] = await Promise.all([api.scan(), new Promise((r) => setTimeout(r, 1600))])
      setScanPhase(`Scan complete — ${result.total_findings} findings detected.`)
      await reload()
      bump()
      setTimeout(() => setScanning(false), 1600)
      toast.success(`Scan complete — ${result.total_findings} findings detected (${result.new_findings} new).`)
    } catch (err) {
      setScanning(false)
      toast.error(getErrorMessage(err, 'Security scan failed.'))
    }
  }

  useEffect(() => {
    if (params.get('scan') === '1') { runScan(); setParams({}, { replace: true }) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const update = async (finding, newStatus) => {
    try {
      await api.updateFinding(finding._id, newStatus)
      await reload()
      bump()
      toast.success(newStatus === 'resolved' ? `${finding.title} marked as resolved.` : `${finding.title} is now under investigation.`)
    } catch (err) {
      toast.error(getErrorMessage(err))
    }
  }

  const score = data?.score ?? 0
  const counts = data?.counts || { critical: 0, high: 0, medium: 0, low: 0 }
  const items = data?.items || []

  return (
    <div className="space-y-5">
      <ScanOverlay active={scanning} phase={scanPhase} />
      <PageHeader title="Security" subtitle="Findings detected by the CloudGuard security scanner across your environment."
        actions={<button onClick={runScan} disabled={scanning} className="btn btn-primary"><ScanSearch size={16} className={scanning ? 'animate-pulse' : ''} /> {scanning ? 'Scanning...' : 'Run Security Scan'}</button>} />

      <div className="grid gap-5 lg:grid-cols-12">
        <GlassCard className="lg:col-span-4">
          {loading && !data ? <Skeleton className="h-40 w-full" /> : (
            <>
              <div className="flex items-center gap-5">
                <ProgressRing value={score} size={104} stroke={9} from="#34d399" to="#38d5f5">
                  <div><p className="num text-2xl font-semibold leading-none">{score}</p><p className="mt-1 text-[10px] text-muted">of 100</p></div>
                </ProgressRing>
                <div>
                  <p className="text-sm text-muted">Security Score</p>
                  <p className="num text-2xl font-semibold">{score}/100</p>
                  <p className="mt-1 text-xs text-ok">{data?.total_active || 0} active findings</p>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2.5">
                {SEVERITY_LIST.map((s) => (
                  <div key={s} className="inset flex items-center justify-between px-3.5 py-2.5">
                    <span className="text-xs font-semibold" style={{ color: SEVERITY[s].color }}>{SEVERITY[s].label}</span>
                    <span className="num text-base font-semibold">{counts[s]}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </GlassCard>

        <GlassCard className="lg:col-span-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Tabs options={STATUS_TABS} value={status} onChange={setStatus} />
            <div className="flex gap-2">
              <select className="input !h-9 !w-32" value={severity} onChange={(e) => setSeverity(e.target.value)}>
                <option value="">All severities</option>
                {SEVERITY_LIST.map((s) => <option key={s} value={s}>{SEVERITY[s].label}</option>)}
              </select>
              <SearchBar value={q} onChange={setQ} placeholder="Search findings..." className="!w-56" />
            </div>
          </div>

          {error && !data ? <ErrorState compact message={error} onRetry={retry} /> : loading && !data ? (
            <div className="space-y-2.5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
          ) : items.length === 0 ? (
            <EmptyState icon={ShieldCheck} title="No findings" message="Nothing matches these filters. Try clearing them." />
          ) : (
            <div className="max-h-[560px] space-y-2.5 overflow-y-auto pr-1">
              {items.map((f) => (
                <div key={f._id} className="inset p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: `${SEVERITY[f.severity].color}22`, color: SEVERITY[f.severity].color }}><ShieldAlert size={17} /></div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{f.title}</p>
                        <p className="mt-0.5 text-xs text-muted">{f.resource_name} · Detected {timeAgo(f.detected_at)}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2"><SeverityBadge severity={f.severity} /><StatusBadge status={f.status} /></div>
                  </div>
                  <p className="mt-2.5 text-[13px] leading-relaxed text-muted">{f.description}</p>
                  {f.status !== 'resolved' && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {f.status === 'open' && <button onClick={() => update(f, 'investigating')} className="btn btn-ghost btn-sm">Review</button>}
                      <button onClick={() => update(f, 'resolved')} className="btn btn-success btn-sm">Resolve</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  )
}
