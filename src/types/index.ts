// Shared type definitions for multi-tenant architecture

// Tenant & Auth
export interface Tenant {
  id: string
  nama: string
  deskripsi: string
  lokasi: string
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}

export interface User {
  id: string
  tenantId: string
  email: string
  nama: string
  role: 'admin' | 'sekretaris' | 'bendahara' | 'anggota' | 'jamaah'
  photoUrl?: string
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}

export interface AuthState {
  user: User | null
  tenant: Tenant | null
  isAuthenticated: boolean
  isLoading: boolean
  error?: string
}

// Pagination
export interface PaginationParams {
  page: number
  limit: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// API Response
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  timestamp: number
}

// Repository Pattern
export interface IRepository<T> {
  create(item: T): Promise<T>
  read(id: string): Promise<T | null>
  readAll(tenantId: string, params?: PaginationParams): Promise<PaginatedResponse<T>>
  update(id: string, item: Partial<T>): Promise<T>
  delete(id: string): Promise<void>
  sync?(tenantId: string): Promise<void>
}
