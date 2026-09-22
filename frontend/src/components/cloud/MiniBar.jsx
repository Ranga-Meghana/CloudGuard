import { levelColors } from '../ui/ProgressRing'

/** Thin labelled progress bar; colour shifts to amber/red on high values. */
export default function MiniBar({ label, value, suffix = '%' }) {
  if (value == null) {
    return (
      <div>
        <div className="mb-1 flex justify-between text-[11px] text-muted"><span>{label}</span><span>—</span></div>
        <div className="h-1.5 rounded-full bg-white/8" />
      </div>
    )
  }
  const [from, to] = levelColors(value)
  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px]"><span className="text-muted">{label}</span><span className="num font-semibold">{Math.round(value)}{suffix}</span></div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.min(100, value)}%`, background: `linear-gradient(90deg, ${from}, ${to})` }} />
      </div>
    </div>
  )
}
