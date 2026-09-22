/** Segmented pill control. options: [{ value, label, count? }] */
export default function Tabs({ options, value, onChange, className = '' }) {
  return (
    <div className={`no-scrollbar inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-white/5 p-1 ${className}`} role="tablist">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button key={o.value} role="tab" aria-selected={active} onClick={() => onChange(o.value)}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-1.5 text-sm font-semibold transition-all duration-200 ${
              active ? 'bg-white/15 text-ink shadow-[inset_0_1px_0_rgba(255,255,255,.15)]' : 'text-muted hover:text-ink'}`}>
            {o.label}
            {o.count != null && (
              <span className={`rounded-full px-1.5 text-[11px] ${active ? 'bg-accent/25 text-accent' : 'bg-white/10'}`}>{o.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
