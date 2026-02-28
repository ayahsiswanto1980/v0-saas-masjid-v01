# Repository Pattern - Practical Examples

Contoh real-world menggunakan Repository Pattern.

---

## 1. Basic CRUD Operations

### Create (Membuat Data)

```typescript
// Component
function CreateMosqueDialog() {
  const service = useMosqueService()

  const handleCreate = async (formData: CreateMosqueDTO) => {
    try {
      const mosque = await service.createMosque(formData)
      toast.success(`Masjid "${mosque.name}" berhasil dibuat`)
      // UI updates automatically
    } catch (error) {
      toast.error(error.message)
    }
  }

  return <MosqueForm onSubmit={handleCreate} />
}
```

**Service melakukan:**
1. Validasi input
2. Check business rules (nama unik)
3. Create di repository (IndexedDB atau API)
4. Return hasil

**Repository melakukan:**
- IndexedDB: Store di database lokal + add to sync queue
- API: POST ke server + handle response

### Read (Membaca Data)

```typescript
// Component
function MosqueDetail({ mosqueId }: { mosqueId: string }) {
  const service = useMosqueService()
  const [mosque, setMosque] = useState<Mosque | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    service.getMosque(mosqueId)
      .then(setMosque)
      .finally(() => setLoading(false))
  }, [mosqueId])

  if (loading) return <Skeleton />
  if (!mosque) return <NotFound />

  return (
    <div>
      <h1>{mosque.name}</h1>
      <p>{mosque.city}</p>
      {/* ... */}
    </div>
  )
}
```

**Service melakukan:**
1. Get dari repository
2. Manage cache
3. Return data

**Repository melakukan:**
- IndexedDB: Query dengan tenant isolation
- API: GET /api/mosques/{id} + tenant_id param

### Update (Mengubah Data)

```typescript
function EditMosqueDialog({ mosqueId, onClose }: Props) {
  const service = useMosqueService()
  const [mosque, setMosque] = useState<Mosque>()

  const handleUpdate = async (formData: Partial<CreateMosqueDTO>) => {
    try {
      const updated = await service.updateMosque(mosqueId, formData)
      toast.success('Masjid berhasil diperbarui')
      onClose()
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <MosqueForm
      initialData={mosque}
      onSubmit={handleUpdate}
    />
  )
}
```

**Service melakukan:**
1. Validasi input
2. Check existence
3. Validate only changed fields
4. Update di repository
5. Invalidate cache

**Repository melakukan:**
- IndexedDB: Update record + queue operation
- API: PUT /api/mosques/{id} + sync data

### Delete (Menghapus Data)

```typescript
function MosqueCard({ mosque }: { mosque: Mosque }) {
  const service = useMosqueService()

  const handleDelete = async () => {
    if (!confirm('Yakin hapus masjid ini?')) return

    try {
      await service.deleteMosque(mosque.id)
      toast.success('Masjid berhasil dihapus')
      // Trigger list refresh
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <div>
      <h3>{mosque.name}</h3>
      <button onClick={handleDelete} className="text-red-600">
        Hapus
      </button>
    </div>
  )
}
```

---

## 2. List dengan Filter & Pagination

### Simple List

```typescript
function MosqueList() {
  const service = useMosqueService()
  const [mosques, setMosques] = useState<Mosque[]>([])

  useEffect(() => {
    service.listMosques().then(({ items }) => {
      setMosques(items)
    })
  }, [])

  return (
    <ul>
      {mosques.map(m => (
        <li key={m.id}>{m.name}</li>
      ))}
    </ul>
  )
}
```

### List dengan Filter

```typescript
function FilteredMosqueList() {
  const service = useMosqueService()
  const [mosques, setMosques] = useState<Mosque[]>([])
  const [city, setCity] = useState('')

  useEffect(() => {
    service.listMosques({ city }).then(({ items }) => {
      setMosques(items)
    })
  }, [city])

  return (
    <div>
      <select value={city} onChange={e => setCity(e.target.value)}>
        <option value="">Semua Kota</option>
        <option value="Jakarta">Jakarta</option>
        <option value="Bandung">Bandung</option>
      </select>

      <ul>
        {mosques.map(m => (
          <li key={m.id}>{m.name} - {m.city}</li>
        ))}
      </ul>
    </div>
  )
}
```

