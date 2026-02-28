# Quick Start: Adding New Modules

This guide shows how to quickly add the remaining 7 modules (donasi, takmir, ustadz, kajian, aset, notulensi, agenda) following the established pattern.

## Module Template

### 1. Create the Store
**File**: `src/stores/{moduleName}Store.ts`

```typescript
import { create } from 'zustand'
import { PaginationParams } from '@/types'

export interface Donasi {
  id: string
  tenantId: string
  jamaahId: string
  jumlah: number
  tanggal: Date
  keterangan?: string
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}

interface DonasiStore {
  donasi: Donasi[]
  pagination: PaginationParams
  total: number
  isLoading: boolean
  error?: string

  setDonasi: (donasi: Donasi[]) => void
  addDonasi: (item: Donasi) => void
  updateDonasi: (item: Donasi) => void
  deleteDonasi: (id: string) => void
  setPagination: (params: PaginationParams) => void
  setLoading: (loading: boolean) => void
  setError: (error?: string) => void
  setTotal: (total: number) => void
  clear: () => void
}

export const useDonasiStore = create<DonasiStore>((set) => ({
  donasi: [],
  pagination: { page: 1, limit: 10 },
  total: 0,
  isLoading: false,
  error: undefined,

  setDonasi: (donasi) => set({ donasi }),
  addDonasi: (item) => set((state) => ({
    donasi: [...state.donasi, item],
    total: state.total + 1,
  })),
  // ... other setters
  clear: () => set({
    donasi: [],
    pagination: { page: 1, limit: 10 },
    total: 0,
    isLoading: false,
    error: undefined,
  }),
}))
```

### 2. Create the Repository
**File**: `src/modules/{moduleName}/{moduleName}Repository.ts`

```typescript
import { BaseRepository } from '@/repositories/BaseRepository'
import { Donasi } from '@/stores/donasiStore'

export class DonasiRepository extends BaseRepository<Donasi> {
  protected storeName = 'donasi'
  protected apiEndpoint = '/donasi'
}

export const donasiRepository = new DonasiRepository()
```

### 3. Create the Service
**File**: `src/modules/{moduleName}/{moduleName}Service.ts`

```typescript
import { PaginationParams } from '@/types'
import { Donasi } from '@/stores/donasiStore'
import { donasiRepository } from './donasiRepository'
import { useDonasiStore } from '@/stores/donasiStore'

export class DonasiService {
  async fetchDonasi(tenantId: string, params?: PaginationParams): Promise<void> {
    const store = useDonasiStore.getState()
    store.setLoading(true)
    store.setError(undefined)

    try {
      const result = await donasiRepository.readAll(tenantId, params)
      store.setDonasi(result.data)
      store.setTotal(result.total)
      if (params) store.setPagination(params)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch donasi'
      store.setError(message)
    } finally {
      store.setLoading(false)
    }
  }

  async createDonasi(tenantId: string, donasi: Omit<Donasi, 'id' | 'createdAt' | 'updatedAt'>): Promise<Donasi> {
    const store = useDonasiStore.getState()
    const newDonasi: Donasi = {
      ...donasi,
      id: `donasi-${Date.now()}`,
      tenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const created = await donasiRepository.create(newDonasi)
    store.addDonasi(created)
    return created
  }

  async updateDonasi(id: string, updates: Partial<Donasi>): Promise<Donasi> {
    const store = useDonasiStore.getState()
    const updated = await donasiRepository.update(id, updates)
    store.updateDonasi(updated)
    return updated
  }

  async deleteDonasi(id: string): Promise<void> {
    const store = useDonasiStore.getState()
    await donasiRepository.delete(id)
    store.deleteDonasi(id)
  }

  async syncDonasi(tenantId: string): Promise<void> {
    await donasiRepository.sync(tenantId)
    await this.fetchDonasi(tenantId)
  }
}

export const donasiService = new DonasiService()
```

### 4. Create the Custom Hook
**File**: `src/modules/{moduleName}/use{ModuleName}.ts`

