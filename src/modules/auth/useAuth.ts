import { useCallback, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { authService } from './authService'

export const useAuth = () => {
  const store = useAuthStore()

  const login = useCallback((email: string, password: string) => {
    return authService.login(email, password)
  }, [])

  const logout = useCallback(() => {
    return authService.logout()
  }, [])

  const register = useCallback((email: string, password: string, nama: string, tenantId: string) => {
    return authService.register(email, password, nama, tenantId)
  }, [])

  // Restore session on mount
  useEffect(() => {
    authService.restoreSession()
  }, [])

  return {
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    error: store.error,
    login,
    logout,
    register,
  }
}
