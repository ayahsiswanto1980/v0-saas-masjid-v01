/**
 * Mosque-Specific Repository Interface
 * Extends IRepository with domain-specific operations
 */

import { IRepository } from './IRepository'
import { Mosque } from '../models/Mosque'

export interface IMosqueRepository extends IRepository<Mosque> {
  // Mosque-specific queries
  findByName(name: string, tenantId: string): Promise<Mosque | null>
  findByCity(city: string, tenantId: string): Promise<Mosque[]>
  findActive(tenantId: string): Promise<Mosque[]>

  // Statistics
  getStatistics(tenantId: string): Promise<{
    total: number
    active: number
    inactive: number
    byCity: Record<string, number>
  }>
}
