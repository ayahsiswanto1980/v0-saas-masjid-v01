# Repository Pattern untuk React (Vite)

## Ringkasan

Panduan komprehensif implementasi Repository Pattern yang memungkinkan data source diganti dari IndexedDB ke REST API tanpa mengubah UI dan business logic.

---

## 1. Arsitektur Keseluruhan

```
┌─────────────────────────────────────────────────────────────┐
│                    React Components                         │
│         (useQuery, useMutation, hooks)                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│         RepositoryProvider Context + Hooks                  │
│      (useMosqueService, useMosqueRepository)                │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              MosqueService (Business Logic)                 │
│    (Validations, Caching, Use Cases)                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│         IMosqueRepository Interface                         │
│           (Abstract Contract)                               │
└──────────────────────────┬──────────────────────────────────┘
                           │
                  ┌────────┴────────┐
                  │                 │
                  ↓                 ↓
┌─────────────────────────┐  ┌──────────────────────┐
│  MosqueIndexedDB        │  │  MosqueAPI           │
│  Repository             │  │  Repository          │
│  (Local Storage)        │  │  (REST API)          │
└────────────┬────────────┘  └──────────┬───────────┘
             │                          │
             ↓                          ↓
      ┌────────────┐           ┌─────────────────┐
      │ IndexedDB  │           │  REST API       │
      │            │           │  (Laravel)      │
      └────────────┘           └─────────────────┘
```

---

## 2. Layer Abstraction

### 2.1 Repository Interface
**File**: `src/data/contracts/IRepository.ts`

Mendefinisikan contract untuk semua operasi CRUD:

```typescript
export interface IRepository<T> {
  // CRUD
  create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>, tenantId: string): Promise<T>
  read(id: string, tenantId: string): Promise<T | null>
  update(id: string, data: Partial<T>, tenantId: string): Promise<T>
  delete(id: string, tenantId: string): Promise<boolean>
  list(filters?: QueryFilter, pagination?: PaginationOptions, tenantId?: string): Promise<T[]>

  // Batch
  bulkCreate(items: Array<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>, tenantId: string): Promise<T[]>
  bulkUpdate(items: Array<{ id: string; data: Partial<T> }>, tenantId: string): Promise<T[]>
  bulkDelete(ids: string[], tenantId: string): Promise<boolean>

  // Sync (untuk offline support)
  getSyncQueue(): Promise<SyncRecord[]>
  addToSyncQueue(record: ...): Promise<SyncRecord>
  processSyncQueue(tenantId: string): Promise<void>
  clearSyncQueue(): Promise<void>

  // Utility
  clear(tenantId?: string): Promise<void>
  count(filters?: QueryFilter, tenantId?: string): Promise<number>
  exists(id: string, tenantId: string): Promise<boolean>
}
```

### 2.2 Domain-Specific Interface
**File**: `src/data/contracts/IMosqueRepository.ts`

```typescript
export interface IMosqueRepository extends IRepository<Mosque> {
  findByName(name: string, tenantId: string): Promise<Mosque | null>
  findByCity(city: string, tenantId: string): Promise<Mosque[]>
  findActive(tenantId: string): Promise<Mosque[]>
  getStatistics(tenantId: string): Promise<Statistics>
}
```

### 2.3 Data Models
**File**: `src/data/models/Mosque.ts`

Type-safe models dan DTOs:

```typescript
export interface Mosque {
  id: string
  tenantId: string
  name: string
  city: string
  // ... other fields
  createdAt: Date
  updatedAt: Date
}

export interface CreateMosqueDTO {
  name: string
  city: string
  // ... other fields
}

export const isValidMosque = (data: any): data is Mosque => {
  // validation logic
}
```

---

## 3. Implementasi Repository

### 3.1 IndexedDB Repository
**File**: `src/data/repositories/MosqueIndexedDBRepository.ts`

Implementasi penyimpanan lokal dengan dukungan offline:

```typescript
export class MosqueIndexedDBRepository implements IMosqueRepository {
  async create(data: ..., tenantId: string): Promise<Mosque> {
    // Store di IndexedDB
    const mosque = { ...data, id, createdAt, updatedAt }
    // Add to sync queue untuk offline support
    await this.addToSyncQueue({
      operation: 'create',
      entityType: 'Mosque',
      data: mosque
    })
    return mosque
  }

  async list(filters, pagination, tenantId): Promise<Mosque[]> {
    // Query IndexedDB dengan filter & pagination
    // Multi-tenant safe: verify tenantId
  }

  async processSyncQueue(tenantId): Promise<void> {
    // Proses pending operations saat online
  }
}
```

**Fitur:**
- CRUD operations on IndexedDB
- Sync queue tracking (local → syncing → synced → failed)
- Offline-first approach
- Multi-tenant isolation dengan index

### 3.2 API Repository
**File**: `src/data/repositories/MosqueAPIRepository.ts`

Implementasi REST API mirroring IndexedDB interface:

