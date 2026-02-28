/**
 * Repository Provider Context
 * Provides DI container and services to React components
 * Alternative to passing props through component tree
 */

import React, { ReactNode, useContext } from 'react'
import { MosqueService } from '../services/MosqueService'
import { IMosqueRepository } from '../contracts/IMosqueRepository'
import { initializeDIContainer, getService, RepositoryConfig } from '../config/di-container'

interface RepositoryContextType {
  mosqueService: MosqueService
  mosqueRepository: IMosqueRepository
  config: RepositoryConfig
}

/**
 * Create context
 */
const RepositoryContext = React.createContext<RepositoryContextType | undefined>(undefined)

interface RepositoryProviderProps {
  config: RepositoryConfig
  children: ReactNode
}

/**
 * Provider component
 * Wrap your app with this to inject services via context
 */
export const RepositoryProvider: React.FC<RepositoryProviderProps> = ({ config, children }) => {
  // Initialize DI container once
  React.useMemo(() => {
    initializeDIContainer(config)
  }, [config.dataSource]) // Re-init if data source changes

  const value: RepositoryContextType = {
    mosqueService: getService<MosqueService>('MosqueService'),
    mosqueRepository: getService<IMosqueRepository>('MosqueRepository'),
    config,
  }

  return <RepositoryContext.Provider value={value}>{children}</RepositoryContext.Provider>
}

/**
 * Hook to use repository context
 */
export const useRepositoryContext = (): RepositoryContextType => {
  const context = useContext(RepositoryContext)

  if (!context) {
    throw new Error('useRepositoryContext harus digunakan dalam RepositoryProvider')
  }

  return context
}

/**
 * Hook to use mosque service
 */
export const useMosqueService = (): MosqueService => {
  const { mosqueService } = useRepositoryContext()
  return mosqueService
}

/**
 * Hook to use mosque repository
 */
export const useMosqueRepository = (): IMosqueRepository => {
  const { mosqueRepository } = useRepositoryContext()
  return mosqueRepository
}

/**
 * Hook to get config
 */
export const useRepositoryConfig = (): RepositoryConfig => {
  const { config } = useRepositoryContext()
  return config
}
