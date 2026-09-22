import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

/** Month calendar whose cells are shaded by the number of security events on that day. */
export default function ActivityCalendar({ activity, today }) {
  const todayDate = new Date(`${today}T00:00:00`)
  const [cursor, setCursor] = useState(new Date(todayDate.getFullYear(), todayDate.getMonth(), 1))
  const byDate = useMemo(() => Object.fromEntries(activity.map((a) => [a.date, a.events])), [activity])
  const max = Math.max(1, ...activity.map((a) => a.events))

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const first = new Date(year, month, 1).getDay()
  const total = new Date(year, month + 1, 0).getDate()
  const cells = [...Array(first).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)]
  const key = (d) => `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h4 className="h-display text-lg font-semibold">{cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h4>
        <div className="flex gap-2">
          <button className="icon-btn !h-9 !w-9 !rounded-full" onClick={() => setCursor(new Date(year, month - 1, 1))} aria-label="Previous month"><ChevronLeft size={16} /></button>
          <button className="icon-btn !h-9 !w-9 !rounded-full" onClick={() => setCursor(new Date(year, month + 1, 1))} aria-label="Next month"><ChevronRight size={16} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-center sm:gap-2">
        {WEEKDAYS.map((d, i) => <div key={i} className="pb-1 text-xs font-semibold text-muted">{d}</div>)}
        {cells.map((d, i) => {
          if (d == null) return <div key={`e${i}`} />
          const events = byDate[key(d)]
          const isToday = key(d) === today
          const alpha = events == null ? 0 : 0.1 + (events / max) * 0.45
          return (
            <div key={d} title={events != null ? `${events} security events` : 'No data'}
              className={`grid aspect-square place-items-center rounded-full text-sm transition-transform hover:scale-110 sm:rounded-2xl ${isToday ? 'font-bold text-[#051022]' : events != null ? 'font-semibold' : 'text-muted/60'}`}
              style={isToday ? { background: 'rgb(var(--accent))', boxShadow: '0 0 18px rgb(var(--accent) / .6)' } : events != null ? { background: `rgb(var(--accent) / ${alpha})` } : undefined}>
              {d}
            </div>
          )
        })}
      </div>
      <div className="mt-4 flex items-center gap-2 text-[11px] text-muted">
        <span>Fewer events</span>
        {[0.12, 0.25, 0.4, 0.55].map((a) => <span key={a} className="h-3 w-5 rounded-full" style={{ background: `rgb(var(--accent) / ${a})` }} />)}
        <span>More events</span>
      </div>
    </div>
  )
}