```typescript
import { useCallback, useEffect } from 'react'
import { useDonasiStore, Donasi } from '@/stores/donasiStore'
import { donasiService } from './donasiService'
import { useTenant } from '@/context/TenantContext'
import { PaginationParams } from '@/types'

export const useDonasi = () => {
  const { currentTenant } = useTenant()
  const store = useDonasiStore()

  const loadDonasi = useCallback(
    (params?: PaginationParams) => {
      if (currentTenant) {
        donasiService.fetchDonasi(currentTenant.id, params)
      }
    },
    [currentTenant]
  )

  const create = useCallback(
    (donasi: Omit<Donasi, 'id' | 'createdAt' | 'updatedAt'>) => {
      if (currentTenant) {
        return donasiService.createDonasi(currentTenant.id, donasi)
      }
      throw new Error('No tenant selected')
    },
    [currentTenant]
  )

  const update = useCallback((id: string, updates: Partial<Donasi>) => {
    return donasiService.updateDonasi(id, updates)
  }, [])

  const remove = useCallback((id: string) => {
    return donasiService.deleteDonasi(id)
  }, [])

  useEffect(() => {
    loadDonasi()
  }, [loadDonasi])

  return {
    donasi: store.donasi,
    total: store.total,
    pagination: store.pagination,
    isLoading: store.isLoading,
    error: store.error,
    loadDonasi,
    create,
    update,
    delete: remove,
    setPagination: store.setPagination,
  }
}
```

### 5. Create Components
**File**: `src/modules/{moduleName}/components/`

Create:
- `{ModuleName}List.tsx` - Main list view
- `{ModuleName}Form.tsx` - Create/edit form
- `{ModuleName}Card.tsx` - Item card display

Use `JamaahList.tsx`, `JamaahForm.tsx`, `JamaahCard.tsx` as templates.

---

## Module Data Models

### 1. Donasi (Donations)
```typescript
interface Donasi {
  id: string
  tenantId: string
  jamaahId: string
  jumlah: number
  tanggal: Date
  keterangan?: string
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}
```
**Store**: `donasi` | **Indexes**: `tenantId`, `jamaahId`, `tanggal`

### 2. Takmir (Committee)
```typescript
interface Takmir {
  id: string
  tenantId: string
  jamaahId: string
  posisi: 'ketua' | 'sekretaris' | 'bendahara' | 'anggota'
  periodeTahun: string
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}
```
**Store**: `takmir` | **Indexes**: `tenantId`, `jamaahId`, `posisi`

### 3. Ustadz (Scholars)
```typescript
interface Ustadz {
  id: string
  tenantId: string
  nama: string
  email?: string
  noHp?: string
  keahlian?: string
  riwayatPendidikan?: string
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}
```
**Store**: `ustadz` | **Indexes**: `tenantId`, `email`

### 4. Kajian (Study Classes)
```typescript
interface Kajian {
  id: string
  tenantId: string
  ustadzId: string
  judul: string
  deskripsi?: string
  tanggal: Date
  waktuMulai: string
  waktSelesai: string
  tempat?: string
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}
```
**Store**: `kajian` | **Indexes**: `tenantId`, `ustadzId`, `tanggal`

### 5. Aset (Assets)
```typescript
interface Aset {
  id: string
  tenantId: string
  nama: string
  kategori: 'bangunan' | 'kendaraan' | 'elektronik' | 'furnitur' | 'lainnya'
  kondisi: 'baik' | 'rusak_ringan' | 'rusak_berat'
  nilaiPerolehan: number
  tanggalPerolehan: Date
  keterangan?: string
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}
```
**Store**: `aset` | **Indexes**: `tenantId`, `kategori`

### 6. Notulensi (Meeting Notes)
```typescript
interface Notulensi {
  id: string
  tenantId: string
  agendaId: string
  tanggal: Date
  peserta?: string[]
  ringkasan: string
  keputusan?: string
  tindakLanjut?: string
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}
```
**Store**: `notulensi` | **Indexes**: `tenantId`, `agendaId`, `tanggal`

### 7. Agenda (Schedule/Events)
```typescript
interface Agenda {
  id: string
  tenantId: string
  judul: string
  deskripsi?: string
  tanggal: Date
  waktuMulai: string
  waktuSelesai: string
  tipe: 'sholat' | 'kajian' | 'rapat' | 'acara' | 'lainnya'
  tempat?: string
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}
```
**Store**: `agenda` | **Indexes**: `tenantId`, `tanggal`

