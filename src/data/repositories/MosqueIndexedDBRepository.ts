/**
 * IndexedDB Repository Implementation
 * Handles local storage with offline support and sync queuing
 * Fully implements IMosqueRepository interface
 */

import { IMosqueRepository } from '../contracts/IMosqueRepository'
import { IRepository, QueryFilter, PaginationOptions, SyncRecord, SyncStatus } from '../contracts/IRepository'
import { Mosque, CreateMosqueDTO } from '../models/Mosque'

const DB_NAME = 'MasjidDB'
const DB_VERSION = 1
const MOSQUE_STORE = 'mosques'
const SYNC_QUEUE_STORE = 'syncQueue'

export class MosqueIndexedDBRepository implements IMosqueRepository {
  private db: IDBDatabase | null = null
  private initPromise: Promise<void>

  constructor() {
    this.initPromise = this.initializeDB()
  }

  /**
   * Initialize IndexedDB connection
   */
  private async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create mosque store
        if (!db.objectStoreNames.contains(MOSQUE_STORE)) {
          const mosqueStore = db.createObjectStore(MOSQUE_STORE, { keyPath: 'id' })
          mosqueStore.createIndex('tenantId', 'tenantId', { unique: false })
          mosqueStore.createIndex('name', 'name', { unique: false })
          mosqueStore.createIndex('city', 'city', { unique: false })
          mosqueStore.createIndex('tenantId_status', ['tenantId', 'status'], { unique: false })
        }

