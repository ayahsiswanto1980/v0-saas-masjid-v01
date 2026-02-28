import { User } from '@/types'
import { useAuthStore } from '@/stores/authStore'
import { authRepository, LoginCredentials } from './authRepository'
import { useTenant } from '@/context/TenantContext'

export class AuthService {
  async login(email: string, password: string): Promise<void> {
    const store = useAuthStore.getState()
    store.setLoading(true)
    store.setError(undefined)

    try {
      const response = await authRepository.login({ email, password })
      store.setUser(response.user)
      // Store tenant context
      const tenant = { id: response.user.tenantId, nama: 'Current Tenant' } as any
      store.setUser(response.user)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed'
      store.setError(message)
      throw error
    } finally {
      store.setLoading(false)
    }
  }

  async logout(): Promise<void> {
    const store = useAuthStore.getState()
    await authRepository.logout()
    store.logout()
  }

  async register(email: string, password: string, nama: string, tenantId: string): Promise<void> {
    const store = useAuthStore.getState()
    store.setLoading(true)
    store.setError(undefined)

    try {
      const response = await authRepository.register({
        email,
        nama,
        tenantId,
        password,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      store.setUser(response.user)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed'
      store.setError(message)
      throw error
    } finally {
      store.setLoading(false)
    }
  }

  async restoreSession(): Promise<User | null> {
    const store = useAuthStore.getState()
    store.setLoading(true)

    try {
      const user = await authRepository.restoreSession()
      if (user) {
        store.setUser(user)
        return user
      }
      return null
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to restore session'
      store.setError(message)
      return null
    } finally {
      store.setLoading(false)
    }
  }
}

export const authService = new AuthService()
