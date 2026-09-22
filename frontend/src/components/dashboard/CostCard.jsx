import { Link } from 'react-router-dom'
import { ArrowRight, PiggyBank } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import GlassCard from '../ui/GlassCard'
import ChartTooltip from '../ui/ChartTooltip'
import { currency } from '../../utils/format'

export default function CostCard({ cost }) {
  const { summary, by_service: services } = cost
  const stats = [
    ['Current month', summary.monthly_cost, '#38d5f5'],
    ['Previous month', summary.previous_month, '#8b6cff'],
    ['Projected month-end', summary.projected_cost, '#34d399'],
  ]
  return (
    <GlassCard className="h-full">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="h-display text-base font-semibold">Cloud Cost</h3>
          <p className="mt-0.5 text-xs text-muted">Estimated spend by service category</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {stats.map(([label, value, color]) => (
            <div key={label} className="inset px-3.5 py-2">
              <p className="flex items-center gap-1.5 text-[11px] text-muted"><span className="h-2 w-2 rounded-full" style={{ background: color }} />{label}</p>
              <p className="num text-base font-semibold">{currency(value)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="h-[230px] w-full">
        <ResponsiveContainer>
          <BarChart data={services} margin={{ top: 4, right: 4, left: -8, bottom: 0 }} barGap={6}>
            <CartesianGrid stroke="rgba(255,255,255,0.07)" vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} width={52} />
            <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} content={<ChartTooltip formatValue={(v) => currency(v)} />} />
            <Bar dataKey="current" name="Current month" fill="#38d5f5" radius={[8, 8, 0, 0]} maxBarSize={34} animationDuration={900} />
            <Bar dataKey="previous" name="Previous month" fill="#8b6cff" fillOpacity={0.75} radius={[8, 8, 0, 0]} maxBarSize={34} animationDuration={900} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-ok/25 bg-ok/10 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-ok/20 text-ok"><PiggyBank size={20} /></div>
          <p className="text-sm">Estimated savings opportunity: <span className="num font-semibold text-ok">{currency(summary.potential_savings)}/month</span></p>
        </div>
        <Link to="/costs" className="btn btn-primary btn-sm">Optimize Costs <ArrowRight size={15} /></Link>
      </div>
    </GlassCard>
  )
}
