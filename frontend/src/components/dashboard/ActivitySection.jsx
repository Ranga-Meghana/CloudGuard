import { Link } from 'react-router-dom'
import { ArrowRight, CalendarClock } from 'lucide-react'
import GlassCard from '../ui/GlassCard'
import ActivityCalendar from '../cloud/ActivityCalendar'

const DAY_STYLES = [
  'from-white/12 to-white/5', 'from-sky-400/20 to-white/5', 'from-violet/25 to-white/5',
]

/** Activity calendar + "recent days" rail (security events per day). */
export default function ActivitySection({ data }) {
  const tasks = [
    { text: `Review ${data.security.counts.critical + data.security.counts.high} critical & high findings`, to: '/security' },
    { text: `Act on ${data.open_recommendations} open recommendations`, to: '/recommendations' },
    { text: `Triage ${data.summary.active_alerts.value} active alerts`, to: '/alerts' },
    { text: `Investigate ${data.anomaly_count} detected anomalies`, to: '/analytics' },
  ]
  const days = [...data.recent_days].reverse()
  const max = Math.max(...days.map((d) => d.events), 1)

  return (
    <div className="grid gap-5 lg:grid-cols-12">
      <GlassCard className="lg:col-span-8">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 className="h-display text-base font-semibold">Activity Calendar</h3>
            <p className="mt-0.5 text-xs text-muted">Security events recorded per day</p>
          </div>
          <CalendarClock className="text-muted" size={20} />
        </div>
        <div className="grid gap-8 md:grid-cols-[1.3fr_1fr]">
          <ActivityCalendar activity={data.activity} today={data.today} />
          <div>
            <h4 className="mb-3 text-sm font-semibold">Suggested next steps</h4>
            <div className="space-y-2">
              {tasks.map((t) => (
                <Link key={t.text} to={t.to} className="inset group flex items-center justify-between gap-3 px-4 py-3 text-[13px] transition-colors hover:bg-white/10">
                  <span>{t.text}</span><ArrowRight size={15} className="shrink-0 text-muted transition-transform group-hover:translate-x-1 group-hover:text-accent" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </GlassCard>

      <div className="space-y-3 lg:col-span-4">
        {days.map((d, i) => {
          const date = new Date(`${d.date}T00:00:00`)
          const hot = d.events >= max * 0.85
          return (
            <div key={d.date} className={`glass flex items-center gap-4 !rounded-2xl bg-gradient-to-r px-5 py-3.5 ${DAY_STYLES[i % DAY_STYLES.length]}`}>
              <span className="num w-10 text-3xl font-semibold">{date.getDate()}</span>
              <div className="flex-1 leading-tight">
                <p className="text-[11px] text-muted">{date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                <p className="text-sm font-semibold">{date.toLocaleDateString('en-US', { weekday: 'long' })}{i === 0 ? ' · today' : ''}</p>
              </div>
              <span className={`num grid h-8 min-w-[2.6rem] place-items-center rounded-full px-2 text-sm font-bold ${hot ? 'bg-danger/90 text-white' : 'bg-white/90 text-[#0b1230]'}`} title="Security events">{d.events}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
