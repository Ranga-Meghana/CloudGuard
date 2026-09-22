import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from '../components/layout/Sidebar'
import Topbar from '../components/layout/Topbar'
import { useApi } from '../hooks/useApi'
import { api } from '../services/api'

/** App shell: atmospheric background + floating sidebar + glass top bar + routed page. */
export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('cloudguard_sidebar') === '1')
  const { pathname } = useLocation()
  const { data } = useApi(() => api.alerts({ status: 'open' }), [])

  useEffect(() => { setMobileOpen(false); window.scrollTo({ top: 0 }) }, [pathname])
  useEffect(() => { localStorage.setItem('cloudguard_sidebar', collapsed ? '1' : '0') }, [collapsed])

  const alerts = data?.items || []
  const unread = data?.counts?.unread || 0

  return (
    <div className="min-h-screen">
      <div className="scene-layer" aria-hidden="true" />
      <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed((c) => !c)} mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)} alertCount={unread} />
      <div className={`px-4 pb-10 pt-4 transition-[padding] duration-300 sm:px-6 ${collapsed ? 'lg:pl-[124px]' : 'lg:pl-[304px]'} lg:pr-6`}>
        <Topbar onMenu={() => setMobileOpen(true)} alerts={alerts} unread={unread} />
        <main key={pathname.split('/')[1]} className="mx-auto max-w-[1500px] animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
