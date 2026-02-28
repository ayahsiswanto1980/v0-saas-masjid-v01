/**
 * Base Repository Interface
 * Defines contract for all CRUD operations and sync management
 * Implementers: MosqueIndexedDBRepository, MosqueAPIRepository
 */

export interface PaginationOptions {
  page: number
  limit: number
  offset?: number
}

export interface QueryFilter {
  [key: string]: string | number | boolean | undefined
}

export type SyncStatus = 'local' | 'syncing' | 'synced' | 'failed'

export interface SyncRecord {
  id: string
  operation: 'create' | 'update' | 'delete'
  entityType: string
  entityId: string
  data: any
  status: SyncStatus
  error?: string
  timestamp: number
  retries: number
}

export interface RepositoryResponse<T> {
  success: boolean
  data?: T
  error?: string
  statusCode?: number
}

export interface IRepository<T> {
  // CRUD Operations
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>, tenantId: string): Promise<T>
  read(id: string, tenantId: string): Promise<T | null>
  update(id: string, data: Partial<T>, tenantId: string): Promise<T>
  delete(id: string, tenantId: string): Promise<boolean>
  list(filters?: QueryFilter, pagination?: PaginationOptions, tenantId?: string): Promise<T[]>

  // Batch Operations
  bulkCreate(items: Array<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>, tenantId: string): Promise<T[]>
  bulkUpdate(items: Array<{ id: string; data: Partial<T> }>, tenantId: string): Promise<T[]>
  bulkDelete(ids: string[], tenantId: string): Promise<boolean>

  // Sync Operations (for offline support)
  getSyncQueue(): Promise<SyncRecord[]>
  addToSyncQueue(record: Omit<SyncRecord, 'id' | 'timestamp' | 'retries'>): Promise<SyncRecord>
  processSyncQueue(tenantId: string): Promise<void>
  clearSyncQueue(): Promise<void>

  // Utility
  clear(tenantId?: string): Promise<void>
  count(filters?: QueryFilter, tenantId?: string): Promise<number>
  exists(id: string, tenantId: string): Promise<boolean>
}
