import { Link, useNavigate } from 'react-router-dom'
import { Activity, ArrowRight, Bell, Cloud, Clock, MapPin, RefreshCw, ScanSearch, Server, ShieldCheck, Wallet } from 'lucide-react'
import GlassCard from '../components/ui/GlassCard'
import PageSkeleton from '../components/ui/LoadingSkeleton'
import { EmptyState, ErrorState } from '../components/ui/StateViews'
import MetricCard from '../components/cloud/MetricCard'
import HeroArt from '../components/cloud/HeroArt'
import PerformanceChart from '../components/cloud/PerformanceChart'
import AlertItem from '../components/cloud/AlertItem'
import AnomalyItem from '../components/cloud/AnomalyItem'
import RecommendationCard from '../components/cloud/RecommendationCard'
import ResourceCard from '../components/cloud/ResourceCard'
import UtilizationCard from '../components/dashboard/UtilizationCard'
import SecurityOverview from '../components/dashboard/SecurityOverview'
import CostCard from '../components/dashboard/CostCard'
import ActivitySection from '../components/dashboard/ActivitySection'
import { useApi } from '../hooks/useApi'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { api } from '../services/api'
import { currency, greeting, signed, timeAgo } from '../utils/format'
import { CheckCircle2 } from 'lucide-react'

function SectionTitle({ title, subtitle, to, linkLabel = 'View all' }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h3 className="h-display text-lg font-semibold">{title}</h3>
        {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
      </div>
      {to && <Link to={to} className="flex items-center gap-1 text-sm font-semibold text-accent hover:underline">{linkLabel} <ArrowRight size={14} /></Link>}
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { refresh, refreshing } = useData()
  const { data, loading, error, retry } = useApi(api.dashboard, [])

  if (loading) return <PageSkeleton />
  if (error && !data) return <ErrorState message={error} onRetry={retry} />

  const { summary } = data
  const goReview = (rec) => navigate(`/recommendations?focus=${rec._id}`)

  return (
    <div className="space-y-5">
      {/* ---------------------------------------------------------------- hero */}
      <GlassCard className="relative overflow-hidden !p-6 sm:!p-9">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative grid items-center gap-6 md:grid-cols-[1.4fr_1fr]">
          <div>
            <span className="chip border-ok/35 bg-ok/12 text-ok"><span className="live-dot" /> {data.status.label}</span>
            <h1 className="h-display mt-4 text-3xl font-semibold leading-tight sm:text-[2.6rem]">{greeting()}, {user?.name}</h1>
            <p className="mt-2 max-w-lg text-[15px] text-muted">Here&apos;s what&apos;s happening across your cloud environment.</p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted">
              <span className="chip"><MapPin size={12} /> {data.region}</span>
              <span className="chip"><Cloud size={12} /> Demo Environment</span>
              <span className="chip"><Clock size={12} /> Last updated {timeAgo(data.last_updated)}</span>
              {data.status.attention > 0 && <span className="chip border-warn/35 bg-warn/12 text-warn">{data.status.attention} resource under load</span>}
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <button onClick={refresh} disabled={refreshing} className="btn btn-primary">
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /> {refreshing ? 'Refreshing...' : 'Refresh Data'}
              </button>
              <button onClick={() => navigate('/security?scan=1')} className="btn btn-ghost"><ScanSearch size={16} /> Run security scan</button>
            </div>
          </div>
          <HeroArt className="mx-auto hidden w-full max-w-[420px] drop-shadow-[0_20px_40px_rgba(139,108,255,.35)] md:block" />
        </div>
      </GlassCard>

      {/* ---------------------------------------------------------------- summary */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard to="/resources" icon={Server} label="Total Resources" color="#38d5f5" value={summary.total_resources.value}
          trend={summary.total_resources.change_pct} trendLabel={signed(summary.total_resources.change_pct)} hint="vs. last month" spark={summary.total_resources.spark} />
        <MetricCard to="/security" icon={ShieldCheck} label="Security Score" color="#34d399" value={`${summary.security_score.value}%`}
          trend={summary.security_score.change_pct} trendLabel={signed(summary.security_score.change_pct)} hint="vs. last month" spark={summary.security_score.spark} />
        <MetricCard to="/costs" icon={Wallet} label="Monthly Estimated Cost" color="#8b6cff" value={currency(summary.monthly_cost.value)} goodWhen="down"
          trend={summary.monthly_cost.change_pct} trendLabel={signed(summary.monthly_cost.change_pct)} hint="vs. last month" spark={summary.monthly_cost.spark} />
        <MetricCard to="/alerts" icon={Bell} label="Active Alerts" color="#fb7185" value={String(summary.active_alerts.value).padStart(2, '0')} goodWhen="down"
          trend={summary.active_alerts.new_today} trendLabel={`+${summary.active_alerts.new_today} today`} spark={summary.active_alerts.spark} />
      </div>

      {/* ---------------------------------------------------------------- utilisation + performance */}
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-5"><UtilizationCard utilization={data.utilization} resourceCount={summary.total_resources.value} /></div>
        <div className="lg:col-span-7"><PerformanceChart /></div>
      </div>

      {/* ---------------------------------------------------------------- security + cost */}
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-4"><SecurityOverview security={data.security} /></div>
        <div className="lg:col-span-8"><CostCard cost={data.cost} /></div>
      </div>

      {/* ---------------------------------------------------------------- alerts + anomalies */}
      <div className="grid gap-5 lg:grid-cols-2">
        <GlassCard>
          <SectionTitle title="Recent Alerts" subtitle="Latest issues that need attention" to="/alerts" />
          <div className="space-y-3">
            {data.alerts.length === 0
              ? <EmptyState icon={CheckCircle2} title="No active alerts" message="Everything looks healthy right now." />
              : data.alerts.map((a) => <AlertItem key={a._id} alert={a} compact />)}
          </div>
        </GlassCard>
        <GlassCard>
          <SectionTitle title="Anomaly Detection" subtitle={`${data.anomaly_count} anomalies found with z-score analysis`} to="/analytics" linkLabel="Analytics" />
          <div className="space-y-3">
            {data.anomalies.length === 0
              ? <EmptyState icon={Activity} title="No anomalies" message="All metrics are within their normal range." />
              : data.anomalies.slice(0, 4).map((a) => <AnomalyItem key={a.id} anomaly={a} />)}
          </div>
        </GlassCard>
      </div>

      {/* ---------------------------------------------------------------- recommendations */}
      <section>
        <SectionTitle title="Recommendations" subtitle={`${data.open_recommendations} open · ${currency(summary.monthly_cost.value ? data.cost.summary.potential_savings : 0)}/month potential savings`} to="/recommendations" />
        {data.recommendations.length === 0
          ? <GlassCard><EmptyState icon={CheckCircle2} title="You're all optimized" message="No open recommendations." /></GlassCard>
          : <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{data.recommendations.map((r) => <RecommendationCard key={r._id} rec={r} onReview={goReview} compact />)}</div>}
      </section>

      {/* ---------------------------------------------------------------- resource snapshot */}
      <section>
        <SectionTitle title="Cloud Resource Snapshot" subtitle="Key resources at a glance" to="/resources" linkLabel="All resources" />
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{data.resources.map((r) => <ResourceCard key={r._id} resource={r} />)}</div>
      </section>

      <ActivitySection data={data} />
    </div>
  )
}
