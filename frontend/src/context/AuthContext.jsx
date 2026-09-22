import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, setUnauthorizedHandler, tokenStore } from '../services/api'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

const DEFAULT_APPEARANCE = { accent: 'cyan', scene: 'aurora', blur: 'medium', reduce_motion: false }

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(!!tokenStore.get())

  const logout = useCallback(() => {
    tokenStore.clear()
    setUser(null)
  }, [])

  // Load the profile when a token exists (page refresh).
  useEffect(() => {
    setUnauthorizedHandler(logout)
    if (!tokenStore.get()) return
    api.profile().then(setUser).catch(logout).finally(() => setLoading(false))
  }, [logout])

  // Apply appearance settings (accent colour, background scene, blur, motion) to <html>.
  useEffect(() => {
    const a = { ...DEFAULT_APPEARANCE, ...(user?.settings?.appearance || {}) }
    const root = document.documentElement
    root.dataset.accent = a.accent
    root.dataset.scene = a.scene
    root.dataset.blur = a.blur
    root.classList.toggle('reduce-motion', !!a.reduce_motion)
  }, [user])

  const finishLogin = ({ token, user: u }, remember = true) => {
    tokenStore.set(token, remember)
    setUser(u)
    return u
  }

  const value = useMemo(() => ({
    user, loading, logout,
    login: async (email, password, remember) => finishLogin(await api.login(email, password), remember),
    demoLogin: async () => finishLogin(await api.demoLogin(), true),
    updateProfile: async (body) => { const u = await api.updateProfile(body); setUser(u); return u },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [user, loading, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
