import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AuthState, User } from '@/types'

interface AuthStore extends AuthState {
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  setUser: (user: User) => void
  setLoading: (loading: boolean) => void
  setError: (error?: string) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      tenant: null,
      isAuthenticated: false,
      isLoading: false,
      error: undefined,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: undefined })
        try {
          // Mock login - replace with actual API call
          // const response = await apiDatasource.post<{ user: User, token: string }>('/auth/login', {
          //   email,
          //   password,
          // })
          // apiDatasource.setToken(response.token)
          // localStorage.setItem('authToken', response.token)
          
          await new Promise((resolve) => setTimeout(resolve, 500))
          const mockUser: User = {
            id: '1',
            tenantId: '1',
            email,
            nama: email.split('@')[0],
            role: 'admin',
            createdAt: new Date(),
            updatedAt: new Date(),
          }
          set({
            user: mockUser,
            isAuthenticated: true,
            isLoading: false,
          })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Login gagal',
            isLoading: false,
          })
        }
      },

      logout: () => {
        set({
          user: null,
          tenant: null,
          isAuthenticated: false,
          error: undefined,
        })
        localStorage.removeItem('authToken')
      },

      setUser: (user: User) => {
        set({ user, isAuthenticated: true })
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },

      setError: (error?: string) => {
        set({ error })
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        tenant: state.tenant,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
