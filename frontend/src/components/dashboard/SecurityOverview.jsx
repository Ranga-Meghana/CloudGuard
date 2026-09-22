import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import GlassCard from '../ui/GlassCard'
import ProgressRing from '../ui/ProgressRing'
import { SEVERITY, SEVERITY_LIST } from '../../utils/constants'

export default function SecurityOverview({ security }) {
  const max = Math.max(1, ...Object.values(security.counts))
  return (
    <GlassCard className="flex h-full flex-col">
      <h3 className="h-display text-base font-semibold">Security Overview</h3>
      <p className="mt-0.5 text-xs text-muted">{security.total_active} active findings across your environment</p>

      <div className="my-5 flex items-center gap-5">
        <ProgressRing value={security.score} size={116} stroke={10} from="#34d399" to="#38d5f5">
          <div><p className="num text-3xl font-semibold leading-none">{security.score}</p><p className="mt-1 text-[10px] text-muted">of 100</p></div>
        </ProgressRing>
        <div>
          <p className="text-sm text-muted">Security Score</p>
          <p className="num text-xl font-semibold">{security.score}/100</p>
          <p className="mt-1 text-xs text-ok">{security.score >= 90 ? 'Strong posture' : security.score >= 75 ? 'Good, room to improve' : 'Needs attention'}</p>
        </div>
      </div>

      <div className="flex-1 space-y-3">
        {SEVERITY_LIST.map((s) => (
          <div key={s} className="flex items-center gap-3">
            <span className="w-16 text-xs font-semibold" style={{ color: SEVERITY[s].color }}>{SEVERITY[s].label}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${(security.counts[s] / max) * 100}%`, background: SEVERITY[s].color }} />
            </div>
            <span className="num w-5 text-right text-sm font-semibold">{security.counts[s]}</span>
          </div>
        ))}
      </div>
      <Link to="/security" className="btn btn-primary mt-6 w-full">View Security <ArrowRight size={16} /></Link>
    </GlassCard>
  )
}
