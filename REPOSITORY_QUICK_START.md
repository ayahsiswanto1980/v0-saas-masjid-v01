# Repository Pattern - Quick Start Guide

TL;DR untuk implementation Repository Pattern di React (Vite).

---

## 📁 File Structure

```
src/
├── data/
│   ├── contracts/
│   │   ├── IRepository.ts           # Base interface
│   │   └── IMosqueRepository.ts     # Domain interface
│   ├── models/
│   │   └── Mosque.ts                # Data model & DTOs
│   └── repositories/
│       ├── MosqueIndexedDBRepository.ts   # IndexedDB impl
│       ├── MosqueAPIRepository.ts         # API impl
│       └── factory.ts               # Factory pattern
├── services/
│   └── MosqueService.ts             # Business logic
├── config/
│   └── di-container.ts              # DI container
├── providers/
│   └── RepositoryProvider.tsx       # React context
```

---

## 🚀 Setup (5 Steps)

### 1. Create Interface
```typescript
// src/data/contracts/IMosqueRepository.ts
export interface IMosqueRepository extends IRepository<Mosque> {
  findByName(name: string, tenantId: string): Promise<Mosque | null>
  findByCity(city: string, tenantId: string): Promise<Mosque[]>
}
```

### 2. Create Model
```typescript
// src/data/models/Mosque.ts
export interface Mosque {
  id: string
  tenantId: string
  name: string
  city: string
  // ... fields
  createdAt: Date
  updatedAt: Date
}

export interface CreateMosqueDTO {
  name: string
  city: string
  // ... input fields only
}
```

### 3. Implement Repository
```typescript
// src/data/repositories/MosqueIndexedDBRepository.ts
export class MosqueIndexedDBRepository implements IMosqueRepository {
  async create(data, tenantId) { /* IndexedDB logic */ }
  async read(id, tenantId) { /* IndexedDB logic */ }
  // ... etc
}
```

### 4. Create Service
```typescript
// src/services/MosqueService.ts
export class MosqueService {
  constructor(private repository: IMosqueRepository) {}

  async createMosque(dto: CreateMosqueDTO) {
    // Validation, business logic
    return this.repository.create(dto, tenantId)
  }
}
```

### 5. Wrap with Provider
```typescript
// main.tsx
ReactDOM.createRoot(document.getElementById('root')!).render(
  <RepositoryProvider config={{ dataSource: 'indexeddb' }}>
    <App />
  </RepositoryProvider>
)
```

---

## 💻 Component Usage

```typescript
import { useMosqueService } from '@/providers/RepositoryProvider'

function MyComponent() {
  const service = useMosqueService()

  const handleCreate = async (dto) => {
    const mosque = await service.createMosque(dto)
    // That's it! Works with both IndexedDB and API
  }

  return <form onSubmit={handleCreate} />
}
```

---

## 🔄 Switch Data Source

Just change 1 line to switch from IndexedDB to API:

```typescript
// Before: IndexedDB
const config: RepositoryConfig = {
  dataSource: 'indexeddb'
}

// After: REST API (zero UI changes!)
const config: RepositoryConfig = {
  dataSource: 'api',
  apiConfig: {
    baseURL: 'https://api.example.com',
    getToken: () => localStorage.getItem('token')
  }
}
```

---

## 📊 Data Flow

### Before Migration (IndexedDB)
```
Component
  ↓ useMosqueService()
Service (validation, caching)
  ↓ repository.create()
MosqueIndexedDBRepository
  ↓
IndexedDB (local storage)
```

### After Migration (API)
```
Component  ← NO CHANGES
  ↓ useMosqueService()  ← NO CHANGES
Service  ← NO CHANGES
  ↓ repository.create()  ← NO CHANGES
MosqueAPIRepository  ← SWAPPED IMPLEMENTATION
  ↓
REST API (server)
```

---

## 🎯 Key Principles

| Principle | Description |
|-----------|-------------|
| **Abstraction** | Repository interface hides implementation |
| **Injection** | Service receives repository via constructor |
| **Factory** | Central place to create repository instances |
| **Isolation** | Each layer has single responsibility |
| **Testing** | Easy to mock/test each layer independently |
| **Migration** | Zero changes to components when switching |

