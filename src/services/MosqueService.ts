/**
 * Mosque Service Layer
 * Business logic, validations, and use cases
 * Dependency Injection via constructor - depends on abstraction, not concrete implementations
 */

import { IMosqueRepository } from '../contracts/IMosqueRepository'
import { IRepository, QueryFilter, PaginationOptions } from '../contracts/IRepository'
import { Mosque, CreateMosqueDTO, sanitizeMosque } from '../models/Mosque'

export interface MosqueServiceOptions {
  enableValidation?: boolean
  enableCaching?: boolean
  cacheExpiry?: number
}

export class MosqueService {
  private repository: IMosqueRepository
  private currentTenantId: string | null = null
  private cache: Map<string, { data: Mosque; timestamp: number }> = new Map()
  private cacheExpiry: number

  /**
   * Dependency Injection via constructor
   * Repository is injected, not created internally
   * Allows easy testing and switching implementations
   */
  constructor(repository: IMosqueRepository, options?: MosqueServiceOptions) {
    this.repository = repository
    this.cacheExpiry = options?.cacheExpiry || 5 * 60 * 1000 // 5 minutes
  }

  /**
   * Set tenant context for all operations
   */
  setTenant(tenantId: string): void {
    this.currentTenantId = tenantId
  }

  /**
   * Get current tenant ID
   */
  getTenant(): string {
    if (!this.currentTenantId) {
      throw new Error('Tenant belum diatur. Panggil setTenant() terlebih dahulu')
    }
    return this.currentTenantId
  }

  /**
   * Business Logic: Create mosque with validation
   */
  async createMosque(dto: CreateMosqueDTO): Promise<Mosque> {
    const tenantId = this.getTenant()

    // Validation
    this.validateMosqueDTO(dto)

    // Sanitize input
    const sanitized = sanitizeMosque(dto)

    // Business rule: Check if mosque with same name exists in tenant
    const existing = await this.repository.findByName(sanitized.name, tenantId)
    if (existing) {
      throw new Error(`Masjid dengan nama "${sanitized.name}" sudah ada dalam tenant ini`)
    }

    // Create
    const mosque = await this.repository.create(sanitized as any, tenantId)

    // Invalidate cache
    this.invalidateCache()

    return mosque
  }

  /**
   * Business Logic: Get mosque with caching
   */
  async getMosque(id: string): Promise<Mosque | null> {
    const tenantId = this.getTenant()

    // Check cache
    const cached = this.cache.get(id)
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data
    }

    // Fetch
    const mosque = await this.repository.read(id, tenantId)

    // Cache
    if (mosque) {
      this.cache.set(id, { data: mosque, timestamp: Date.now() })
    }

