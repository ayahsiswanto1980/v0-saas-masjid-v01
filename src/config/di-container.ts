/**
 * Simple Dependency Injection Container
 * Manages service lifecycle and dependency injection
 */

import { IMosqueRepository } from '../contracts/IMosqueRepository'
import { createMosqueRepository, setRepositoryConfig, RepositoryConfig } from '../data/repositories/factory'
import { MosqueService } from '../services/MosqueService'

interface ServiceRegistry {
  [key: string]: any
}

class DIContainer {
  private singletons: ServiceRegistry = {}
  private factories: ServiceRegistry = {}

  /**
   * Register a singleton service
   */
  registerSingleton<T>(name: string, instance: T): void {
    this.singletons[name] = instance
  }

  /**
   * Register a factory function
   */
  registerFactory<T>(name: string, factory: () => T): void {
    this.factories[name] = factory
  }

  /**
   * Get service
   */
  get<T>(name: string): T {
    // Check singletons first
    if (name in this.singletons) {
      return this.singletons[name] as T
    }

    // Check factories
    if (name in this.factories) {
      const instance = this.factories[name]()
      // Convert factory to singleton
      this.singletons[name] = instance
      return instance
    }

    throw new Error(`Service "${name}" tidak terdaftar dalam DI container`)
  }

  /**
   * Check if service exists
   */
  has(name: string): boolean {
    return name in this.singletons || name in this.factories
  }

  /**
   * Clear all services
   */
  clear(): void {
    this.singletons = {}
    this.factories = {}
  }
}

/**
 * Global DI Container instance
 */
const container = new DIContainer()

/**
 * Initialize DI container with configuration
 */
export const initializeDIContainer = (config: RepositoryConfig): void => {
  // Set global repository config
  setRepositoryConfig(config)

  // Register repository
  container.registerFactory<IMosqueRepository>('MosqueRepository', () => createMosqueRepository())

  // Register service with injected repository
  container.registerFactory<MosqueService>('MosqueService', () => {
    const repository = container.get<IMosqueRepository>('MosqueRepository')
    return new MosqueService(repository)
  })

  console.log('[v0] DI container initialized with config:', config.dataSource)
}

/**
 * Get service from container
 */
export const getService = <T = any>(name: string): T => {
  return container.get<T>(name)
}

/**
 * Get Mosque Service
 */
export const getMosqueService = (): MosqueService => {
  return getService<MosqueService>('MosqueService')
}

/**
 * Get Mosque Repository
 */
export const getMosqueRepository = (): IMosqueRepository => {
  return getService<IMosqueRepository>('MosqueRepository')
}

/**
 * Switch data source at runtime
 * Useful for testing or multi-environment setup
 */
export const switchDataSource = (config: RepositoryConfig): void => {
  // Clear singletons to force re-creation
  container.clear()

  // Re-initialize with new config
  initializeDIContainer(config)
}

/**
 * Export container for advanced use cases
 */
export { container, DIContainer }
