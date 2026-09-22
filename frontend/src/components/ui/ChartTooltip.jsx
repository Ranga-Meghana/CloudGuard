/** Glass tooltip for Recharts. formatValue(value, key) and formatLabel(label) are optional. */
export default function ChartTooltip({ active, payload, label, formatValue, formatLabel }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-2xl border border-white/15 bg-[#0b1230]/90 px-3.5 py-2.5 text-xs shadow-2xl backdrop-blur-xl">
      <p className="mb-1.5 font-semibold text-ink">{formatLabel ? formatLabel(label) : label}</p>
      {payload.map((p) => (
        <div key={p.dataKey || p.name} className="flex items-center justify-between gap-6 py-0.5">
          <span className="flex items-center gap-2 text-muted">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.stroke || p.fill }} />
            {p.name}
          </span>
          <span className="num font-semibold text-ink">{formatValue ? formatValue(p.value, p.dataKey) : p.value}</span>
        </div>
      ))}
    </div>
  )
}
