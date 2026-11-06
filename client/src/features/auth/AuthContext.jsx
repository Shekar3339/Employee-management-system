import { useCallback, useMemo, useState } from 'react'
import apiClient, { setApiAuthToken } from '../../shared/api/client.js'
import { AuthContext } from './auth-context.js'

function getErrorMessage(error, fallback) {
  return error.response?.data?.message || fallback
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(false)

  const logout = useCallback(() => {
    setApiAuthToken(null)
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

      setApiAuthToken(nextToken)
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
      const response = await apiClient.get('/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
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
