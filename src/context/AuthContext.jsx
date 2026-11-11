import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authService, getCurrentSession, roleHome } from '../services/auth.service.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => getCurrentSession())
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    // Re-read once on mount so a refresh restores the mock session.
    setSession(getCurrentSession())
    setBooting(false)
  }, [])

  const login = useCallback(async (credentials) => {
    const result = await authService.login(credentials)
    setSession(getCurrentSession())
    return result
  }, [])

  const logout = useCallback(async () => {
    await authService.logout()
    setSession(null)
  }, [])

  const refresh = useCallback(() => {
    setSession(getCurrentSession())
  }, [])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      role: session?.role ?? null,
      isAuthenticated: Boolean(session),
      booting,
      login,
      logout,
      refresh,
      homeFor: roleHome,
    }),
    [session, booting, login, logout, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside an AuthProvider')
  return context
}
