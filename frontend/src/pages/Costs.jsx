import { useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowRight, PiggyBank, TrendingDown, Wallet, Zap } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import GlassCard from '../components/ui/GlassCard'
import ChartCard from '../components/cloud/ChartCard'
import ChartTooltip from '../components/ui/ChartTooltip'
import RecommendationCard from '../components/cloud/RecommendationCard'
import RecommendationModal from '../components/recommendations/RecommendationModal'
import { CardSkeleton, Skeleton } from '../components/ui/LoadingSkeleton'
import { EmptyState, ErrorState } from '../components/ui/StateViews'
import { useApi } from '../hooks/useApi'
import { useData } from '../context/DataContext'
import { api } from '../services/api'
import { CHART, TYPE_META } from '../utils/constants'
import { currency, signed } from '../utils/format'

function StatCard({ icon: Icon, label, value, tone = 'accent', hint }) {
  const cls = { accent: 'text-accent bg-accent/15', ok: 'text-ok bg-ok/15', warn: 'text-warn bg-warn/15', danger: 'text-danger bg-danger/15' }[tone]
  return (
    <GlassCard pad="p-5">
      <div className={`mb-3 grid h-10 w-10 place-items-center rounded-2xl ${cls}`}><Icon size={19} /></div>
      <p className="text-xs text-muted">{label}</p>
      <p className="num mt-1 text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </GlassCard>
  )
}

export default function Costs() {
  const { bump } = useData()
  const [focus, setFocus] = useState(null)
  const { data, loading, error, retry, reload } = useApi(api.costs, [])
  const { data: recData, reload: reloadRecs } = useApi(() => api.recommendations({ category: 'cost', status: 'open' }), [])

  if (loading && !data) return (
    <div className="space-y-5"><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{[0, 1, 2, 3].map((i) => <CardSkeleton key={i} lines={1} />)}</div><Skeleton className="h-80 w-full" /></div>
  )
  if (error && !data) return <ErrorState message={error} onRetry={retry} />

  const { summary, by_service: byService, by_month: byMonth, by_resource: byResource } = data
  const donut = byService.map((s) => ({ name: s.name, value: s.current, color: TYPE_META[s.key].color }))
  const idleList = byResource.filter((r) => r.cost === 0 || r.cost < 15)

  const afterApply = async () => { await Promise.all([reload(), reloadRecs()]); bump() }

  return (
    <div className="space-y-5">
      <PageHeader title="Cost Optimization" subtitle="Track spend, forecast next month, and act on savings opportunities." />

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Wallet} label="Monthly Cost" value={currency(summary.monthly_cost)} tone="accent" hint={`${signed(summary.change_pct)} vs last month`} />
        <StatCard icon={TrendingDown} label="Projected Cost" value={currency(summary.projected_cost)} tone="warn" hint="Month-end estimate" />
        <StatCard icon={PiggyBank} label="Potential Savings" value={currency(summary.potential_savings)} tone="ok" hint="From open recommendations" />
        <StatCard icon={Zap} label="Idle Resources" value={summary.idle_resources} tone="danger" hint="Low utilization, still billed" />
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        <ChartCard title="Cost by month" subtitle="Total spend, last 6 months" className="lg:col-span-8">
          <div className="h-[280px] w-full">
            <ResponsiveContainer>
              <AreaChart data={byMonth} margin={{ top: 6, right: 4, left: -8, bottom: 0 }}>
                <defs><linearGradient id="costM" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={CHART.cost} stopOpacity=".38" /><stop offset="1" stopColor={CHART.cost} stopOpacity="0" /></linearGradient></defs>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} width={56} />
                <Tooltip content={<ChartTooltip formatValue={(v) => currency(v)} />} />
                <Area type="monotone" dataKey="total" name="Total cost" stroke={CHART.cost} fill="url(#costM)" strokeWidth={2.4} dot={{ r: 3, strokeWidth: 0, fill: CHART.cost }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
        <ChartCard title="Cost by service" subtitle="Current month share" className="lg:col-span-4">
          <div className="h-[200px] w-full">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={donut} dataKey="value" nameKey="name" innerRadius={54} outerRadius={82} paddingAngle={3} strokeWidth={0}>
                  {donut.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Pie>
                <Tooltip content={<ChartTooltip formatValue={(v) => currency(v)} />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-2">
            {byService.map((s) => (
              <div key={s.key} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted"><span className="h-2.5 w-2.5 rounded-full" style={{ background: TYPE_META[s.key].color }} />{s.name}</span>
                <span className="num font-semibold">{currency(s.current)} <span className="text-xs font-normal text-muted">({s.share}%)</span></span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Cost by resource" subtitle="Top 10 most expensive resources this month">
        <div className="h-[260px] w-full">
          <ResponsiveContainer>
            <BarChart data={byResource} layout="vertical" margin={{ top: 4, right: 24, left: 10, bottom: 0 }}>
              <CartesianGrid stroke={CHART.grid} horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
              <YAxis type="category" dataKey="name" width={150} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} content={<ChartTooltip formatValue={(v) => currency(v)} />} />
              <Bar dataKey="cost" name="Monthly cost" radius={[0, 8, 8, 0]} maxBarSize={18}>
                {byResource.map((r) => <Cell key={r.id} fill={TYPE_META[r.type].color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div><h3 className="h-display text-lg font-semibold">Optimization Recommendations</h3><p className="text-xs text-muted">Apply a recommendation to simulate the change instantly</p></div>
        </div>
        {!recData ? <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <CardSkeleton key={i} />)}</div>
          : recData.items.length === 0 ? <GlassCard><EmptyState icon={PiggyBank} title="No cost recommendations" message="Your environment is already cost-optimized." /></GlassCard>
          : <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{recData.items.map((r) => <RecommendationCard key={r._id} rec={r} onReview={setFocus} />)}</div>}
      </section>

      <RecommendationModal rec={focus} onClose={() => setFocus(null)} onApplied={afterApply} />
    </div>
  )
}
