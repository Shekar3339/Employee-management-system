import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import apiClient, { setSessionRefreshHandler } from '../../shared/api/client.js'
import {
  clearToken,
  getToken,
  setToken as storeToken,
} from '../../shared/auth/tokenStorage.js'
import { AuthContext } from './auth-context.js'

function getErrorMessage(error, fallback) {
  return error.response?.data?.message || fallback
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(getToken)
  const [loading, setLoading] = useState(true)
  const sessionRestoreStarted = useRef(false)

  const clearSession = useCallback(() => {
    clearToken()
    setToken(null)
    setUser(null)
  }, [])

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout')
    } catch {
      // Local state must still be cleared when the server is unavailable.
    } finally {
      clearSession()
    }
  }, [clearSession])

  const login = useCallback(async (email, password) => {
    setLoading(true)

    try {
      const response = await apiClient.post('/auth/login', { email, password })
      const { token: nextToken, user: nextUser } = response.data?.data ?? {}

      if (!response.data?.success || !nextToken || !nextUser) {
        throw new Error('Unable to sign in. Please try again.')
      }

      storeToken(nextToken)
      setToken(nextToken)
      setUser(nextUser)
      return nextUser
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to sign in. Please try again.'), { cause: error })
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshCurrentUser = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true)

    try {
      const response = await apiClient.post('/auth/refresh')
      const { token: nextToken, user: nextUser } = response.data?.data ?? {}

      if (!response.data?.success || !nextToken || !nextUser) {
        throw new Error('Unable to refresh your session.')
      }

      storeToken(nextToken)
      setToken(nextToken)
      setUser(nextUser)
      return nextUser
    } catch (error) {
      clearSession()
      throw new Error(getErrorMessage(error, 'Your session has expired. Please sign in again.'), { cause: error })
    } finally {
      if (!quiet) setLoading(false)
    }
  }, [clearSession])

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const response = await apiClient.post('/auth/change-password', { currentPassword, newPassword })
    const { token: nextToken, user: nextUser } = response.data?.data ?? {}
    if (!response.data?.success || !nextToken || !nextUser) {
      throw new Error('Unable to change password. Please try again.')
    }
    storeToken(nextToken)
    setToken(nextToken)
    setUser(nextUser)
    return nextUser
  }, [])

  useEffect(() => {
    setSessionRefreshHandler(() => refreshCurrentUser({ quiet: true }))

    return () => setSessionRefreshHandler(null)
  }, [refreshCurrentUser])

  useEffect(() => {
    if (user || sessionRestoreStarted.current) return
    sessionRestoreStarted.current = true

    refreshCurrentUser().catch(() => undefined)
  }, [refreshCurrentUser, user])

  const value = useMemo(() => ({
    user,
    token,
    isAuthenticated: Boolean(token && user),
    loading,
    login,
    logout,
    refreshCurrentUser,
    changePassword,
  }), [changePassword, login, loading, logout, refreshCurrentUser, token, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
