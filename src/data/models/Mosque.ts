/**
 * Mosque Data Model & DTOs
 * Single source of truth for mosque data structure
 */

export interface Mosque {
  id: string
  tenantId: string
  name: string
  city: string
  address: string
  phone: string
  email: string
  leaderName: string
  leaderPhone: string
  status: 'active' | 'inactive'
  createdAt: Date
  updatedAt: Date
}

// Data Transfer Object - for API requests
export interface CreateMosqueDTO {
  name: string
  city: string
  address: string
  phone: string
  email: string
  leaderName: string
  leaderPhone: string
  status?: 'active' | 'inactive'
}

export interface UpdateMosqueDTO {
  name?: string
  city?: string
  address?: string
  phone?: string
  email?: string
  leaderName?: string
  leaderPhone?: string
  status?: 'active' | 'inactive'
}

// Response type wrapper
export interface MosqueResponse {
  success: boolean
  data?: Mosque
  error?: string
  statusCode?: number
}

export interface MosqueListResponse {
  success: boolean
  data?: Mosque[]
  total?: number
  page?: number
  limit?: number
  error?: string
  statusCode?: number
}

/**
 * Model utilities
 */
export const MosqueDefaults = {
  status: 'active' as const,
}

export const isValidMosque = (mosque: any): mosque is Mosque => {
  return (
    typeof mosque === 'object' &&
    typeof mosque.id === 'string' &&
    typeof mosque.tenantId === 'string' &&
    typeof mosque.name === 'string' &&
    typeof mosque.city === 'string' &&
    typeof mosque.status === 'string'
  )
}

export const sanitizeMosque = (data: any): CreateMosqueDTO => ({
  name: String(data.name || ''),
  city: String(data.city || ''),
  address: String(data.address || ''),
  phone: String(data.phone || ''),
  email: String(data.email || ''),
  leaderName: String(data.leaderName || ''),
  leaderPhone: String(data.leaderPhone || ''),
  status: data.status === 'inactive' ? 'inactive' : 'active',
})
