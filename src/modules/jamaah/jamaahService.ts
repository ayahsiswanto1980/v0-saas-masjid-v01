import { PaginationParams, PaginatedResponse } from '@/types'
import { Jamaah } from '@/stores/jamaahStore'
import { jamaahRepository } from './jamaahRepository'
import { useJamaahStore } from '@/stores/jamaahStore'

export class JamaahService {
  async fetchJamaah(tenantId: string, params?: PaginationParams): Promise<void> {
    const store = useJamaahStore.getState()
    store.setLoading(true)
    store.setError(undefined)

    try {
      const result = await jamaahRepository.readAll(tenantId, params)
      store.setJamaah(result.data)
      store.setTotal(result.total)
      if (params) store.setPagination(params)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal mengambil data jamaah'
      store.setError(message)
    } finally {
      store.setLoading(false)
    }
  }

  async createJamaah(tenantId: string, jamaah: Omit<Jamaah, 'id' | 'createdAt' | 'updatedAt'>): Promise<Jamaah> {
    const store = useJamaahStore.getState()
    const newJamaah: Jamaah = {
      ...jamaah,
      id: `jamaah-${Date.now()}`,
      tenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const created = await jamaahRepository.create(newJamaah)
    store.addJamaah(created)
    return created
  }

  async updateJamaah(id: string, updates: Partial<Jamaah>): Promise<Jamaah> {
    const store = useJamaahStore.getState()
    const updated = await jamaahRepository.update(id, updates)
    store.updateJamaah(updated)
    return updated
  }

  async deleteJamaah(id: string): Promise<void> {
    const store = useJamaahStore.getState()
    await jamaahRepository.delete(id)
    store.deleteJamaah(id)
  }

  async syncJamaah(tenantId: string): Promise<void> {
    await jamaahRepository.sync(tenantId)
    // Refresh after sync
    await this.fetchJamaah(tenantId)
  }
}

export const jamaahService = new JamaahService()
