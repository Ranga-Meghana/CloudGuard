import { useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import Tabs from '../components/ui/Tabs'
import ChartCard from '../components/cloud/ChartCard'
import ChartTooltip from '../components/ui/ChartTooltip'
import AnomalyItem from '../components/cloud/AnomalyItem'
import GlassCard from '../components/ui/GlassCard'
import { Skeleton } from '../components/ui/LoadingSkeleton'
import { EmptyState, ErrorState } from '../components/ui/StateViews'
import { useApi } from '../hooks/useApi'
import { api } from '../services/api'
import { CHART } from '../utils/constants'
import { currency, tickFormatter, tooltipDate } from '../utils/format'

const RANGES = [{ value: '24h', label: '24 Hours' }, { value: '7d', label: '7 Days' }, { value: '30d', label: '30 Days' }, { value: '90d', label: '90 Days' }]
const CHARTS = [
  { key: 'cpu', title: 'CPU Utilization', color: CHART.cpu, fmt: (v) => `${v.toFixed(1)}%` },
  { key: 'memory', title: 'Memory Utilization', color: CHART.memory, fmt: (v) => `${v.toFixed(1)}%` },
  { key: 'network', title: 'Network Traffic', color: CHART.network, fmt: (v) => `${v.toFixed(1)}%` },
  { key: 'storage', title: 'Storage Usage', color: CHART.storage, fmt: (v) => `${v.toFixed(1)}%` },
]

function InsightIcon({ tone }) {
  if (tone === 'warning') return <ArrowUpRight size={15} className="text-warn" />
  if (tone === 'positive') return <ArrowDownRight size={15} className="text-ok" />
  return <Minus size={15} className="text-accent" />
}

export default function Analytics() {
  const [range, setRange] = useState('7d')
  const { data, loading, error, retry } = useApi(() => api.analytics(range), [range])
  const { data: anomData } = useApi(() => api.anomalies(10), [])

  return (
    <div className="space-y-5">
      <PageHeader title="Analytics" subtitle="Deep-dive charts, trend insights and anomaly detection across your fleet."
        actions={<Tabs options={RANGES} value={range} onChange={setRange} />} />

      {error && !data ? <ErrorState message={error} onRetry={retry} /> : loading && !data ? (
        <div className="grid gap-5 lg:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-72 w-full" />)}</div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {data.insights.map((i) => (
              <GlassCard key={i.id} pad="p-4" className="flex items-start gap-3">
                <div className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${i.tone === 'warning' ? 'bg-warn/15' : i.tone === 'positive' ? 'bg-ok/15' : 'bg-accent/15'}`}><InsightIcon tone={i.tone} /></div>
                <div><p className="text-xs font-semibold text-muted">{i.title}</p><p className="mt-0.5 text-[13px] leading-snug">{i.text}</p></div>
              </GlassCard>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {CHARTS.map(({ key, title, color, fmt }) => (
              <ChartCard key={key} title={title} subtitle={`${RANGES.find((r) => r.value === range).label} trend`}>
                <div className="h-[220px] w-full">
                  <ResponsiveContainer>
                    <AreaChart data={data.series} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
                      <defs><linearGradient id={`an-${key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity=".32" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
                      <CartesianGrid stroke={CHART.grid} vertical={false} />
                      <XAxis dataKey="ts" tickFormatter={tickFormatter(range)} tickLine={false} axisLine={false} minTickGap={40} />
                      <YAxis domain={[0, 100]} tickLine={false} axisLine={false} width={40} tickFormatter={(v) => `${v}%`} />
                      <Tooltip content={<ChartTooltip formatLabel={(l) => tooltipDate(l, range)} formatValue={fmt} />} />
                      <Area type="monotone" dataKey={key} name={title} stroke={color} fill={`url(#an-${key})`} strokeWidth={2.2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            ))}
          </div>

          <ChartCard title="Cloud Cost & Security Events" subtitle="Spend (line) vs. security events (bars) over the selected range">
            <div className="h-[240px] w-full">
              <ResponsiveContainer>
                <ComposedChart data={data.series} margin={{ top: 4, right: 4, left: -8, bottom: 0 }}>
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis dataKey="ts" tickFormatter={tickFormatter(range)} tickLine={false} axisLine={false} minTickGap={40} />
                  <YAxis yAxisId="cost" tickLine={false} axisLine={false} width={54} tickFormatter={(v) => `$${v}`} />
                  <YAxis yAxisId="events" orientation="right" tickLine={false} axisLine={false} width={36} />
                  <Tooltip content={<ChartTooltip formatLabel={(l) => tooltipDate(l, range)} formatValue={(v, key) => key === 'cost' ? currency(v) : v} />} />
                  <Bar yAxisId="events" dataKey="security_events" name="Security events" fill={CHART.events} fillOpacity={0.5} radius={[4, 4, 0, 0]} maxBarSize={10} />
                  <Line yAxisId="cost" type="monotone" dataKey="cost" name="Cost" stroke={CHART.cost} strokeWidth={2.4} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </>
      )}

      <GlassCard>
        <div className="mb-4 flex items-center justify-between">
          <div><h3 className="h-display text-base font-semibold">Anomaly Detection</h3><p className="text-xs text-muted">Statistical z-score analysis (window average ± 3σ, or a hard threshold)</p></div>
          <Activity size={18} className="text-muted" />
        </div>
        {!anomData ? <div className="space-y-2.5">{[0, 1].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
          : anomData.items.length === 0 ? <EmptyState icon={Activity} title="No anomalies detected" message="All monitored metrics are within their normal statistical range." />
          : <div className="grid gap-3 md:grid-cols-2">{anomData.items.map((a) => <AnomalyItem key={a.id} anomaly={a} />)}</div>}
      </GlassCard>
    </div>
  )
}
