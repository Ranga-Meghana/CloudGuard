import { useId } from 'react'

/** CloudGuard mark: a cloud with a shield inside. Drawn as inline SVG (no external assets). */
export function LogoMark({ size = 40 }) {
  const id = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#38d5f5" /><stop offset="1" stopColor="#8b6cff" />
        </linearGradient>
      </defs>
      <path d="M11 30a7 7 0 0 1-1.3-13.9A9.5 9.5 0 0 1 28 13.6 8 8 0 0 1 29 30H11z" fill={`url(#${id})`} fillOpacity=".28" stroke={`url(#${id})`} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M20 15.5l6 2.3v4.6c0 3.5-2.4 6-6 7.3-3.6-1.3-6-3.8-6-7.3v-4.6l6-2.3z" fill={`url(#${id})`} />
      <path d="M17.2 22.2l2.2 2.2 3.8-4" stroke="#07102a" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function Logo({ size = 38, showTagline = true, collapsed = false }) {
  return (
    <div className="flex items-center gap-3">
      <LogoMark size={size} />
      {!collapsed && (
        <div className="leading-tight">
          <div className="h-display text-[1.05rem] font-bold tracking-[0.14em]">CLOUDGUARD</div>
          {showTagline && <div className="text-[11px] text-muted">Secure. Monitor. Optimize.</div>}
        </div>
      )}
    </div>
  )
}
