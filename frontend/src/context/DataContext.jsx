import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { api, getErrorMessage } from '../services/api'
import { useToast } from './ToastContext'

const DataContext = createContext(null)
export const useData = () => useContext(DataContext)

/**
 * Global "Refresh Data": asks the backend to regenerate metrics, then bumps `refreshKey`
 * so every page that uses useApi() automatically re-fetches.
 */
export function DataProvider({ children }) {
  const toast = useToast()
  const [refreshKey, setRefreshKey] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try {
      // small minimum delay so the loading state is visible
      await Promise.all([api.refresh(), new Promise((r) => setTimeout(r, 900))])
      setRefreshKey((k) => k + 1)
      toast.success('Cloud environment refreshed successfully.')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Unable to refresh the cloud environment.'))
    } finally {
      setRefreshing(false)
    }
  }, [toast])

  const bump = useCallback(() => setRefreshKey((k) => k + 1), [])
  const value = useMemo(() => ({ refreshKey, refreshing, refresh, bump }), [refreshKey, refreshing, refresh, bump])
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
