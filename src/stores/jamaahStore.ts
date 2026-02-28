import { create } from 'zustand'
import { PaginationParams, PaginatedResponse } from '@/types'

export interface Jamaah {
  id: string
  tenantId: string
  nama: string
  email?: string
  noHp?: string
  alamat?: string
  noKartuKeluarga?: string
  statusKeluarga?: 'kepala_keluarga' | 'istri' | 'anak' | 'lainnya'
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}

interface JamaahStore {
  jamaah: Jamaah[]
  pagination: PaginationParams
  total: number
  isLoading: boolean
  error?: string

  setJamaah: (jamaah: Jamaah[]) => void
  addJamaah: (jamaah: Jamaah) => void
  updateJamaah: (jamaah: Jamaah) => void
  deleteJamaah: (id: string) => void
  setPagination: (params: PaginationParams) => void
  setLoading: (loading: boolean) => void
  setError: (error?: string) => void
  setTotal: (total: number) => void
  clear: () => void
}

export const useJamaahStore = create<JamaahStore>((set) => ({
  jamaah: [],
  pagination: { page: 1, limit: 10 },
  total: 0,
  isLoading: false,
  error: undefined,

  setJamaah: (jamaah) => set({ jamaah }),

  addJamaah: (jamaah) =>
    set((state) => ({
      jamaah: [...state.jamaah, jamaah],
      total: state.total + 1,
    })),

  updateJamaah: (jamaah) =>
    set((state) => ({
      jamaah: state.jamaah.map((j) => (j.id === jamaah.id ? jamaah : j)),
    })),

  deleteJamaah: (id) =>
    set((state) => ({
      jamaah: state.jamaah.filter((j) => j.id !== id),
      total: state.total - 1,
    })),

  setPagination: (params) => set({ pagination: params }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  setTotal: (total) => set({ total }),

  clear: () =>
    set({
      jamaah: [],
      pagination: { page: 1, limit: 10 },
      total: 0,
      isLoading: false,
      error: undefined,
    }),
}))