```typescript
export class MosqueAPIRepository implements IMosqueRepository {
  constructor(private config: APIConfig) {}

  async create(data: ..., tenantId: string): Promise<Mosque> {
    const response = await this.request<Mosque>(
      'POST',
      `/api/mosques?tenant_id=${tenantId}`,
      payload
    )
    return response
  }

  async list(filters, pagination, tenantId): Promise<Mosque[]> {
    // Build query params
    const params = new URLSearchParams()
    params.append('tenant_id', tenantId)
    // Add filters...
    
    const response = await this.request('GET', `/api/mosques?${params}`)
    return response
  }
}
```

**Fitur:**
- Async/await HTTP requests
- Timeout handling
- Bearer token injection
- Error handling & retries
- Query parameter building

---

## 4. Service Layer

**File**: `src/services/MosqueService.ts`

Business logic layer dengan dependency injection:

```typescript
export class MosqueService {
  constructor(
    private repository: IMosqueRepository,
    private options?: MosqueServiceOptions
  ) {}

  setTenant(tenantId: string): void {
    this.currentTenantId = tenantId
  }

  async createMosque(dto: CreateMosqueDTO): Promise<Mosque> {
    // 1. Validasi
    this.validateMosqueDTO(dto)

    // 2. Business logic
    const existing = await this.repository.findByName(dto.name, this.getTenant())
    if (existing) throw new Error('Masjid sudah ada')

    // 3. Create
    const mosque = await this.repository.create(dto as any, this.getTenant())

    // 4. Cache invalidation
    this.invalidateCache()

    return mosque
  }

  async listMosques(filters?, pagination?) {
    return {
      items: await this.repository.list(filters, pagination, this.getTenant()),
      total: await this.repository.count(filters, this.getTenant())
    }
  }

  async syncOfflineChanges() {
    await this.repository.processSyncQueue(this.getTenant())
    // Return sync statistics
  }
}
```

**Fitur:**
- Dependency injection via constructor
- Multi-tenant context management
- Input validation & sanitization
- Business rule enforcement
- Caching dengan expiry
- Sync management

---

## 5. Dependency Injection

### 5.1 Factory Pattern
**File**: `src/data/repositories/factory.ts`

```typescript
export interface RepositoryConfig {
  dataSource: 'indexeddb' | 'api'
  apiConfig?: APIConfig
}

let globalConfig: RepositoryConfig = { dataSource: 'indexeddb' }

export const setRepositoryConfig = (config: RepositoryConfig) => {
  globalConfig = config
}

export const createMosqueRepository = (): IMosqueRepository => {
  if (globalConfig.dataSource === 'api') {
    return new MosqueAPIRepository(globalConfig.apiConfig!)
  }
  return new MosqueIndexedDBRepository()
}
```

**Penggunaan:**
```typescript
// Pada initialization
setRepositoryConfig({
  dataSource: 'api',  // atau 'indexeddb'
  apiConfig: {
    baseURL: 'http://localhost:8000',
    timeout: 30000,
    getToken: () => localStorage.getItem('token')
  }
})
```

### 5.2 Simple IoC Container
**File**: `src/config/di-container.ts`

```typescript
class DIContainer {
  private singletons: Map<string, any> = new Map()
  private factories: Map<string, () => any> = new Map()

  registerSingleton(name: string, instance: any) {
    this.singletons.set(name, instance)
  }

  registerFactory(name: string, factory: () => any) {
    this.factories.set(name, factory)
  }

  get<T>(name: string): T {
    if (this.singletons.has(name)) {
      return this.singletons.get(name)
    }
    if (this.factories.has(name)) {
      const instance = this.factories.get(name)!()
      this.singletons.set(name, instance)
      return instance
    }
    throw new Error(`Service ${name} not found`)
  }
}

// Initialize
export const initializeDIContainer = (config: RepositoryConfig) => {
  setRepositoryConfig(config)
  
  container.registerFactory('MosqueRepository', () => 
    createMosqueRepository()
  )
  
  container.registerFactory('MosqueService', () => {
    const repo = container.get('MosqueRepository')
    return new MosqueService(repo)
  })
}

export const getMosqueService = () => 
  container.get<MosqueService>('MosqueService')
```

---

## 6. React Integration

### 6.1 Provider Context
**File**: `src/providers/RepositoryProvider.tsx`

```typescript
interface RepositoryContextType {
  mosqueService: MosqueService
  mosqueRepository: IMosqueRepository
  config: RepositoryConfig
}

export const RepositoryProvider: React.FC = ({ config, children }) => {
  React.useMemo(() => {
    initializeDIContainer(config)
  }, [config.dataSource])

  const value = {
    mosqueService: getService('MosqueService'),
    mosqueRepository: getService('MosqueRepository'),
    config
  }

  return (
    <RepositoryContext.Provider value={value}>
      {children}
    </RepositoryContext.Provider>
  )
}
```

