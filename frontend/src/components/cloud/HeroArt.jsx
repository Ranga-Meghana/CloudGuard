import { useId } from 'react'

/** Decorative hero illustration: a glowing cloud + shield with orbiting resource nodes. */
export default function HeroArt({ className = '' }) {
  const id = useId()
  return (
    <svg viewBox="0 0 420 280" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}a`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#38d5f5" /><stop offset="1" stopColor="#8b6cff" /></linearGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#ffffff" stopOpacity=".28" /><stop offset="1" stopColor="#ffffff" stopOpacity=".04" /></linearGradient>
        <radialGradient id={`${id}g`} cx=".5" cy=".5" r=".5"><stop stopColor="#8b6cff" stopOpacity=".55" /><stop offset="1" stopColor="#8b6cff" stopOpacity="0" /></radialGradient>
        <filter id={`${id}s`}><feGaussianBlur stdDeviation="1.2" /></filter>
      </defs>
      <ellipse cx="215" cy="150" rx="190" ry="120" fill={`url(#${id}g)`} />
      {/* connections */}
      <g stroke="#fff" strokeOpacity=".22" strokeDasharray="3 5" fill="none">
        <path d="M215 140 L70 70" /><path d="M215 140 L350 60" /><path d="M215 140 L60 215" /><path d="M215 140 L360 220" />
      </g>
      {/* cloud */}
      <path d="M130 200a44 44 0 0 1-8-87.3A62 62 0 0 1 240 92a50 50 0 0 1 8 108z" fill={`url(#${id}b)`} stroke={`url(#${id}a)`} strokeWidth="2.5" strokeLinejoin="round" />
      {/* shield */}
      <path d="M186 106l58 22v42c0 30-22 52-58 64-36-12-58-34-58-64v-42z" transform="translate(29 -6) scale(.92)" fill={`url(#${id}a)`} opacity=".95" />
      <path d="M180 156l17 17 33-35" transform="translate(6 0)" stroke="#07102a" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* nodes */}
      {[[70, 70, 'S'], [350, 60, 'DB'], [60, 215, 'S3'], [360, 220, 'VM']].map(([x, y, t]) => (
        <g key={t}>
          <rect x={x - 22} y={y - 22} width="44" height="44" rx="14" fill="#ffffff" fillOpacity=".09" stroke="#ffffff" strokeOpacity=".28" />
          <text x={x} y={y + 5} textAnchor="middle" fontSize="13" fontWeight="700" fill="#e8ecff">{t}</text>
        </g>
      ))}
      <g filter={`url(#${id}s)`} fill="#7be7ff"><circle cx="112" cy="98" r="2.6" /><circle cx="318" cy="90" r="2.2" /><circle cx="110" cy="190" r="2" /><circle cx="330" cy="192" r="2.6" /></g>
    </svg>
  )
}
