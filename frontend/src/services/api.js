import axios from 'axios'

// The API base URL comes from VITE_API_URL (set it in Vercel for production).
// In development we fall back to the local Flask server.
const rawBase = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000' : '')
export const API_BASE = `${rawBase.replace(/\/+$/, '')}/api`

const TOKEN_KEY = 'cloudguard_token'
export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY),
  set: (token, remember) => {
    tokenStore.clear()
    ;(remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token)
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(TOKEN_KEY)
  },
}

const http = axios.create({ baseURL: API_BASE, timeout: 20000 })

http.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let onUnauthorized = () => {}
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn }

http.interceptors.response.use(
  (res) => res,
  (error) => {
    const url = error.config?.url || ''
    if (error.response?.status === 401 && !url.includes('/auth/')) onUnauthorized()
    return Promise.reject(error)
  },
)

export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (error?.response?.data?.error) return error.response.data.error
  if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error')
    return 'Unable to reach the CloudGuard API. Check that the backend is running.'
  if (error?.code === 'ECONNABORTED') return 'The request timed out. Please retry.'
  return fallback
}

const get = (url, params) => http.get(url, { params }).then((r) => r.data)
const post = (url, body) => http.post(url, body).then((r) => r.data)
const patch = (url, body) => http.patch(url, body).then((r) => r.data)
const del = (url) => http.delete(url).then((r) => r.data)

export const api = {
  health: () => get('/health'),
  login: (email, password) => post('/auth/login', { email, password }),
  demoLogin: () => post('/auth/demo'),
  profile: () => get('/profile'),
  updateProfile: (body) => patch('/profile', body),

  dashboard: () => get('/dashboard'),
  refresh: () => post('/refresh'),
  metrics: (range) => get('/metrics', { range }),

  resources: (params) => get('/resources', params),
  resource: (id) => get(`/resources/${id}`),
  resourceAction: (id, action) => post(`/resources/${id}/action`, { action }),

  findings: (params) => get('/security/findings', params),
  updateFinding: (id, status) => patch(`/security/findings/${id}`, { status }),
  scan: () => post('/security/scan'),

  costs: () => get('/costs'),
  analytics: (range) => get('/analytics', { range }),
  anomalies: (limit) => get('/analytics/anomalies', { limit }),

  alerts: (params) => get('/alerts', params),
  updateAlert: (id, body) => patch(`/alerts/${id}`, body),
  deleteAlert: (id) => del(`/alerts/${id}`),
  readAllAlerts: () => post('/alerts/read-all'),

  recommendations: (params) => get('/recommendations', params),
  updateRecommendation: (id, status) => patch(`/recommendations/${id}`, { status }),
}
