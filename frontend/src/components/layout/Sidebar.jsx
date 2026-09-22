import { NavLink } from 'react-router-dom'
import { BarChart3, Bell, Cloud, Lightbulb, LayoutDashboard, LogOut, PanelLeftClose, PanelLeftOpen, Server, Settings, ShieldCheck, Wallet, X } from 'lucide-react'
import Logo from '../ui/Logo'
import { useAuth } from '../../context/AuthContext'

export const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/resources', label: 'Cloud Resources', icon: Server },
  { to: '/security', label: 'Security', icon: ShieldCheck },
  { to: '/costs', label: 'Cost Optimization', icon: Wallet },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/alerts', label: 'Alerts', icon: Bell, badge: true },
  { to: '/recommendations', label: 'Recommendations', icon: Lightbulb },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export default function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onCloseMobile, alertCount }) {
  const { user, logout } = useAuth()
  const initials = (user?.name || 'U').slice(0, 1).toUpperCase()

  return (
    <>
      {/* mobile backdrop */}
      <div onClick={onCloseMobile} className={`fixed inset-0 z-40 bg-[#03060f]/70 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`} />

      <aside className={`glass fixed bottom-4 left-4 top-4 z-50 flex flex-col !rounded-[28px] p-4 transition-all duration-300 ease-out
        ${collapsed ? 'lg:w-[84px]' : 'lg:w-[264px]'} w-[280px] ${mobileOpen ? 'translate-x-0' : '-translate-x-[120%] lg:translate-x-0'}`}>
        <div className={`flex items-center ${collapsed ? 'lg:justify-center' : 'justify-between'} px-1 pb-5 pt-1`}>
          <Logo collapsed={collapsed} />
          <button onClick={onCloseMobile} className="icon-btn !h-9 !w-9 lg:hidden" aria-label="Close menu"><X size={18} /></button>
        </div>

        <nav className="no-scrollbar flex-1 space-y-1 overflow-y-auto" aria-label="Main navigation">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end, badge }) => (
            <NavLink key={to} to={to} end={end} title={collapsed ? label : undefined}
              className={({ isActive }) => `group relative flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold transition-all duration-200
                ${collapsed ? 'lg:justify-center lg:px-0' : ''}
                ${isActive ? 'bg-white/12 text-ink shadow-[inset_0_1px_0_rgba(255,255,255,.14)]' : 'text-muted hover:bg-white/7 hover:text-ink'}`}>
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-accent shadow-[0_0_14px_rgb(var(--accent))]" />}
                  <Icon size={20} className={isActive ? 'text-accent' : ''} />
                  <span className={collapsed ? 'lg:hidden' : ''}>{label}</span>
                  {badge && alertCount > 0 && (
                    <span className={`ml-auto grid min-w-[1.4rem] place-items-center rounded-full bg-danger/90 px-1.5 text-[11px] font-bold text-white ${collapsed ? 'lg:absolute lg:right-2 lg:top-1.5 lg:ml-0 lg:min-w-[1.1rem] lg:px-1 lg:text-[10px]' : ''}`}>{alertCount}</span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <button onClick={onToggleCollapse} className="btn btn-ghost btn-sm mb-3 hidden self-stretch lg:inline-flex" title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? <PanelLeftOpen size={16} /> : <><PanelLeftClose size={16} /> Collapse</>}
        </button>

        <div className="divider mb-3" />
        <div className={`flex items-center gap-3 ${collapsed ? 'lg:flex-col' : ''}`}>
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-accent to-violet font-display text-sm font-bold text-[#051022]">{initials}</div>
          <div className={`min-w-0 flex-1 ${collapsed ? 'lg:hidden' : ''}`}>
            <p className="truncate text-sm font-semibold">{user?.name}</p>
            <p className="truncate text-xs text-muted">{user?.role}</p>
          </div>
          <button onClick={logout} className="icon-btn !h-9 !w-9" title="Logout" aria-label="Logout"><LogOut size={17} /></button>
        </div>
        <div className={`mt-3 flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-[11px] text-muted ${collapsed ? 'lg:hidden' : ''}`}>
          <Cloud size={13} className="text-accent" /> Demo Environment · AWS (Simulation)
        </div>
      </aside>
    </>
  )
}