### List dengan Pagination

```typescript
function PaginatedMosqueList() {
  const service = useMosqueService()
  const [mosques, setMosques] = useState<Mosque[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(0)

  const pageSize = 10

  useEffect(() => {
    service.listMosques(undefined, {
      page,
      limit: pageSize
    }).then(({ items, total }) => {
      setMosques(items)
      setTotal(total)
    })
  }, [page])

  const pages = Math.ceil(total / pageSize)

  return (
    <div>
      <ul>
        {mosques.map(m => (
          <li key={m.id}>{m.name}</li>
        ))}
      </ul>

      <div className="flex gap-2">
        {Array.from({ length: pages }).map((_, i) => (
          <button
            key={i}
            onClick={() => setPage(i)}
            className={page === i ? 'font-bold' : ''}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  )
}
```

---

## 3. Domain-Specific Queries

### Find by City

```typescript
function MosquesInCity({ city }: { city: string }) {
  const service = useMosqueService()
  const [mosques, setMosques] = useState<Mosque[]>([])

  useEffect(() => {
    service.getMosquesByCity(city).then(setMosques)
  }, [city])

  return (
    <div>
      <h2>Masjid di {city}</h2>
      <ul>
        {mosques.map(m => (
          <li key={m.id}>{m.name}</li>
        ))}
      </ul>
    </div>
  )
}
```

### Get Active Only

```typescript
function ActiveMosqueList() {
  const service = useMosqueService()
  const [mosques, setMosques] = useState<Mosque[]>([])

  useEffect(() => {
    service.getActiveMosques().then(setMosques)
  }, [])

  return (
    <ul>
      {mosques.map(m => (
        <li key={m.id}>{m.name}</li>
      ))}
    </ul>
  )
}
```

### Get Statistics