---

## ✅ Checklist

### Sebelum Implementasi
- [ ] Understand Repository Pattern concept
- [ ] Review file structure
- [ ] Have Mosque model ready

### Implementasi
- [ ] Create IRepository interface
- [ ] Create Mosque model & DTOs
- [ ] Implement MosqueIndexedDBRepository
- [ ] Implement MosqueAPIRepository
- [ ] Create MosqueService
- [ ] Setup DI container
- [ ] Create RepositoryProvider
- [ ] Wrap App with provider

### Testing
- [ ] Unit test repository methods
- [ ] Unit test service logic
- [ ] Integration test with component
- [ ] Test both IndexedDB and API
- [ ] Test tenant isolation

### Migration (When Ready)
- [ ] Setup Laravel backend
- [ ] Create API endpoints
- [ ] Test API thoroughly
- [ ] Change config to use API
- [ ] Verify components still work
- [ ] Monitor for errors
- [ ] Decommission IndexedDB code (optional)

---

## 🔧 Common Operations

### Create
```typescript
const mosque = await service.createMosque({
  name: 'Masjid Al-Ikhlas',
  city: 'Jakarta'
})
```

### Read
```typescript
const mosque = await service.getMosque(id)
```

### Update
```typescript
const updated = await service.updateMosque(id, {
  city: 'Bandung'
})
```

### Delete
```typescript
await service.deleteMosque(id)
```

### List
```typescript
const { items, total } = await service.listMosques({
  city: 'Jakarta'
}, { page: 0, limit: 10 })
```

### Batch
```typescript
await service.bulkCreateMosques(items)
await service.bulkDeleteMosques(ids)
```

### Sync
```typescript
const result = await service.syncOfflineChanges()
```

---

## 🐛 Debugging

### Check Current Data Source
```typescript
const config = useRepositoryConfig()
console.log('Using:', config.dataSource)  // 'indexeddb' or 'api'
```

### Monitor Sync Queue
```typescript
const repo = useMosqueRepository()
const queue = await repo.getSyncQueue()
console.log('Pending operations:', queue)
```

### Test Specific Implementation
```typescript
// Force IndexedDB
setRepositoryConfig({ dataSource: 'indexeddb' })

// Force API
setRepositoryConfig({
  dataSource: 'api',
  apiConfig: { baseURL: 'http://localhost:8000' }
})
```

---

## 📚 Full Documentation

- **REPOSITORY_PATTERN_GUIDE.md** - Comprehensive guide (60 pages)
- **MIGRATION_GUIDE.md** - Step-by-step migration (50 pages)
- **REPOSITORY_EXAMPLES.md** - Code examples (80 examples)
- **ARCHITECTURE_STATUS.md** - Architecture overview
- **AUDIT_REPORT.md** - Project audit

---

## ❓ FAQ

**Q: Do I need to rewrite my components?**
A: No! Repository Pattern completely abstracts data layer. Components never change.

**Q: Can I use both IndexedDB and API simultaneously?**
A: Yes! IndexedDB for offline, API for sync. Repository pattern supports this.

**Q: What about error handling?**
A: Service layer handles validation errors. API layer handles network errors. Components handle UI.

**Q: How do I test this?**
A: Create mock repository, pass to service, test service logic in isolation.

**Q: What about performance?**
A: Service layer includes caching. Use pagination for large lists. Batch operations for bulk work.

---

## 🎓 Learning Path

1. Read: **REPOSITORY_PATTERN_GUIDE.md** (understand architecture)
2. Look at: **REPOSITORY_EXAMPLES.md** (see real code)
3. Implement: Follow the 5 steps above
4. Test: Run unit tests
5. Deploy: Change config and watch it work!

---

## 🚀 Next Steps

1. Create the interfaces and models
2. Implement IndexedDB repository
3. Create service layer
4. Integrate with React
5. (Later) Implement API repository
6. Switch data source with confidence!

Good luck! 🎉
