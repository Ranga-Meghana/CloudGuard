// Small formatting helpers used across the UI.
const usd = (digits) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: digits, maximumFractionDigits: digits })
const usd2 = usd(2)
const usd0 = usd(0)

export const currency = (n, digits = 2) => (n == null ? '—' : digits === 0 ? usd0.format(n) : usd2.format(n))
export const pct = (n, digits = 0) => (n == null ? '—' : `${Number(n).toFixed(digits)}%`)
export const signed = (n, digits = 1) => `${n > 0 ? '+' : ''}${Number(n).toFixed(digits)}%`

export function timeAgo(iso) {
  if (!iso) return '—'
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 45) return 'just now'
  const units = [[60, 'minute', 60], [3600, 'hour', 24], [86400, 'day', 30], [2592000, 'month', 12]]
  let value = seconds / 60
  let label = 'minute'
  for (const [secs, name] of units) {
    if (seconds >= secs) {
      value = seconds / secs
      label = name
    }
  }
  const n = Math.round(value)
  return `${n} ${label}${n === 1 ? '' : 's'} ago`
}

export const formatDate = (iso, opts = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  iso ? new Date(iso).toLocaleDateString('en-US', opts) : '—'

export const formatDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'

// Chart x-axis tick formatter depends on the selected range.
export function tickFormatter(range) {
  return (iso) => {
    const d = new Date(iso)
    if (range === '1h' || range === '24h') return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    if (range === '7d') return d.toLocaleDateString('en-US', { weekday: 'short' })
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
  }
}
export const tooltipDate = (iso, range) => {
  const d = new Date(iso)
  return range === '30d' || range === '90d'
    ? d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })
    : d.toLocaleString('en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })
}

export function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

export const cap = (s = '') => s.charAt(0).toUpperCase() + s.slice(1)
