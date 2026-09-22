import { useEffect, useState } from 'react'
import { Check, Cloud, Palette, Save, Shield, SlidersHorizontal, User as UserIcon } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import GlassCard from '../components/ui/GlassCard'
import Tabs from '../components/ui/Tabs'
import Toggle from '../components/ui/Toggle'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { getErrorMessage } from '../services/api'

const SECTIONS = [
  { value: 'profile', label: 'Profile', icon: UserIcon },
  { value: 'notifications', label: 'Notifications', icon: SlidersHorizontal },
  { value: 'cloud', label: 'Cloud Environment', icon: Cloud },
  { value: 'security', label: 'Security Preferences', icon: Shield },
  { value: 'appearance', label: 'Appearance', icon: Palette },
]

const ACCENTS = [['cyan', '#38d5f5'], ['violet', '#8b6cff'], ['blue', '#4c8dff']]
const SCENES = [['aurora', 'Aurora night'], ['dusk', 'Violet dusk'], ['ocean', 'Deep ocean']]
const BLURS = [['low', 'Low'], ['medium', 'Medium'], ['high', 'High']]
const REGIONS = ['us-east-1', 'us-west-2', 'ap-south-1', 'eu-west-1']

export default function Settings() {
  const { user, updateProfile } = useAuth()
  const toast = useToast()
  const [section, setSection] = useState(window.location.hash === '#cloud' ? 'cloud' : 'profile')
  const [name, setName] = useState(user?.name || '')
  const [settings, setSettings] = useState(user?.settings || {})
  const [saving, setSaving] = useState('')

  useEffect(() => { setName(user?.name || ''); setSettings(user?.settings || {}) }, [user])

  const set = (section2, key, value) => setSettings((s) => ({ ...s, [section2]: { ...s[section2], [key]: value } }))

  const saveProfile = async () => {
    setSaving('profile')
    try { await updateProfile({ name }); toast.success('Profile updated.') }
    catch (err) { toast.error(getErrorMessage(err)) } finally { setSaving('') }
  }
  const saveSection = async (key) => {
    setSaving(key)
    try { await updateProfile({ settings: { [key]: settings[key] } }); toast.success('Settings saved.') }
    catch (err) { toast.error(getErrorMessage(err)) } finally { setSaving('') }
  }

  // Apply appearance changes live for instant preview, then persist.
  const applyAppearance = (key, value) => {
    set('appearance', key, value)
    if (key === 'accent') document.documentElement.dataset.accent = value
    if (key === 'scene') document.documentElement.dataset.scene = value
    if (key === 'blur') document.documentElement.dataset.blur = value
  }

  const notif = settings.notifications || {}
  const sec = settings.security || {}
  const app = settings.appearance || {}
  const cloud = settings.cloud || {}

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" subtitle="Manage your profile, notifications, cloud environment and appearance." />
      <div className="grid gap-5 lg:grid-cols-12">
        <GlassCard className="h-fit lg:col-span-3" pad="p-3">
          <nav className="space-y-1">
            {SECTIONS.map(({ value, label, icon: Icon }) => (
              <button key={value} onClick={() => setSection(value)}
                className={`flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-left text-sm font-semibold transition-colors ${section === value ? 'bg-white/12 text-ink' : 'text-muted hover:bg-white/6 hover:text-ink'}`}>
                <Icon size={17} className={section === value ? 'text-accent' : ''} /> {label}
              </button>
            ))}
          </nav>
        </GlassCard>

        <GlassCard className="lg:col-span-9">
          {section === 'profile' && (
            <div className="max-w-md space-y-4">
              <h3 className="h-display text-base font-semibold">Profile</h3>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted">Full name</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted">Email</label>
                <input className="input opacity-60" value={user?.email || ''} disabled />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted">Role</label>
                <input className="input opacity-60" value={user?.role || ''} disabled />
              </div>
              <button onClick={saveProfile} disabled={saving === 'profile'} className="btn btn-primary"><Save size={16} /> {saving === 'profile' ? 'Saving...' : 'Save changes'}</button>
            </div>
          )}

          {section === 'notifications' && (
            <div className="max-w-lg">
              <h3 className="h-display text-base font-semibold">Notifications</h3>
              <div className="mt-2 divide-y divide-white/8">
                <Toggle label="Email alerts" description="Receive alert notifications by email" checked={!!notif.email_alerts} onChange={(v) => set('notifications', 'email_alerts', v)} />
                <Toggle label="Push alerts" description="Receive push notifications in-browser" checked={!!notif.push_alerts} onChange={(v) => set('notifications', 'push_alerts', v)} />
                <Toggle label="Critical only" description="Only notify for critical severity issues" checked={!!notif.critical_only} onChange={(v) => set('notifications', 'critical_only', v)} />
                <Toggle label="Weekly digest" description="A weekly summary of your cloud environment" checked={!!notif.weekly_digest} onChange={(v) => set('notifications', 'weekly_digest', v)} />
              </div>
              <button onClick={() => saveSection('notifications')} disabled={saving === 'notifications'} className="btn btn-primary mt-5"><Save size={16} /> {saving === 'notifications' ? 'Saving...' : 'Save changes'}</button>
            </div>
          )}

          {section === 'cloud' && (
            <div className="max-w-lg">
              <h3 className="h-display text-base font-semibold">Cloud Environment</h3>
              <div className="mt-4 space-y-4">
                <div className="inset flex items-center justify-between p-4">
                  <div><p className="text-sm font-semibold">Provider</p><p className="text-xs text-muted">AWS (Simulation)</p></div>
                  <span className="chip border-ok/35 bg-ok/12 text-ok"><span className="live-dot" /> Connected</span>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-muted">Region</label>
                  <select className="input" value={cloud.region || 'ap-south-1'} onChange={(e) => set('cloud', 'region', e.target.value)}>
                    {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="rounded-2xl border border-warn/25 bg-warn/10 p-4 text-sm text-warn">
                  This is a <strong>Demo Environment</strong> using simulated cloud data. No real AWS account is connected.
                </div>
                <button className="btn btn-ghost" disabled title="Not available in the demo environment">
                  <Cloud size={16} /> Connect AWS Account
                </button>
              </div>
              <button onClick={() => saveSection('cloud')} disabled={saving === 'cloud'} className="btn btn-primary mt-5"><Save size={16} /> {saving === 'cloud' ? 'Saving...' : 'Save changes'}</button>
            </div>
          )}

          {section === 'security' && (
            <div className="max-w-lg">
              <h3 className="h-display text-base font-semibold">Security Preferences</h3>
              <div className="mt-2 divide-y divide-white/8">
                <Toggle label="Automatic scanning" description="Run the security scanner automatically" checked={!!sec.auto_scan} onChange={(v) => set('security', 'auto_scan', v)} />
                <Toggle label="Require MFA" description="Require multi-factor authentication for sign-in" checked={!!sec.require_mfa} onChange={(v) => set('security', 'require_mfa', v)} />
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-muted">Scan frequency</label>
                  <select className="input" value={sec.scan_frequency || 'daily'} onChange={(e) => set('security', 'scan_frequency', e.target.value)}>
                    <option value="hourly">Hourly</option><option value="daily">Daily</option><option value="weekly">Weekly</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-muted">Alert threshold</label>
                  <select className="input" value={sec.alert_threshold || 'medium'} onChange={(e) => set('security', 'alert_threshold', e.target.value)}>
                    <option value="low">Low and above</option><option value="medium">Medium and above</option><option value="high">High and above</option>
                  </select>
                </div>
              </div>
              <button onClick={() => saveSection('security')} disabled={saving === 'security'} className="btn btn-primary mt-5"><Save size={16} /> {saving === 'security' ? 'Saving...' : 'Save changes'}</button>
            </div>
          )}

          {section === 'appearance' && (
            <div className="max-w-lg">
              <h3 className="h-display text-base font-semibold">Appearance</h3>
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold text-muted">Accent color</p>
                <div className="flex gap-3">
                  {ACCENTS.map(([key, color]) => (
                    <button key={key} onClick={() => applyAppearance('accent', key)} className="relative h-11 w-11 rounded-2xl border-2 transition-transform hover:scale-105"
                      style={{ background: color, borderColor: (app.accent || 'cyan') === key ? '#fff' : 'transparent' }} aria-label={key}>
                      {(app.accent || 'cyan') === key && <Check size={18} className="absolute inset-0 m-auto text-[#051022]" />}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-5">
                <p className="mb-2 text-xs font-semibold text-muted">Background scene</p>
                <div className="grid grid-cols-3 gap-3">
                  {SCENES.map(([key, label]) => (
                    <button key={key} onClick={() => applyAppearance('scene', key)} className={`rounded-2xl border px-3 py-2.5 text-xs font-semibold transition-colors ${(app.scene || 'aurora') === key ? 'border-accent/60 bg-accent/15 text-ink' : 'border-white/12 bg-white/5 text-muted hover:text-ink'}`}>{label}</button>
                  ))}
                </div>
              </div>
              <div className="mt-5">
                <p className="mb-2 text-xs font-semibold text-muted">Glass blur intensity</p>
                <div className="grid grid-cols-3 gap-3">
                  {BLURS.map(([key, label]) => (
                    <button key={key} onClick={() => applyAppearance('blur', key)} className={`rounded-2xl border px-3 py-2.5 text-xs font-semibold transition-colors ${(app.blur || 'medium') === key ? 'border-accent/60 bg-accent/15 text-ink' : 'border-white/12 bg-white/5 text-muted hover:text-ink'}`}>{label}</button>
                  ))}
                </div>
              </div>
              <div className="mt-5 divide-y divide-white/8">
                <Toggle label="Reduce motion" description="Minimize animations across the app" checked={!!app.reduce_motion}
                  onChange={(v) => { set('appearance', 'reduce_motion', v); document.documentElement.classList.toggle('reduce-motion', v) }} />
              </div>
              <button onClick={() => saveSection('appearance')} disabled={saving === 'appearance'} className="btn btn-primary mt-5"><Save size={16} /> {saving === 'appearance' ? 'Saving...' : 'Save changes'}</button>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  )
}
