import { Link } from 'react-router-dom'
import { ArrowUpRight, TrendingDown, TrendingUp } from 'lucide-react'
import Sparkline from '../ui/Sparkline'

/**
 * Summary card. `trend` is a signed number; `goodWhen` says whether an increase is good ("up")
 * or bad ("down", e.g. cost / alerts) so the chip colour is meaningful.
 */
export default function MetricCard({ to, icon: Icon, label, value, trendLabel, trend = 0, goodWhen = 'up', spark, color = '#38d5f5', hint }) {
  const good = goodWhen === 'up' ? trend >= 0 : trend <= 0
  const TrendIcon = trend >= 0 ? TrendingUp : TrendingDown
  return (
    <Link to={to} className="glass glass-hover group relative block overflow-hidden p-5 sm:p-6">
      <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full opacity-40 blur-3xl transition-opacity group-hover:opacity-70" style={{ background: color }} />
      <div className="relative flex items-start justify-between">
        <div className="grid h-11 w-11 place-items-center rounded-2xl border border-white/15" style={{ background: `${color}26`, color }}>
          <Icon size={21} />
        </div>
        <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-muted transition-all group-hover:bg-white group-hover:text-[#051022]">
          <ArrowUpRight size={16} />
        </span>
      </div>
      <div className="relative mt-5">
        <p className="text-sm text-muted">{label}</p>
        <p className="num mt-1 text-[2rem] font-semibold leading-none">{value}</p>
        <div className="mt-3 flex items-center gap-2">
          <span className={`chip ${good ? 'border-ok/35 bg-ok/12 text-ok' : 'border-danger/35 bg-danger/12 text-danger'}`}>
            <TrendIcon size={12} /> {trendLabel}
          </span>
          {hint && <span className="truncate text-xs text-muted">{hint}</span>}
        </div>
      </div>
      <div className="relative -mx-1 mt-4"><Sparkline data={spark} color={color} height={38} /></div>
    </Link>
  )
}
