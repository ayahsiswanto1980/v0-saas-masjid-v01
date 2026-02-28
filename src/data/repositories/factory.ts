/**
 * Repository Factory
 * Centralized configuration-based repository creation
 * Switch data source with single config change
 */

import { IMosqueRepository } from '../contracts/IMosqueRepository'
import { MosqueIndexedDBRepository } from './MosqueIndexedDBRepository'
import { MosqueAPIRepository, APIConfig } from './MosqueAPIRepository'

export type DataSourceType = 'indexeddb' | 'api'

export interface RepositoryConfig {
  dataSource: DataSourceType
  apiConfig?: APIConfig
}

/**
 * Global configuration holder
 */
let globalConfig: RepositoryConfig = {
  dataSource: 'indexeddb',
}

/**
 * Set global configuration
 * Call this on app initialization
 */
export const setRepositoryConfig = (config: RepositoryConfig): void => {
  globalConfig = config
  console.log('[v0] Repository config set to:', config.dataSource)
}

/**
 * Get current configuration
 */
export const getRepositoryConfig = (): RepositoryConfig => {
  return globalConfig
}

/**
 * Create Mosque repository based on current config
 */
export const createMosqueRepository = (): IMosqueRepository => {
  const config = getRepositoryConfig()

  if (config.dataSource === 'api') {
    if (!config.apiConfig) {
      throw new Error('API config diperlukan untuk api data source')
    }
    return new MosqueAPIRepository(config.apiConfig)
  }

  return new MosqueIndexedDBRepository()
}

/**
 * Alternative: Factory function pattern
 * For advanced use cases where you need multiple instances
 */
export class RepositoryFactory {
  static createMosqueRepository(config?: Partial<RepositoryConfig>): IMosqueRepository {
    const finalConfig = config ? { ...globalConfig, ...config } : globalConfig

    if (finalConfig.dataSource === 'api') {
      if (!finalConfig.apiConfig) {
        throw new Error('API config diperlukan untuk api data source')
      }
      return new MosqueAPIRepository(finalConfig.apiConfig)
    }

    return new MosqueIndexedDBRepository()
  }
}

/**
 * Helper to check current data source
 */
export const isUsingAPI = (): boolean => {
  return getRepositoryConfig().dataSource === 'api'
}

export const isUsingIndexedDB = (): boolean => {
  return getRepositoryConfig().dataSource === 'indexeddb'
}