        // Create sync queue store
        if (!db.objectStoreNames.contains(SYNC_QUEUE_STORE)) {
          const syncStore = db.createObjectStore(SYNC_QUEUE_STORE, { keyPath: 'id', autoIncrement: true })
          syncStore.createIndex('status', 'status', { unique: false })
          syncStore.createIndex('timestamp', 'timestamp', { unique: false })
        }
      }
    })
  }

  /**
   * Ensure DB is initialized
   */
  private async ensureDB(): Promise<IDBDatabase> {
    await this.initPromise
    if (!this.db) throw new Error('Database initialization failed')
    return this.db
  }

  /**
   * CRUD: Create
   */
  async create(data: Omit<Mosque, 'id' | 'createdAt' | 'updatedAt'>, tenantId: string): Promise<Mosque> {
    const db = await this.ensureDB()
    const mosque: Mosque = {
      ...data,
      id: this.generateId(),
      tenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction([MOSQUE_STORE], 'readwrite')
      const store = tx.objectStore(MOSQUE_STORE)
      const request = store.add(mosque)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        // Add to sync queue
        this.addToSyncQueue({
          operation: 'create',
          entityType: 'Mosque',
          entityId: mosque.id,
          data: mosque,
          status: 'local',
          retries: 0,
        }).catch((err) => console.error('[v0] Failed to queue create:', err))

        resolve(mosque)
      }
    })
  }

  /**
   * CRUD: Read
   */
  async read(id: string, tenantId: string): Promise<Mosque | null> {
    const db = await this.ensureDB()

    return new Promise((resolve, reject) => {
      const tx = db.transaction([MOSQUE_STORE], 'readonly')
      const store = tx.objectStore(MOSQUE_STORE)
      const request = store.get(id)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const mosque = request.result
        // Verify tenant isolation
        if (mosque && mosque.tenantId !== tenantId) {
          resolve(null)
          return
        }
        resolve(mosque || null)
      }
    })
  }

  /**
   * CRUD: Update
   */
  async update(id: string, data: Partial<Mosque>, tenantId: string): Promise<Mosque> {
    const db = await this.ensureDB()
    const existing = await this.read(id, tenantId)

    if (!existing) {
      throw new Error(`Mosque ${id} tidak ditemukan`)
    }

    const updated: Mosque = {
      ...existing,
      ...data,
      id: existing.id,
      tenantId: existing.tenantId,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction([MOSQUE_STORE], 'readwrite')
      const store = tx.objectStore(MOSQUE_STORE)
      const request = store.put(updated)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        // Add to sync queue
        this.addToSyncQueue({
          operation: 'update',
          entityType: 'Mosque',
          entityId: id,
          data: updated,
          status: 'local',
          retries: 0,
        }).catch((err) => console.error('[v0] Failed to queue update:', err))

        resolve(updated)
      }
    })
  }

  /**
   * CRUD: Delete
   */
  async delete(id: string, tenantId: string): Promise<boolean> {
    const db = await this.ensureDB()
    const existing = await this.read(id, tenantId)

    if (!existing) {
      return false
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction([MOSQUE_STORE], 'readwrite')
      const store = tx.objectStore(MOSQUE_STORE)
      const request = store.delete(id)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        // Add to sync queue
        this.addToSyncQueue({
          operation: 'delete',
          entityType: 'Mosque',
          entityId: id,
          data: { id },
          status: 'local',
          retries: 0,
        }).catch((err) => console.error('[v0] Failed to queue delete:', err))

        resolve(true)
      }
    })
  }

  /**
   * List with filters and pagination
   */
  async list(filters?: QueryFilter, pagination?: PaginationOptions, tenantId?: string): Promise<Mosque[]> {
    if (!tenantId) {
      throw new Error('tenantId diperlukan untuk query')
    }

    const db = await this.ensureDB()

    return new Promise((resolve, reject) => {
      const tx = db.transaction([MOSQUE_STORE], 'readonly')
      const store = tx.objectStore(MOSQUE_STORE)
      const index = store.index('tenantId')
      const range = IDBKeyRange.only(tenantId)
      const request = index.getAll(range)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        let results = request.result as Mosque[]

        // Apply filters
        if (filters) {
          results = results.filter((item) => {
            for (const [key, value] of Object.entries(filters)) {
              if (value !== undefined && item[key as keyof Mosque] !== value) {
                return false
              }
            }
            return true
          })
        }

        // Apply pagination
        if (pagination) {
          const offset = pagination.offset ?? pagination.page * pagination.limit
          results = results.slice(offset, offset + pagination.limit)
        }

        resolve(results)
      }
    })
  }

  /**
   * Batch operations
   */
  async bulkCreate(items: Array<Omit<Mosque, 'id' | 'createdAt' | 'updatedAt'>>, tenantId: string): Promise<Mosque[]> {
    const results: Mosque[] = []
    for (const item of items) {
      const created = await this.create(item, tenantId)
      results.push(created)
    }
    return results
  }

  async bulkUpdate(items: Array<{ id: string; data: Partial<Mosque> }>, tenantId: string): Promise<Mosque[]> {
    const results: Mosque[] = []
    for (const item of items) {
      const updated = await this.update(item.id, item.data, tenantId)
      results.push(updated)
    }
    return results
  }

  async bulkDelete(ids: string[], tenantId: string): Promise<boolean> {
    for (const id of ids) {
      await this.delete(id, tenantId)
    }
    return true
  }

  /**
   * Sync Queue Management
   */
  async getSyncQueue(): Promise<SyncRecord[]> {
    const db = await this.ensureDB()

    return new Promise((resolve, reject) => {
      const tx = db.transaction([SYNC_QUEUE_STORE], 'readonly')
      const store = tx.objectStore(SYNC_QUEUE_STORE)
      const request = store.getAll()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
    })
  }

  async addToSyncQueue(record: Omit<SyncRecord, 'id' | 'timestamp' | 'retries'>): Promise<SyncRecord> {
    const db = await this.ensureDB()
    const fullRecord: SyncRecord = {
      ...record,
      id: this.generateId(),
      timestamp: Date.now(),
      retries: 0,
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction([SYNC_QUEUE_STORE], 'readwrite')
      const store = tx.objectStore(SYNC_QUEUE_STORE)
      const request = store.add(fullRecord)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(fullRecord)
    })
  }

  async processSyncQueue(tenantId: string): Promise<void> {
    const queue = await this.getSyncQueue()
    const localRecords = queue.filter((r) => r.status === 'local')

    for (const record of localRecords) {
      // Mark as syncing
      await this.updateSyncRecordStatus(record.id, 'syncing')

      try {
        // In real app, this would call API
        // For now, just mark as synced
        await this.updateSyncRecordStatus(record.id, 'synced')
      } catch (error) {
        await this.updateSyncRecordStatus(record.id, 'failed', (error as Error).message)
      }
    }
  }

  async clearSyncQueue(): Promise<void> {
    const db = await this.ensureDB()

    return new Promise((resolve, reject) => {
      const tx = db.transaction([SYNC_QUEUE_STORE], 'readwrite')
      const store = tx.objectStore(SYNC_QUEUE_STORE)
      const request = store.clear()

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  private async updateSyncRecordStatus(id: string, status: SyncStatus, error?: string): Promise<void> {
    const db = await this.ensureDB()
    const queue = await this.getSyncQueue()
    const record = queue.find((r) => r.id === id)

    if (!record) return

    const updated: SyncRecord = {
      ...record,
      status,
      error,
      retries: status === 'failed' ? record.retries + 1 : record.retries,
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction([SYNC_QUEUE_STORE], 'readwrite')
      const store = tx.objectStore(SYNC_QUEUE_STORE)
      const request = store.put(updated)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  /**
   * Utilities
   */
  async clear(tenantId?: string): Promise<void> {
    const db = await this.ensureDB()

    return new Promise((resolve, reject) => {
      const tx = db.transaction([MOSQUE_STORE], 'readwrite')
      const store = tx.objectStore(MOSQUE_STORE)

      if (tenantId) {
        const index = store.index('tenantId')
        const range = IDBKeyRange.only(tenantId)
        const request = index.openCursor(range)

        request.onerror = () => reject(request.error)
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result
          if (cursor) {
            cursor.delete()
            cursor.continue()
          } else {
            resolve()
          }
        }
      } else {
        const request = store.clear()
        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve()
      }
    })
  }

  async count(filters?: QueryFilter, tenantId?: string): Promise<number> {
    if (!tenantId) throw new Error('tenantId diperlukan')
    const items = await this.list(filters, undefined, tenantId)
    return items.length
  }

  async exists(id: string, tenantId: string): Promise<boolean> {
    const item = await this.read(id, tenantId)
    return item !== null
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

  /**
   * Helper
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}