### 6.2 Custom Hooks
```typescript
export const useMosqueService = (): MosqueService => {
  const { mosqueService } = useRepositoryContext()
  return mosqueService
}

export const useMosqueRepository = (): IMosqueRepository => {
  const { mosqueRepository } = useRepositoryContext()
  return mosqueRepository
}
```

### 6.3 Component Usage
```typescript
function MosqueList() {
  const service = useMosqueService()
  const [mosques, setMosques] = useState<Mosque[]>([])

  useEffect(() => {
    service.setTenant(currentTenantId)
    service.listMosques().then(({ items }) => {
      setMosques(items)
    })
  }, [service, currentTenantId])

  return (
    <div>
      {mosques.map(m => (
        <div key={m.id}>{m.name}</div>
      ))}
    </div>
  )
}
```

---

## 7. Setup & Initialization

### 7.1 main.tsx
```typescript
import { RepositoryProvider } from './providers/RepositoryProvider'
import { RepositoryConfig } from './data/repositories/factory'

const config: RepositoryConfig = {
  dataSource: import.meta.env.VITE_DATA_SOURCE as 'indexeddb' | 'api',
  apiConfig: {
    baseURL: import.meta.env.VITE_API_URL,
    timeout: 30000,
    getToken: () => localStorage.getItem('authToken')
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RepositoryProvider config={config}>
      <App />
    </RepositoryProvider>
  </React.StrictMode>
)
```

### 7.2 .env.development
```
VITE_DATA_SOURCE=indexeddb
VITE_API_URL=http://localhost:8000
```

### 7.3 .env.production
```
VITE_DATA_SOURCE=api
VITE_API_URL=https://api.yourdomain.com
```

---

## 8. Migration Checklist

### Sebelum Migrasi
- [x] Repository pattern sudah implemented
- [x] Business logic di service layer
- [x] UI komponen tanpa akses repository langsung
- [x] IndexedDB repository berfungsi
- [x] Tests cover service & repository

### Langkah Migrasi ke API

#### 1. Setup Backend API (Laravel)
```bash
php artisan make:model Mosque -m -c -r
php artisan make:resource MosqueResource
```

#### 2. Implement API Endpoints
```php
// routes/api.php
Route::middleware('auth:sanctum')->group(function () {
  Route::apiResource('mosques', MosqueController::class);
  Route::post('mosques/bulk', [MosqueController::class, 'bulkStore']);
  Route::put('mosques/bulk', [MosqueController::class, 'bulkUpdate']);
});
```

#### 3. Configure API Datasource
```typescript
// Hanya ubah ini!
const config: RepositoryConfig = {
  dataSource: 'api',
  apiConfig: {
    baseURL: 'https://api.yourdomain.com',
    timeout: 30000,
    getToken: () => localStorage.getItem('authToken')
  }
}
```

#### 4. Testing
```typescript
// Repository tests same for both!
describe('MosqueRepository', () => {
  it('should create mosque', async () => {
    const mosque = await repository.create(
      { name: 'Test Mosque', ... },
      'tenant1'
    )
    expect(mosque.id).toBeDefined()
  })
})
```

---

## 9. Keuntungan Pattern Ini

### 1. Flexibility
- Switch data source dengan 1 config change
- Easy testing dengan mock repositories
- Support multiple backends simultaneously

### 2. Type Safety
- Full TypeScript support
- Compile-time error checking
- Better IDE autocomplete

### 3. Separation of Concerns
- UI: React components
- Logic: Service layer
- Persistence: Repository layer
- Data: Models & DTOs

### 4. Offline Support
- Queue pending operations
- Sync saat online
- Graceful fallback

### 5. Multi-tenant Safety
- All queries include tenantId
- Data isolation enforced
- No accidental cross-tenant access

### 6. Testability
```typescript
// Easy to test service
class MockRepository implements IMosqueRepository {
  async create() { ... }
  async read() { ... }
}

const service = new MosqueService(new MockRepository())
```

---

## 10. Performance Optimization

### Caching
```typescript
const service = new MosqueService(repository, {
  enableCaching: true,
  cacheExpiry: 5 * 60 * 1000  // 5 minutes
})
```

### Pagination
```typescript
const { items, total } = await service.listMosques(
  undefined,
  { page: 0, limit: 10 }
)
```

### Batch Operations
```typescript
// More efficient than loop
await service.bulkCreateMosques(items)
await service.bulkDeleteMosques(ids)
```

---

## 11. Error Handling

```typescript
try {
  const mosque = await service.createMosque(dto)
} catch (error) {
  if (error instanceof ValidationError) {
    // Handle validation
  } else if (error instanceof NetworkError) {
    // Handle network (will queue for sync)
  } else if (error instanceof AuthError) {
    // Handle auth
  }
}
```

---

## Kesimpulan

Repository Pattern ini memberikan:
- ✅ Clean architecture
- ✅ Data source abstraction
- ✅ Easy testing & mocking
- ✅ Type-safe operations
- ✅ Multi-tenant support
- ✅ Offline-first capability
- ✅ Zero UI changes untuk migration
