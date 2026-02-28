/**
 * REST API Repository Implementation
 * Mirrors IndexedDB interface but calls REST API endpoints
 * Fully implements IMosqueRepository interface
 */

import { IMosqueRepository } from '../contracts/IMosqueRepository'
import { IRepository, QueryFilter, PaginationOptions, SyncRecord, SyncStatus } from '../contracts/IRepository'
import { Mosque, CreateMosqueDTO, MosqueResponse, MosqueListResponse } from '../models/Mosque'

export interface APIConfig {
  baseURL: string
  timeout?: number
  getToken?: () => string | null
}

export class MosqueAPIRepository implements IMosqueRepository {
  private baseURL: string
  private timeout: number
  private getToken: () => string | null

  constructor(config: APIConfig) {
    this.baseURL = config.baseURL
    this.timeout = config.timeout || 30000
    this.getToken = config.getToken || (() => null)
  }

  /**
   * Make HTTP request with error handling
   */
  private async request<T>(method: string, endpoint: string, data?: any): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    const token = this.getToken()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const options: RequestInit = {
      method,
      headers,
    }

    if (data) {
      options.body = JSON.stringify(data)
    }

    try {
      const response = await Promise.race([
        fetch(url, options),
        new Promise<Response>((_, reject) =>
          setTimeout(() => reject(new Error('Request timeout')), this.timeout)
        ),
      ])

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || `HTTP ${response.status}`)
      }

      const result = await response.json()
      return result.data || result
    } catch (error) {
      console.error('[v0] API Request Error:', error)
      throw error
    }
  }

  /**
   * CRUD: Create
   */
  async create(data: Omit<Mosque, 'id' | 'createdAt' | 'updatedAt'>, tenantId: string): Promise<Mosque> {
    const payload: CreateMosqueDTO = {
      name: data.name,
      city: data.city,
      address: data.address,
      phone: data.phone,
      email: data.email,
      leaderName: data.leaderName,
      leaderPhone: data.leaderPhone,
      status: data.status,
    }

    const response = await this.request<Mosque>('POST', `/api/mosques?tenant_id=${tenantId}`, payload)
    return response
  }

  /**
   * CRUD: Read
   */
  async read(id: string, tenantId: string): Promise<Mosque | null> {
    try {
      const response = await this.request<Mosque>('GET', `/api/mosques/${id}?tenant_id=${tenantId}`)
      return response
    } catch (error) {
      if ((error as Error).message.includes('404')) {
        return null
      }
      throw error
    }
  }

  /**
   * CRUD: Update
   */
  async update(id: string, data: Partial<Mosque>, tenantId: string): Promise<Mosque> {
    // Remove read-only fields
    const { id: _, tenantId: __, createdAt, updatedAt, ...updateData } = data

    const response = await this.request<Mosque>('PUT', `/api/mosques/${id}?tenant_id=${tenantId}`, updateData)
    return response
  }

  /**
   * CRUD: Delete
   */
  async delete(id: string, tenantId: string): Promise<boolean> {
    try {
      await this.request<void>('DELETE', `/api/mosques/${id}?tenant_id=${tenantId}`)
      return true
    } catch (error) {
      if ((error as Error).message.includes('404')) {
        return false
      }
      throw error
    }
  }

  /**
   * List with filters and pagination
   */
  async list(filters?: QueryFilter, pagination?: PaginationOptions, tenantId?: string): Promise<Mosque[]> {
    if (!tenantId) {
      throw new Error('tenantId diperlukan untuk query')
    }

    const params = new URLSearchParams()
    params.append('tenant_id', tenantId)

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(`filter[${key}]`, String(value))
        }
      })
    }

    if (pagination) {
      params.append('page', String(pagination.page))
      params.append('limit', String(pagination.limit))
    }

    const response = await this.request<MosqueListResponse>(
      'GET',
      `/api/mosques?${params.toString()}`
    )

    // Handle both direct array response and paginated response
    if (Array.isArray(response)) {
      return response
    }
    return (response as any).data || []
  }

  /**
   * Batch operations
   */
  async bulkCreate(items: Array<Omit<Mosque, 'id' | 'createdAt' | 'updatedAt'>>, tenantId: string): Promise<Mosque[]> {
    const response = await this.request<Mosque[]>('POST', `/api/mosques/bulk?tenant_id=${tenantId}`, { items })
    return response
  }

  async bulkUpdate(items: Array<{ id: string; data: Partial<Mosque> }>, tenantId: string): Promise<Mosque[]> {
    const payload = items.map((item) => ({
      id: item.id,
      ...item.data,
    }))

    const response = await this.request<Mosque[]>('PUT', `/api/mosques/bulk?tenant_id=${tenantId}`, { items: payload })
    return response
  }

  async bulkDelete(ids: string[], tenantId: string): Promise<boolean> {
    await this.request<void>('DELETE', `/api/mosques/bulk?tenant_id=${tenantId}`, { ids })
    return true
  }

  /**
   * Sync Queue Management
   * Note: API implementation doesn't maintain sync queue locally
   * All operations are immediately synced to server
   */
  async getSyncQueue(): Promise<SyncRecord[]> {
    // API has no local queue - everything is synced
    return []
  }

  async addToSyncQueue(_record: Omit<SyncRecord, 'id' | 'timestamp' | 'retries'>): Promise<SyncRecord> {
    // No queue for API - operations are synchronous
    throw new Error('API repository tidak memiliki sync queue')
  }

  async processSyncQueue(_tenantId: string): Promise<void> {
    // API has no queue to process
  }

  async clearSyncQueue(): Promise<void> {
    // Nothing to clear
  }

  /**
   * Utilities
   */
  async clear(_tenantId?: string): Promise<void> {
    // API doesn't support clearing - use delete endpoint instead
    throw new Error('Gunakan delete endpoint untuk menghapus data')
  }

  async count(filters?: QueryFilter, tenantId?: string): Promise<number> {
    if (!tenantId) throw new Error('tenantId diperlukan')

    const params = new URLSearchParams()
    params.append('tenant_id', tenantId)

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(`filter[${key}]`, String(value))
        }
      })
    }

    const response = await this.request<{ total: number }>('GET', `/api/mosques/count?${params.toString()}`)
    return (response as any).total || 0
  }

  async exists(id: string, tenantId: string): Promise<boolean> {
    try {
      await this.read(id, tenantId)
      return true
    } catch {
      return false
    }
  }

  /**
   * Mosque-specific queries
   */
  async findByName(name: string, tenantId: string): Promise<Mosque | null> {
    const items = await this.list({ name }, undefined, tenantId)
    return items[0] || null
  }

  async findByCity(city: string, tenantId: string): Promise<Mosque[]> {
    return this.list({ city }, undefined, tenantId)
  }

  async findActive(tenantId: string): Promise<Mosque[]> {
    return this.list({ status: 'active' }, undefined, tenantId)
  }

  async getStatistics(tenantId: string): Promise<{
    total: number
    active: number
    inactive: number
    byCity: Record<string, number>
  }> {
    const params = new URLSearchParams()
    params.append('tenant_id', tenantId)

    try {
      const response = await this.request<{
        total: number
        active: number
        inactive: number
        byCity: Record<string, number>
      }>('GET', `/api/mosques/statistics?${params.toString()}`)
      return response
    } catch (error) {
      // Fallback: calculate statistics from list
      const all = await this.list(undefined, undefined, tenantId)
      return {
        total: all.length,
        active: all.filter((m) => m.status === 'active').length,
        inactive: all.filter((m) => m.status === 'inactive').length,
        byCity: all.reduce(
          (acc, m) => {
            acc[m.city] = (acc[m.city] || 0) + 1
            return acc
          },
          {} as Record<string, number>
        ),
      }
    }
  }
}