```typescript
function MosqueDashboard() {
  const service = useMosqueService()
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    service.getStatistics().then(setStats)
  }, [])

  if (!stats) return <Skeleton />

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card>
        <div className="text-3xl font-bold">{stats.total}</div>
        <div className="text-gray-600">Total Masjid</div>
      </Card>

      <Card>
        <div className="text-3xl font-bold">{stats.active}</div>
        <div className="text-gray-600">Aktif</div>
      </Card>

      <Card>
        <div className="text-3xl font-bold">{stats.inactive}</div>
        <div className="text-gray-600">Tidak Aktif</div>
      </Card>

      <div className="col-span-3">
        <h3>Per Kota</h3>
        {Object.entries(stats.byCity).map(([city, count]) => (
          <div key={city} className="flex justify-between">
            <span>{city}</span>
            <span className="font-bold">{count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

---

## 4. Batch Operations

### Bulk Create

```typescript
function ImportMosques() {
  const service = useMosqueService()

  const handleImport = async (csvFile: File) => {
    const text = await csvFile.text()
    const lines = text.split('\n')

    const dtos: CreateMosqueDTO[] = lines
      .slice(1) // skip header
      .map(line => {
        const [name, city, address, phone, email] = line.split(',')
        return { name, city, address, phone, email }
      })

    try {
      const created = await service.bulkCreateMosques(dtos)
      toast.success(`${created.length} masjid berhasil diimpor`)
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <input
      type="file"
      accept=".csv"
      onChange={e => {
        if (e.target.files?.[0]) {
          handleImport(e.target.files[0])
        }
      }}
    />
  )
}
```

### Bulk Delete

```typescript
function MosqueListWithSelection() {
  const service = useMosqueService()
  const [mosques, setMosques] = useState<Mosque[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const handleDeleteSelected = async () => {
    if (!confirm(`Hapus ${selected.size} masjid?`)) return

    try {
      await service.bulkDeleteMosques(Array.from(selected))
      toast.success('Masjid berhasil dihapus')
      setSelected(new Set())
      // Refresh list
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <div>
      <button
        onClick={handleDeleteSelected}
        disabled={selected.size === 0}
      >
        Hapus ({selected.size})
      </button>

      <ul>
        {mosques.map(m => (
          <li key={m.id}>
            <input
              type="checkbox"
              checked={selected.has(m.id)}
              onChange={e => {
                const newSelected = new Set(selected)
                if (e.target.checked) {
                  newSelected.add(m.id)
                } else {
                  newSelected.delete(m.id)
                }
                setSelected(newSelected)
              }}
            />
            {m.name}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

---

## 5. Offline Support & Sync

### Sync Offline Changes

```typescript
function SyncStatus() {
  const service = useMosqueService()
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ synced: number; failed: number } | null>(null)

  const handleSync = async () => {
    setSyncing(true)
    try {
      const result = await service.syncOfflineChanges()
      setSyncResult(result)
      toast.success(`Sinkronisasi selesai: ${result.synced} synced, ${result.failed} failed`)
    } catch (error) {
      toast.error('Sinkronisasi gagal: ' + error.message)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div>
      <button onClick={handleSync} disabled={syncing}>
        {syncing ? 'Sinkronisasi...' : 'Sinkronisasi'}
      </button>

      {syncResult && (
        <div>
          <p>✓ {syncResult.synced} operasi berhasil disinkronisasi</p>
          {syncResult.failed > 0 && (
            <p className="text-red-600">✗ {syncResult.failed} operasi gagal</p>
          )}
        </div>
      )}
    </div>
  )
}
```

### Monitor Offline Queue

```typescript
function SyncQueueMonitor() {
  const repo = useMosqueRepository()
  const [queue, setQueue] = useState<SyncRecord[]>([])

  useEffect(() => {
    const interval = setInterval(async () => {
      const q = await repo.getSyncQueue()
      setQueue(q)
    }, 1000)

    return () => clearInterval(interval)
  }, [repo])

  return (
    <div className="border p-4 rounded">
      <h3>Sync Queue ({queue.length})</h3>

      {queue.length === 0 ? (
        <p className="text-green-600">✓ Semua tersinkronisasi</p>
      ) : (
        <ul className="space-y-2">
          {queue.map(record => (
            <li
              key={record.id}
              className={`p-2 rounded ${
                record.status === 'local'
                  ? 'bg-yellow-100'
                  : record.status === 'synced'
                  ? 'bg-green-100'
                  : 'bg-red-100'
              }`}
            >
              <div className="font-bold">{record.operation} {record.entityType}</div>
              <div className="text-sm">
                Status: {record.status} ({record.retries} retries)
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

---

## 6. Error Handling

### Complete Error Handling

```typescript
function MosqueFormWithErrorHandling() {
  const service = useMosqueService()
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (dto: CreateMosqueDTO) => {
    setErrors({})

    try {
      const mosque = await service.createMosque(dto)
      toast.success('Berhasil')
      return mosque
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'

      // Parse validation errors
      if (message.includes('Validasi gagal')) {
        const lines = message.split('\n').slice(1)
        lines.forEach(line => {
          const [field, ...rest] = line.split(':')
          setErrors(prev => ({
            ...prev,
            [field.trim()]: rest.join(':').trim()
          }))
        })
      } else if (message.includes('sudah ada')) {
        setErrors({ name: 'Nama masjid sudah ada' })
      } else {
        toast.error(message)
      }
    }
  }

  return (
    <form onSubmit={e => {
      e.preventDefault()
      const formData = new FormData(e.currentTarget)
      handleSubmit({
        name: formData.get('name') as string,
        city: formData.get('city') as string,
        // ...
      })
    }}>
      <input
        name="name"
        placeholder="Nama"
        className={errors.name ? 'border-red-500' : ''}
      />
      {errors.name && <span className="text-red-600">{errors.name}</span>}

      {/* ... other fields */}

      <button type="submit">Simpan</button>
    </form>
  )
}
```

---

## 7. Testing Examples

### Unit Test Repository

```typescript
describe('MosqueIndexedDBRepository', () => {
  let repository: IMosqueRepository
  const tenantId = 'test-tenant'

  beforeEach(async () => {
    repository = new MosqueIndexedDBRepository()
    await repository.clear(tenantId)
  })

  it('should create mosque', async () => {
    const dto = { name: 'Test', city: 'Jakarta' }
    const mosque = await repository.create(dto as any, tenantId)

    expect(mosque.id).toBeDefined()
    expect(mosque.name).toBe('Test')
    expect(mosque.tenantId).toBe(tenantId)
  })

  it('should enforce tenant isolation', async () => {
    const dto = { name: 'Test', city: 'Jakarta' }
    const m1 = await repository.create(dto as any, 'tenant1')
    const m2 = await repository.create(dto as any, 'tenant2')

    const found = await repository.read(m1.id, 'tenant2')
    expect(found).toBeNull() // Can't access other tenant's data
  })
})
```

### Unit Test Service

```typescript
describe('MosqueService', () => {
  let service: MosqueService
  let mockRepository: IMosqueRepository

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      read: jest.fn(),
      findByName: jest.fn().mockResolvedValue(null),
      // ... other mocks
    } as any

    service = new MosqueService(mockRepository)
    service.setTenant('test-tenant')
  })

  it('should validate before creating', async () => {
    const invalidDto = { name: 'AB', city: 'J' } // Too short

    await expect(service.createMosque(invalidDto as any))
      .rejects.toThrow('Validasi gagal')
  })

  it('should check duplicate name', async () => {
    const dto = { name: 'Test', city: 'Jakarta' }
    const existing = { id: '1', name: 'Test', tenantId: 'test-tenant' }

    ;(mockRepository.findByName as jest.Mock).mockResolvedValue(existing)

    await expect(service.createMosque(dto as any))
      .rejects.toThrow('sudah ada')
  })
})
```

---

## 8. Migration Test

### Test Both Implementations

```typescript
describe('Repository Migration', () => {
  let indexeddbRepo: IMosqueRepository
  let apiRepo: IMosqueRepository

  beforeEach(() => {
    indexeddbRepo = new MosqueIndexedDBRepository()
    apiRepo = new MosqueAPIRepository({
      baseURL: 'http://localhost:3000',
      getToken: () => 'test-token'
    })
  })

  const testRepo = async (repo: IMosqueRepository, label: string) => {
    describe(label, () => {
      it('should create, read, update, delete', async () => {
        const dto = { name: 'Test', city: 'Jakarta' }

        // Create
        const m1 = await repo.create(dto as any, 'tenant1')
        expect(m1.id).toBeDefined()

        // Read
        const m2 = await repo.read(m1.id, 'tenant1')
        expect(m2?.name).toBe('Test')

        // Update
        const m3 = await repo.update(m1.id, { city: 'Bandung' }, 'tenant1')
        expect(m3.city).toBe('Bandung')

        // Delete
        const deleted = await repo.delete(m1.id, 'tenant1')
        expect(deleted).toBe(true)

        // Verify deleted
        const m4 = await repo.read(m1.id, 'tenant1')
        expect(m4).toBeNull()
      })
    })
  }

  testRepo(indexeddbRepo, 'IndexedDB Repository')
  testRepo(apiRepo, 'API Repository')

  it('both should behave identically', async () => {
    const dto = { name: 'Test', city: 'Jakarta' }

    const m1 = await indexeddbRepo.create(dto as any, 'tenant1')
    const m2 = await apiRepo.create(dto as any, 'tenant2') // different tenant

    expect(m1.name).toBe(m2.name)
    expect(m1.createdAt).toBeDefined()
    expect(m2.createdAt).toBeDefined()
  })
})
```

---

## Summary

Dengan Repository Pattern:
- ✅ Components fokus pada UI
- ✅ Service fokus pada business logic
- ✅ Repository fokus pada data persistence
- ✅ Swappable implementations
- ✅ Easy to test
- ✅ Type-safe
- ✅ Zero changes untuk migrasi
