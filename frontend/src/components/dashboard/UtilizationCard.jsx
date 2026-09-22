import { Cpu, Gauge, HardDrive, MemoryStick, Network } from 'lucide-react'
import GlassCard from '../ui/GlassCard'
import ProgressRing, { levelColors } from '../ui/ProgressRing'

const METRICS = [
  { key: 'cpu', label: 'CPU', icon: Cpu, colors: ['#38d5f5', '#4c8dff'] },
  { key: 'memory', label: 'Memory', icon: MemoryStick, colors: ['#8b6cff', '#e879f9'] },
  { key: 'storage', label: 'Storage', icon: HardDrive, colors: ['#34d399', '#38d5f5'] },
  { key: 'network', label: 'Network', icon: Network, colors: ['#5b9dff', '#8b6cff'] },
]

export default function UtilizationCard({ utilization, resourceCount }) {
  return (
    <GlassCard className="h-full">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="h-display text-base font-semibold">Resource Utilization</h3>
          <p className="mt-0.5 text-xs text-muted">Real-time cloud resource performance</p>
        </div>
        <span className="chip border-ok/35 bg-ok/12 text-ok"><span className="live-dot" /> Live</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {METRICS.map(({ key, label, icon: Icon, colors }) => {
          const value = utilization[key]
          const [from, to] = value >= 75 ? levelColors(value) : colors
          return (
            <div key={key} className="inset flex flex-col items-center gap-3 p-4">
              <ProgressRing value={value} size={104} stroke={9} from={from} to={to}>
                <div><p className="num text-xl font-semibold">{Math.round(value)}<span className="text-xs font-normal text-muted">%</span></p></div>
              </ProgressRing>
              <div className="flex items-center gap-2 text-sm font-semibold"><Icon size={15} style={{ color: from }} />{label}</div>
            </div>
          )
        })}
      </div>
      <p className="mt-4 flex items-center gap-2 text-xs text-muted"><Gauge size={14} /> Fleet average across {resourceCount} resources</p>
    </GlassCard>
  )
}
