import { User } from '@/types'
import { apiDatasource } from '@/datasource/APIDatasource'
import { indexedDBDatasource } from '@/datasource/IndexedDBDatasource'

export interface LoginCredentials {
  email: string
  password: string
}

export interface AuthResponse {
  user: User
  token: string
}

export class AuthRepository {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await apiDatasource.post<AuthResponse>('/auth/login', credentials)
      apiDatasource.setToken(response.token)
      localStorage.setItem('authToken', response.token)
      await indexedDBDatasource.create('users', response.user)
      return response
    } catch (error) {
      throw new Error(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async logout(): Promise<void> {
    try {
      apiDatasource.clearToken()
      localStorage.removeItem('authToken')
      const tx = (await (indexedDBDatasource as any).db).transaction('users', 'readwrite')
      tx.objectStore('users').clear()
    } catch (error) {
      console.error('[v0] Logout error:', error)
    }
  }

  async getMe(): Promise<User> {
    try {
      const response = await apiDatasource.get<User>('/auth/me')
      await indexedDBDatasource.create('users', response)
      return response
    } catch (error) {
      throw new Error(`Failed to get user: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async register(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'> & { password: string }): Promise<AuthResponse> {
    try {
      const response = await apiDatasource.post<AuthResponse>('/auth/register', data)
      apiDatasource.setToken(response.token)
      localStorage.setItem('authToken', response.token)
      await indexedDBDatasource.create('users', response.user)
      return response
    } catch (error) {
      throw new Error(`Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async restoreSession(): Promise<User | null> {
    const token = localStorage.getItem('authToken')
    if (!token) return null

    try {
      apiDatasource.setToken(token)
      const user = await this.getMe()
      return user
    } catch (error) {
      localStorage.removeItem('authToken')
      return null
    }
  }
}

export const authRepository = new AuthRepository()
