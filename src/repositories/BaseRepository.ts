import { IRepository, PaginationParams, PaginatedResponse } from '@/types'
import { indexedDBDatasource } from '@/datasource/IndexedDBDatasource'
import { apiDatasource } from '@/datasource/APIDatasource'
import { isOnline } from '@/utils'

export abstract class BaseRepository<T extends { id: string }> implements IRepository<T> {
  protected abstract storeName: string
  protected abstract apiEndpoint: string

  async create(item: T): Promise<T> {
    if (isOnline()) {
      const result = await apiDatasource.post<T>(this.apiEndpoint, item)
      await indexedDBDatasource.create(this.storeName, result)
      return result
    } else {
      await indexedDBDatasource.create(this.storeName, item)
      await indexedDBDatasource.addToSyncQueue('create', this.storeName, item)
      return item
    }
  }

  async read(id: string): Promise<T | null> {
    const local = await indexedDBDatasource.read<T>(this.storeName, id)
    if (local) return local

    if (isOnline()) {
      const remote = await apiDatasource.get<T>(`${this.apiEndpoint}/${id}`)
      await indexedDBDatasource.create(this.storeName, remote)
      return remote
    }

    return null
  }

  async readAll(tenantId: string, params?: PaginationParams): Promise<PaginatedResponse<T>> {
    const local = await indexedDBDatasource.readAll<T>(this.storeName, tenantId)

    if (isOnline()) {
      const queryParams = new URLSearchParams()
      queryParams.append('tenantId', tenantId)
      if (params?.page) queryParams.append('page', params.page.toString())
      if (params?.limit) queryParams.append('limit', params.limit.toString())

      const remote = await apiDatasource.get<PaginatedResponse<T>>(
        `${this.apiEndpoint}?${queryParams.toString()}`
      )

      // Clear local and sync remote
      await indexedDBDatasource.clear(this.storeName)
      for (const item of remote.data) {
        await indexedDBDatasource.create(this.storeName, item)
      }

      return remote
    }

    return {
      data: local,
      total: local.length,
      page: params?.page || 1,
      limit: params?.limit || 10,
      totalPages: Math.ceil(local.length / (params?.limit || 10)),
    }
  }

  async update(id: string, item: Partial<T>): Promise<T> {
    const existing = await this.read(id)
    if (!existing) throw new Error('Item tidak ditemukan')

    const updated = { ...existing, ...item, updatedAt: new Date() }

    if (isOnline()) {
      const result = await apiDatasource.put<T>(`${this.apiEndpoint}/${id}`, updated)
      await indexedDBDatasource.update(this.storeName, result)
      return result
    } else {
      await indexedDBDatasource.update(this.storeName, updated as T)
      await indexedDBDatasource.addToSyncQueue('update', this.storeName, updated)
      return updated as T
    }
  }

  async delete(id: string): Promise<void> {
    if (isOnline()) {
      await apiDatasource.delete(`${this.apiEndpoint}/${id}`)
      await indexedDBDatasource.delete(this.storeName, id)
    } else {
      await indexedDBDatasource.delete(this.storeName, id)
      await indexedDBDatasource.addToSyncQueue('delete', this.storeName, { id })
    }
  }

  async sync(tenantId: string): Promise<void> {
    if (!isOnline()) return

    const queue = await indexedDBDatasource.getSyncQueue()
    for (const item of queue) {
      if (item.storeName === this.storeName) {
        try {
          if (item.action === 'create') {
            await apiDatasource.post(this.apiEndpoint, item.data)
          } else if (item.action === 'update') {
            await apiDatasource.put(`${this.apiEndpoint}/${item.data.id}`, item.data)
          } else if (item.action === 'delete') {
            await apiDatasource.delete(`${this.apiEndpoint}/${item.data.id}`)
          }
          await indexedDBDatasource.delete('sync_queue', item.id)
        } catch (error) {
          console.error(`[v0] Failed to sync ${item.action}:`, error)
        }
      }
    }
  }
}
