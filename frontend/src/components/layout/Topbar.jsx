import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, Cloud, LogOut, Menu, RefreshCw, Search, Settings, ShieldCheck, User, X } from 'lucide-react'
import SearchBar from '../ui/SearchBar'
import { SeverityBadge } from '../ui/Badges'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { useClickOutside } from '../../hooks/useClickOutside'
import { useDebounce } from '../../hooks/useDebounce'
import { api } from '../../services/api'
import { timeAgo } from '../../utils/format'
import { TYPE_META } from '../../utils/constants'

const TITLES = {
  '/': 'Dashboard', '/resources': 'Cloud Resources', '/security': 'Security', '/costs': 'Cost Optimization',
  '/analytics': 'Analytics', '/alerts': 'Alerts', '/recommendations': 'Recommendations', '/settings': 'Settings',
}

function GlobalSearch({ onDone }) {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const debounced = useDebounce(q, 250)
  const ref = useRef(null)
  useClickOutside(ref, () => setOpen(false))

  useEffect(() => {
    if (!debounced.trim()) { setResults([]); return }
    let alive = true
    api.resources({ q: debounced }).then((r) => alive && setResults(r.items.slice(0, 5))).catch(() => alive && setResults([]))
    return () => { alive = false }
  }, [debounced])

  const go = (path) => { setOpen(false); setQ(''); onDone?.(); navigate(path) }

  return (
    <div ref={ref} className="relative w-full" onFocus={() => setOpen(true)}>
      <form onSubmit={(e) => { e.preventDefault(); if (q.trim()) go(`/resources?q=${encodeURIComponent(q.trim())}`) }}>
        <SearchBar value={q} onChange={(v) => { setQ(v); setOpen(true) }} placeholder="Search resources, regions..." />
      </form>
      {open && q.trim() && (
        <div className="glass absolute left-0 right-0 top-[calc(100%+8px)] z-50 animate-scale-in !rounded-2xl !bg-[#0c1330]/90 p-2">
          {results.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-muted">No resources match “{q}”.</p>
          ) : (
            <>
              {results.map((r) => {
                const Icon = TYPE_META[r.type].icon
                return (
                  <button key={r._id} onClick={() => go(`/resources/${r._id}`)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-white/8">
                    <Icon size={17} style={{ color: TYPE_META[r.type].color }} />
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{r.name}</span>
                      <span className="block text-xs text-muted">{r.service} · {r.region}</span></span>
                  </button>
                )
              })}
              <button onClick={() => go(`/resources?q=${encodeURIComponent(q.trim())}`)} className="mt-1 w-full rounded-xl px-3 py-2 text-center text-xs font-semibold text-accent hover:bg-white/8">
                See all results
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function NotificationMenu({ alerts, unread }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useClickOutside(ref, () => setOpen(false), open)
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="icon-btn relative" aria-label={`Notifications (${unread} unread)`}>
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid min-w-[1.1rem] place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            <span className="absolute inset-0 animate-ping2 rounded-full bg-danger" />
            <span className="relative">{unread}</span>
          </span>
        )}
      </button>
      {open && (
        <div className="glass fixed inset-x-4 top-[88px] z-50 animate-scale-in !rounded-2xl !bg-[#0c1330]/95 p-2 sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+10px)] sm:w-[360px]">
          <div className="flex items-center justify-between px-3 py-2">
            <p className="text-sm font-semibold">Notifications</p>
            <span className="text-xs text-muted">{unread} unread</span>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {alerts.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted">You're all caught up.</p>}
            {alerts.slice(0, 5).map((a) => (
              <Link key={a._id} to="/alerts" onClick={() => setOpen(false)} className="flex items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-white/8">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${a.read ? 'bg-white/20' : 'bg-accent'}`} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{a.title}</span>
                  <span className="block truncate text-xs text-muted">{a.resource_name} · {timeAgo(a.created_at)}</span>
                </span>
                <SeverityBadge severity={a.severity} />
              </Link>
            ))}
          </div>
          <Link to="/alerts" onClick={() => setOpen(false)} className="mt-1 block rounded-xl px-3 py-2 text-center text-xs font-semibold text-accent hover:bg-white/8">View all alerts</Link>
        </div>
      )}
    </div>
  )
}

function ProfileMenu() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useClickOutside(ref, () => setOpen(false), open)
  const item = 'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-white/8'
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex h-10 items-center gap-2.5 rounded-2xl border border-white/12 bg-white/7 pl-1.5 pr-2 hover:bg-white/12 sm:pr-3" aria-haspopup="menu" aria-expanded={open}>
        <span className="grid h-7 w-7 place-items-center rounded-xl bg-gradient-to-br from-accent to-violet text-xs font-bold text-[#051022]">{(user?.name || 'U')[0]}</span>
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-[13px] font-semibold">{user?.name}</span>
          <span className="block text-[10px] text-muted">{user?.role}</span>
        </span>
        <ChevronDown size={15} className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="glass absolute right-0 top-[calc(100%+10px)] z-50 w-64 animate-scale-in !rounded-2xl !bg-[#0c1330]/95 p-2" role="menu">
          <div className="px-3 py-2.5">
            <p className="text-sm font-semibold">{user?.name}</p>
            <p className="truncate text-xs text-muted">{user?.email}</p>
          </div>
          <div className="divider my-1" />
          <Link to="/settings" onClick={() => setOpen(false)} className={item}><User size={16} className="text-muted" /> Profile & settings</Link>
          <Link to="/security" onClick={() => setOpen(false)} className={item}><ShieldCheck size={16} className="text-muted" /> Security center</Link>
          <Link to="/settings#cloud" onClick={() => setOpen(false)} className={item}><Settings size={16} className="text-muted" /> Cloud environment</Link>
          <div className="divider my-1" />
          <button onClick={logout} className={`${item} text-danger`}><LogOut size={16} /> Sign out</button>
        </div>
      )}
    </div>
  )
}

export default function Topbar({ onMenu, alerts, unread }) {
  const { pathname } = useLocation()
  const { refresh, refreshing } = useData()
  const [mobileSearch, setMobileSearch] = useState(false)
  const section = '/' + pathname.split('/')[1]
  const title = TITLES[section] || 'CloudGuard'

  return (
    <header className="sticky top-4 z-30 mb-6">
      <div className="glass flex items-center gap-3 !rounded-[24px] px-3 py-2.5 sm:px-4">
        <button onClick={onMenu} className="icon-btn lg:hidden" aria-label="Open menu"><Menu size={19} /></button>
        <div className="min-w-0 shrink-0">
          <p className="hidden text-[11px] text-muted sm:block">CloudGuard <span className="mx-1 opacity-50">/</span> {title}</p>
          <h2 className="h-display truncate text-base font-semibold sm:text-lg">{title}</h2>
        </div>

        <div className="mx-auto hidden w-full max-w-md md:block"><GlobalSearch /></div>

        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <button onClick={() => setMobileSearch((s) => !s)} className="icon-btn md:hidden" aria-label="Search">{mobileSearch ? <X size={18} /> : <Search size={18} />}</button>
          <div className="hidden items-center gap-2 rounded-2xl border border-ok/30 bg-ok/10 px-3 py-2 text-xs font-semibold text-ok xl:flex" title="Connected to the simulated AWS environment">
            <span className="live-dot" /> <Cloud size={14} /> Cloud Connected
          </div>
          <button onClick={refresh} disabled={refreshing} className="icon-btn" aria-label="Refresh data" title="Refresh data">
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <NotificationMenu alerts={alerts} unread={unread} />
          <ProfileMenu />
        </div>
      </div>
      {mobileSearch && <div className="glass mt-2 animate-scale-in !rounded-2xl p-2 md:hidden"><GlobalSearch onDone={() => setMobileSearch(false)} /></div>}
    </header>
  )
}
