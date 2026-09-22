import GlassCard from '../ui/GlassCard'

/** Titled glass card that hosts a chart. */
export default function ChartCard({ title, subtitle, actions, children, className = '' }) {
  return (
    <GlassCard className={className}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="h-display text-base font-semibold">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
        </div>
        {actions}
      </div>
      {children}
    </GlassCard>
  )
}
