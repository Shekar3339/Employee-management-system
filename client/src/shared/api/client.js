import axios from 'axios'
import { getToken } from '../auth/tokenStorage.js'

let refreshSessionHandler = null
let refreshInFlight = null

// AuthProvider owns the React session state. The API client only asks it to
// renew an expired access token; it never persists tokens itself.
export function setSessionRefreshHandler(handler) {
  refreshSessionHandler = handler
}

function isAuthRequest(url = '') {
  return url.includes('/auth/')
}

function refreshSession() {
  if (!refreshSessionHandler) {
    return Promise.reject(new Error('No session refresh handler is available.'))
  }

  if (!refreshInFlight) {
    refreshInFlight = Promise.resolve(refreshSessionHandler()).finally(() => {
      refreshInFlight = null
    })
  }

  return refreshInFlight
}

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  withCredentials: true,
  timeout: 10000,
})

apiClient.interceptors.request.use((config) => {
  const token = getToken()

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config

    // Refresh once for protected API requests. Auth endpoints are excluded to
    // prevent refresh/login/logout failures from creating a retry loop.
    if (
      error.response?.status !== 401
      || !request
      || request._employeeHubRetried
      || isAuthRequest(request.url)
    ) {
      return Promise.reject(error)
    }

    request._employeeHubRetried = true

    try {
      await refreshSession()
      return apiClient(request)
    } catch {
      return Promise.reject(error)
    }
  },
)

export default apiClient
