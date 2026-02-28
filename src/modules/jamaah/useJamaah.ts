import { useCallback, useEffect } from 'react'
import { useJamaahStore, Jamaah } from '@/stores/jamaahStore'
import { jamaahService } from './jamaahService'
import { useTenant } from '@/context/TenantContext'
import { PaginationParams } from '@/types'

export const useJamaah = () => {
  const { currentTenant } = useTenant()
  const store = useJamaahStore()

  const loadJamaah = useCallback(
    (params?: PaginationParams) => {
      if (currentTenant) {
        jamaahService.fetchJamaah(currentTenant.id, params)
      }
    },
    [currentTenant]
  )

  const create = useCallback(
    (jamaah: Omit<Jamaah, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (currentTenant) {
        return jamaahService.createJamaah(currentTenant.id, jamaah)
      }
      throw new Error('No tenant selected')
    },
    [currentTenant]
  )

  const update = useCallback((id: string, updates: Partial<Jamaah>) => {
    return jamaahService.updateJamaah(id, updates)
  }, [])

  const remove = useCallback((id: string) => {
    return jamaahService.deleteJamaah(id)
  }, [])

  const sync = useCallback(() => {
    if (currentTenant) {
      return jamaahService.syncJamaah(currentTenant.id)
    }
  }, [currentTenant])

  useEffect(() => {
    loadJamaah()
  }, [loadJamaah])

  return {
    jamaah: store.jamaah,
    total: store.total,
    pagination: store.pagination,
    isLoading: store.isLoading,
    error: store.error,
    loadJamaah,
    create,
    update,
    delete: remove,
    sync,
    setPagination: store.setPagination,
  }
}
