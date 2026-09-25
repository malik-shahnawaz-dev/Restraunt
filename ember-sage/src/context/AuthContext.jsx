import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [booting, setBooting] = useState(true)
  const [isLoading, setIsLoading] = useState(false)

  // Restore session from HTTP-only cookie
  useEffect(() => {
    let alive = true
    api
      .get('/auth/me')
      .then((d) => alive && setUser(d.user))
      .catch(() => alive && setUser(null))
      .finally(() => alive && setBooting(false))
    return () => {
      alive = false
    }
  }, [])

  const login = useCallback(async ({ email, password, remember }) => {
    setIsLoading(true)
    try {
      const d = await api.post('/auth/login', { email, password, remember })
      setUser(d.user)
      return d.user
    } finally {
      setIsLoading(false)
    }
  }, [])

  const register = useCallback(async (payload) => {
    setIsLoading(true)
    try {
      const d = await api.post('/auth/register', payload)
      setUser(d.user)
      return d.user
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      setUser(null)
    }
  }, [])

  const updateProfile = useCallback(async (patch) => {
    const d = await api.patch('/users/me', patch)
    setUser(d.user)
    return d.user
  }, [])

  const updatePassword = useCallback(async (currentPassword, newPassword) => {
    const d = await api.patch('/users/me/password', { currentPassword, newPassword })
    return d.message
  }, [])

  const updatePreferences = useCallback(async (prefs) => {
    const d = await api.patch('/users/me/preferences', prefs)
    setUser((u) => (u ? { ...u, preferences: d.preferences } : u))
    return d.preferences
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      const d = await api.get('/auth/me')
      setUser(d.user)
      return d.user
    } catch {
      return null
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      booting,
      isLoading,
      login,
      register,
      logout,
      updateProfile,
      updatePassword,
      updatePreferences,
      refreshUser,
      setUser,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'admin',
    }),
    [user, booting, isLoading, login, register, logout, updateProfile, updatePassword, updatePreferences, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