    return mosque
  }

  /**
   * Business Logic: Update mosque with validation
   */
  async updateMosque(id: string, dto: Partial<CreateMosqueDTO>): Promise<Mosque> {
    const tenantId = this.getTenant()

    // Validation
    if (Object.keys(dto).length === 0) {
      throw new Error('Setidaknya satu field harus diperbarui')
    }

    // Check existence
    const existing = await this.repository.read(id, tenantId)
    if (!existing) {
      throw new Error(`Masjid ${id} tidak ditemukan`)
    }

    // Validate only provided fields
    if (dto.name || dto.city || dto.email) {
      this.validateMosqueDTO({ ...existing, ...dto })
    }

    // Update
    const updated = await this.repository.update(id, dto as any, tenantId)

    // Invalidate cache
    this.cache.delete(id)
    this.invalidateCache()

    return updated
  }

  /**
   * Business Logic: Delete mosque
   */
  async deleteMosque(id: string): Promise<boolean> {
    const tenantId = this.getTenant()

    // Check existence
    const existing = await this.repository.read(id, tenantId)
    if (!existing) {
      throw new Error(`Masjid ${id} tidak ditemukan`)
    }

    // Delete
    const success = await this.repository.delete(id, tenantId)

    // Invalidate cache
    this.cache.delete(id)
    this.invalidateCache()

    return success
  }

  /**
   * Business Logic: List mosques with filtering
   */
  async listMosques(filters?: QueryFilter, pagination?: PaginationOptions): Promise<{
    items: Mosque[]
    total: number
  }> {
    const tenantId = this.getTenant()

    const items = await this.repository.list(filters, pagination, tenantId)
    const total = await this.repository.count(filters, tenantId)

    return { items, total }
  }

  /**
   * Business Logic: Get active mosques only
   */
  async getActiveMosques(): Promise<Mosque[]> {
    const tenantId = this.getTenant()
    return this.repository.findActive(tenantId)
  }

  /**
   * Business Logic: Find by city
   */
  async getMosquesByCity(city: string): Promise<Mosque[]> {
    const tenantId = this.getTenant()
    return this.repository.findByCity(city, tenantId)
  }

  /**
   * Business Logic: Get statistics
   */
  async getStatistics(): Promise<{
    total: number
    active: number
    inactive: number
    byCity: Record<string, number>
  }> {
    const tenantId = this.getTenant()
    return this.repository.getStatistics(tenantId)
  }

  /**
   * Business Logic: Bulk operations
   */
  async bulkCreateMosques(dtos: CreateMosqueDTO[]): Promise<Mosque[]> {
    const tenantId = this.getTenant()

    // Validate all
    dtos.forEach((dto) => this.validateMosqueDTO(dto))

    const sanitized = dtos.map((dto) => sanitizeMosque(dto) as any)
    const mosques = await this.repository.bulkCreate(sanitized, tenantId)

    this.invalidateCache()
    return mosques
  }

  async bulkDeleteMosques(ids: string[]): Promise<boolean> {
    const tenantId = this.getTenant()

    // Verify all exist
    const allExist = await Promise.all(
      ids.map((id) => this.repository.exists(id, tenantId))
    )

    if (allExist.some((exists) => !exists)) {
      throw new Error('Beberapa masjid tidak ditemukan')
    }

    const success = await this.repository.bulkDelete(ids, tenantId)

    // Invalidate cache
    ids.forEach((id) => this.cache.delete(id))
    this.invalidateCache()

    return success
  }

  /**
   * Business Logic: Sync offline changes
   */
  async syncOfflineChanges(): Promise<{
    synced: number
    failed: number
  }> {
    const tenantId = this.getTenant()

    try {
      await this.repository.processSyncQueue(tenantId)

      const queue = await this.repository.getSyncQueue()
      const synced = queue.filter((r) => r.status === 'synced').length
      const failed = queue.filter((r) => r.status === 'failed').length

      return { synced, failed }
    } catch (error) {
      console.error('[v0] Sync failed:', error)
      throw new Error('Sinkronisasi offline gagal')
    }
  }

  /**
   * Clear all data for tenant
   */
  async clearTenantData(): Promise<void> {
    const tenantId = this.getTenant()
    await this.repository.clear(tenantId)
    this.invalidateCache()
  }

  /**
   * Validation helper
   */
  private validateMosqueDTO(dto: any): void {
    const errors: string[] = []

    if (!dto.name || dto.name.trim().length < 3) {
      errors.push('Nama masjid minimal 3 karakter')
    }

    if (!dto.city || dto.city.trim().length < 2) {
      errors.push('Kota minimal 2 karakter')
    }

    if (dto.email && !this.isValidEmail(dto.email)) {
      errors.push('Email tidak valid')
    }

    if (dto.phone && !this.isValidPhone(dto.phone)) {
      errors.push('Nomor telepon tidak valid')
    }

    if (errors.length > 0) {
      throw new Error(`Validasi gagal:\n${errors.join('\n')}`)
    }
  }

  private isValidEmail(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return regex.test(email)
  }

  private isValidPhone(phone: string): boolean {
    const regex = /^(\+62|0)[0-9]{9,12}$/
    return regex.test(phone)
  }

  /**
   * Cache management
   */
  private invalidateCache(): void {
    this.cache.clear()
  }

  clearCache(): void {
    this.invalidateCache()
  }

  /**
   * Get repository instance (for advanced use)
   */
  getRepository(): IMosqueRepository {
    return this.repository
  }
}
