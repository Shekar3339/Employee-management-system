import { useCallback, useEffect, useMemo, useState } from 'react'
import apiClient from '../../shared/api/client.js'
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
  const [loading, setLoading] = useState(Boolean(getToken()))

  const logout = useCallback(() => {
    clearToken()
    setToken(null)
    setUser(null)
  }, [])

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

  const refreshCurrentUser = useCallback(async () => {
    if (!token) {
      return null
    }

    setLoading(true)

    try {
      const response = await apiClient.get('/auth/me')
      const nextUser = response.data?.data?.user

      if (!response.data?.success || !nextUser) {
        throw new Error('Unable to refresh your session.')
      }

      setUser(nextUser)
      return nextUser
    } catch (error) {
      logout()
      throw new Error(getErrorMessage(error, 'Your session has expired. Please sign in again.'), { cause: error })
    } finally {
      setLoading(false)
    }
  }, [logout, token])

  useEffect(() => {
    if (!token || user) return

    const restoreTimer = window.setTimeout(() => {
      refreshCurrentUser().catch(() => undefined)
    }, 0)

    return () => window.clearTimeout(restoreTimer)
  }, [refreshCurrentUser, token, user])

  const value = useMemo(() => ({
    user,
    token,
    isAuthenticated: Boolean(token && user),
    loading,
    login,
    logout,
    refreshCurrentUser,
  }), [login, loading, logout, refreshCurrentUser, token, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