---

## IndexedDB Store Registration

Add to `src/datasource/IndexedDBDatasource.ts` in the `onupgradeneeded` section:

```typescript
const stores = [
  { name: 'users', keyPath: 'id', indexes: [['tenantId', false], ['email', true]] },
  { name: 'jamaah', keyPath: 'id', indexes: [['tenantId', false], ['email', true]] },
  { name: 'donasi', keyPath: 'id', indexes: [['tenantId', false], ['jamaahId', false], ['tanggal', false]] },
  { name: 'takmir', keyPath: 'id', indexes: [['tenantId', false], ['jamaahId', false]] },
  { name: 'ustadz', keyPath: 'id', indexes: [['tenantId', false], ['email', true]] },
  { name: 'kajian', keyPath: 'id', indexes: [['tenantId', false], ['ustadzId', false], ['tanggal', false]] },
  { name: 'aset', keyPath: 'id', indexes: [['tenantId', false], ['kategori', false]] },
  { name: 'notulensi', keyPath: 'id', indexes: [['tenantId', false], ['agendaId', false], ['tanggal', false]] },
  { name: 'agenda', keyPath: 'id', indexes: [['tenantId', false], ['tanggal', false]] },
  { name: 'sync_queue', keyPath: 'id' },
]
```

---

## Checklist for Each Module

- [ ] Create store (`src/stores/{moduleName}Store.ts`)
- [ ] Create repository (`src/modules/{moduleName}/{moduleName}Repository.ts`)
- [ ] Create service (`src/modules/{moduleName}/{moduleName}Service.ts`)
- [ ] Create hook (`src/modules/{moduleName}/use{ModuleName}.ts`)
- [ ] Create List component (`src/modules/{moduleName}/components/{ModuleName}List.tsx`)
- [ ] Create Form component (`src/modules/{moduleName}/components/{ModuleName}Form.tsx`)
- [ ] Create Card component (`src/modules/{moduleName}/components/{ModuleName}Card.tsx`)
- [ ] Register IndexedDB store
- [ ] Add to navigation/routing

---

## Implementation Order (Recommended)

1. **Donasi** - Simple structure, heavily used
2. **Agenda** - Core for schedule management
3. **Kajian** - Related to ustadz and agenda
4. **Ustadz** - Teacher/scholar management
5. **Takmir** - Committee structure
6. **Aset** - Asset tracking
7. **Notulensi** - Meeting notes, last priority

---

## Key Files Already Created (Use as Reference)

- `src/stores/jamaahStore.ts` - Store pattern
- `src/modules/jamaah/jamaahRepository.ts` - Repository pattern
- `src/modules/jamaah/jamaahService.ts` - Service pattern
- `src/modules/jamaah/useJamaah.ts` - Hook pattern
- `src/modules/jamaah/components/JamaahList.tsx` - List component
- `src/modules/jamaah/components/JamaahForm.tsx` - Form component
- `src/modules/jamaah/components/JamaahCard.tsx` - Card component
- `src/context/TenantContext.tsx` - Tenant isolation pattern
- `src/datasource/IndexedDBDatasource.ts` - Offline storage
- `src/datasource/APIDatasource.ts` - API communication

All modules follow the same pattern established by auth and jamaah modules.

---

## Common Patterns

### Fetching with Pagination
```typescript
const { loadJamaah, setPagination } = useJamaah()

// Initial load (page 1)
useEffect(() => {
  loadJamaah()
}, [])

// Change page
const handlePageChange = (page: number) => {
  setPagination({ page, limit: 10 })
  loadJamaah({ page, limit: 10 })
}
```

### Creating Items with Validation
```typescript
const { create } = useJamaah()

const handleSubmit = async (formData) => {
  try {
    await create(formData)
    setShowForm(false)
  } catch (error) {
    setError(error.message)
  }
}
```

### Offline Support
The `BaseRepository` automatically handles:
- Offline: Save locally to IndexedDB + add to sync_queue
- Online: POST to API + cache locally
- Sync: Check sync_queue and retry on reconnect

No additional code needed in modules!
