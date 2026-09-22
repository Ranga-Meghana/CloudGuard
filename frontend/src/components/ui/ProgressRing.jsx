import { useEffect, useId, useState } from 'react'

/** Circular gauge with a gradient stroke. Animates from 0 on mount. */
export default function ProgressRing({ value = 0, size = 96, stroke = 9, from = '#38d5f5', to = '#8b6cff', children, track = 'rgba(255,255,255,0.09)' }) {
  const id = useId()
  const [shown, setShown] = useState(0)
  useEffect(() => {
    const t = requestAnimationFrame(() => setShown(value))
    return () => cancelAnimationFrame(t)
  }, [value])
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={from} /><stop offset="1" stopColor={to} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${id})`} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (Math.min(100, Math.max(0, shown)) / 100) * c}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.22,1,.36,1)' }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  )
}

/** Colour pair for a utilisation value: calm cyan/violet, amber when high, red when critical. */
export function levelColors(value) {
  if (value >= 90) return ['#fb7185', '#ff4d6d']
  if (value >= 75) return ['#fbbf24', '#fb923c']
  return ['#38d5f5', '#8b6cff']
}
