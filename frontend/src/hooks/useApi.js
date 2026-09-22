import { useCallback, useEffect, useRef, useState } from 'react'
import { useData } from '../context/DataContext'
import { getErrorMessage } from '../services/api'

/**
 * useApi(() => api.something(), [deps])
 * -> { data, loading, error, reload }
 *  - `loading` is true only until the FIRST result (later refetches keep showing old data)
 *  - re-fetches when deps change or when the global "Refresh Data" button is used
 */
export function useApi(fetcher, deps = []) {
  const { refreshKey } = useData()
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher
  const requestId = useRef(0)

  const load = useCallback(async () => {
    const id = ++requestId.current
    setState((s) => ({ ...s, error: null }))
    try {
      const data = await fetcherRef.current()
      if (id === requestId.current) setState({ data, loading: false, error: null })
    } catch (err) {
      if (id === requestId.current) setState((s) => ({ ...s, loading: false, error: getErrorMessage(err) }))
    }
  }, [])

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, refreshKey])

  const retry = useCallback(() => {
    setState((s) => ({ ...s, loading: !s.data, error: null }))
    load()
  }, [load])

  return { ...state, reload: load, retry, setData: (updater) => setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater })) }
}
