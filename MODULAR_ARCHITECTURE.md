# Modular React SaaS Architecture - Mosque Management

## Overview

This document describes the complete modular architecture for the Multi-Tenant Mosque Management SaaS application built with React + Vite. The architecture follows a 6-layer data flow pattern with clear separation of concerns and domain-driven module organization.

---

## Folder Structure

```
src/
├── types/                          # Shared TypeScript interfaces
│   └── index.ts                    # Auth, Tenant, Pagination, API types
├── context/
│   └── TenantContext.tsx           # Global tenant & auth context
├── stores/                         # Zustand state management
│   ├── authStore.ts               # Auth state (user, tenant, auth status)
│   ├── jamaahStore.ts             # Jamaah list state with pagination
│   ├── donasiStore.ts             # (Similar pattern for other modules)
│   └── offlineStore.ts            # Online/offline status & sync state
├── datasource/
│   ├── IndexedDBDatasource.ts     # Local storage layer
│   └── APIDatasource.ts           # HTTP API client
├── repositories/
│   └── BaseRepository.ts           # Abstract base for all repositories
├── utils/
│   └── index.ts                   # Helpers: ID gen, date format, validation
├── modules/                        # Domain-driven modules
│   ├── auth/
│   │   ├── authRepository.ts      # Implements login/register
│   │   ├── authService.ts         # Business logic for auth
│   │   ├── useAuth.ts             # Custom hook for auth operations
│   │   └── components/            # Auth UI components
│   ├── jamaah/
│   │   ├── jamaahRepository.ts    # CRUD operations for jamaah
│   │   ├── jamaahService.ts       # Business logic
│   │   ├── useJamaah.ts           # Custom hook
│   │   └── components/
│   │       ├── JamaahList.tsx
│   │       ├── JamaahForm.tsx
│   │       └── JamaahCard.tsx
│   ├── donasi/
│   │   ├── donasiRepository.ts
│   │   ├── donasiService.ts
│   │   ├── useD onasi.ts
│   │   └── components/
│   ├── takmir/
│   ├── ustadz/
│   ├── kajian/
│   ├── aset/
│   ├── notulensi/
│   └── agenda/
├── components/
│   └── shared/                    # Reusable components
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Modal.tsx
│       └── Pagination.tsx
├── hooks/
│   ├── usePagination.ts          # Pagination logic
│   ├── useSearch.ts              # Search/filter logic
│   ├── useOfflineDetection.ts    # Offline status detection
│   └── useDebounce.ts            # Debounce hook
└── App.tsx                        # Main app component
```

---

## 6-Layer Data Flow Architecture

### Layer 1: UI Components
**Location**: `src/modules/*/components/` & `src/components/shared/`

Components are responsible for:
- Rendering user interface
- Accepting user input
- Displaying data from store
- Calling hooks on user interaction

**Example**: `JamaahList.tsx`
```tsx
export function JamaahList() {
  const { jamaah, isLoading, loadJamaah, create } = useJamaah()
  
  return (
    <div>
      {jamaah.map(j => <JamaahCard key={j.id} jamaah={j} />)}
      <button onClick={() => loadJamaah()}>Refresh</button>
    </div>
  )
}
```

---

### Layer 2: Custom Hooks (Business Logic)
**Location**: `src/modules/*/useModule.ts`

Hooks encapsulate:
- State management integration (Zustand)
- Tenant context injection
- Service method binding
- Lifecycle management

**Example**: `useJamaah.ts`
```tsx
export const useJamaah = () => {
  const { currentTenant } = useTenant()           // Tenant isolation
  const store = useJamaahStore()                  // Get store state
  
  const loadJamaah = useCallback((params?) => {
    jamaahService.fetchJamaah(currentTenant.id, params)  // Call service
  }, [currentTenant])
  
  return { jamaah: store.jamaah, loadJamaah, ... }
}
```

**Data Flow at this layer**:
- Hook receives tenant context
- Hook calls service method
- Service updates Zustand store
- Hook re-renders component when store changes

---

### Layer 3: Service Layer
**Location**: `src/modules/*/moduleService.ts`

Services provide:
- Business logic orchestration
- Data transformation
- Error handling
- Multi-step operations

**Example**: `jamaahService.ts`
```tsx
export class JamaahService {
  async createJamaah(tenantId: string, jamaah: Omit<Jamaah, ...>) {
    // Validate input
    // Add tenant_id to item
    // Call repository
    // Update store
    // Return result
    const created = await jamaahRepository.create(newJamaah)
    store.addJamaah(created)
    return created
  }
}
```

**Responsibilities**:
- Validate business rules
- Enforce tenant isolation (attach tenant_id)
- Coordinate with repositories
- Update global state

---

### Layer 4: Repository Layer
**Location**: `src/repositories/BaseRepository.ts` & `src/modules/*/moduleRepository.ts`

Repositories abstract data access:
- Implement IRepository interface
- Choose between IndexedDB (offline) or API (online)
- Handle sync queue for offline items

**Example**: `BaseRepository.ts`
```tsx
export abstract class BaseRepository<T> {
  async create(item: T): Promise<T> {
    if (isOnline()) {
      const result = await apiDatasource.post(this.apiEndpoint, item)
      await indexedDBDatasource.create(this.storeName, result)
      return result
    } else {
      // Offline: save locally and queue for sync
      await indexedDBDatasource.create(this.storeName, item)
      await indexedDBDatasource.addToSyncQueue('create', this.storeName, item)
      return item
    }
  }
}
```

**Multi-tenancy enforcement here**:
- Repository doesn't know about tenants
- Service layer ensures tenant_id is on every item
- API endpoint automatically filters by tenant_id (backend RLS)

---

### Layer 5: Datasource Layer
**Location**: `src/datasource/`

Two datasources handle storage:

#### IndexedDB (Local Storage)
- Used for offline mode
- All CRUD operations work without internet
- Indexed by `tenantId` for fast queries
- Sync queue tracks pending changes

```tsx
export class IndexedDBDatasource {
  async create<T>(storeName: string, item: T): Promise<T> {
    const tx = this.db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    store.add(item)
    // Wait for transaction complete
  }
  
  async readAll<T>(storeName: string, tenantId: string): Promise<T[]> {
    const index = store.index('tenantId')  // Fast lookup by tenant
    return index.getAll(IDBKeyRange.only(tenantId))
  }
}
```

#### API Datasource
- Used when online
- Automatic token injection in headers
- Error handling and retries
- Sync manager pulls from sync queue

```tsx
export class APIDatasource {
  async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),  // Includes Authorization
      body: JSON.stringify(data),
    })
    // Response includes tenant_id filtering (backend responsibility)
  }
}
```

---

### Layer 6: Storage
**Location**: Browser IndexedDB + PostgreSQL Server

- **IndexedDB**: Local object stores (jamaah, donasi, takmir, etc.)
  - Indexed by `tenantId` + other key fields
  - Soft deletes with `deleted_at`
  - Sync queue for offline changes

- **PostgreSQL**: Server-side persistent storage
  - All tables have `tenant_id` column
  - Row Level Security (RLS) policies
  - Foreign key relationships
  - Audit logging

---

## Complete Data Flow Example: Creating Jamaah

### User Action → Render

1. **User clicks "Add Jamaah" button in UI**
   ```tsx
   <button onClick={() => openJamaahForm()}>Add Jamaah</button>
   ```

2. **Form submits data to hook**
   ```tsx
   const { create } = useJamaah()
   await create({ nama: 'Budi', email: '...' })
   ```

### Hook → Service

3. **Hook calls service with tenant context**
   ```tsx
   // In useJamaah.ts
   const create = (jamaah) => {
     return jamaahService.createJamaah(currentTenant.id, jamaah)
   }
   ```

### Service → Repository

4. **Service adds tenant_id and calls repository**
   ```tsx
   // In jamaahService.ts
   const newJamaah = {
     ...jamaah,
     tenantId: currentTenant.id,  // Enforce tenant isolation
     id: generateId(),
     createdAt: new Date(),
   }
   const created = await jamaahRepository.create(newJamaah)
   ```

### Repository → Datasource

5. **Repository checks online status**
   ```tsx
   // In baseRepository.ts
   if (isOnline()) {
     // Online: POST to API + cache locally
     const result = await apiDatasource.post('/jamaah', newJamaah)
     await indexedDBDatasource.create('jamaah', result)
     return result
   } else {
     // Offline: Save locally + queue for sync
     await indexedDBDatasource.create('jamaah', newJamaah)
     await indexedDBDatasource.addToSyncQueue('create', 'jamaah', newJamaah)
     return newJamaah
   }
   ```

### Datasource → Storage

6a. **If ONLINE: API Datasource**
   ```
   POST /api/jamaah
   Headers: Authorization: Bearer {token}
   Body: { tenantId, nama, email, ... }
   ↓
   Server receives, enforces RLS (queries WHERE tenant_id = :currentTenant)
   ↓
   Inserts to PostgreSQL jamaah table
   ↓
   Returns: { id, tenantId, ... }
   ↓
   IndexedDBDatasource caches locally
   ```

6b. **If OFFLINE: IndexedDB**
   ```
   IndexedDB transaction:
   - Store.add() to 'jamaah' object store
   - addToSyncQueue() with action='create'
   ↓
   Returns item with temp ID
   ```

### Service → State Management

7. **Service updates Zustand store**
   ```tsx
   // In jamaahService.ts
   const created = await jamaahRepository.create(newJamaah)
   store.addJamaah(created)  // Updates state
   ```

### State → Component Re-render

8. **Component re-renders with new data**
   ```tsx
   // In JamaahList.tsx
   const { jamaah } = useJamaah()  // Selector triggers re-render
   
   return (
     <ul>
       {jamaah.map(j => <JamaahCard key={j.id} jamaah={j} />)}
     </ul>
   )
   ```

---

## Multi-Tenant Isolation Strategy

### Tenant Isolation Layers

**Layer 1: Context** - `TenantContext.tsx`
```tsx
const { currentTenant, currentUser } = useTenant()
// Used by hooks to get tenant_id
```

**Layer 2: Service** - Each service enforces tenant_id
```tsx
async createJamaah(tenantId: string, jamaah: ...) {
  const newJamaah = { ...jamaah, tenantId }
  // tenantId is ALWAYS attached
}
```

**Layer 3: Repository** - Base class handles generic ops
```tsx
async readAll(tenantId: string) {
  const result = await indexedDBDatasource.readAll('jamaah', tenantId)
  // IndexedDB query filtered by tenantId
}
```

**Layer 4: Datasource - IndexedDB**
```tsx
async readAll(storeName: string, tenantId: string) {
  const index = store.index('tenantId')
  return index.getAll(IDBKeyRange.only(tenantId))
  // Only returns items matching tenantId
}
```

**Layer 5: Datasource - API**
```tsx
// API endpoint includes tenantId in response
GET /api/jamaah?tenantId={currentTenant.id}
```

**Layer 6: Backend - Row Level Security**
```sql
-- PostgreSQL RLS policy
CREATE POLICY tenant_isolation ON jamaah
  USING (tenant_id = current_user_tenant_id())
-- Database ensures no data leakage
```

### Data Isolation Guarantee

If ANY layer fails:
- User cannot access other tenant's IndexedDB (indexed by tenantId)
- User cannot access other tenant's API data (backend RLS)
- Service layer attaches tenantId automatically

---

## State Management: Zustand Stores

### Store Pattern

Each module has a Zustand store with:
- **State**: List of items, pagination, loading, error
- **Actions**: setters that update state

**Example**: `jamaahStore.ts`
```tsx
export const useJamaahStore = create<JamaahStore>((set) => ({
  jamaah: [],
  pagination: { page: 1, limit: 10 },
  isLoading: false,
  
  setJamaah: (jamaah) => set({ jamaah }),
  addJamaah: (jamaah) => set(state => ({ 
    jamaah: [...state.jamaah, jamaah] 
  })),
}))
```

### Store Usage Flow

1. **Component uses hook**
   ```tsx
   const { jamaah, isLoading } = useJamaah()
   ```

2. **Hook gets store state**
   ```tsx
   const store = useJamaahStore()
   return { jamaah: store.jamaah, isLoading: store.isLoading }
   ```

3. **Service updates store**
   ```tsx
   const store = useJamaahStore.getState()
   store.addJamaah(newJamaah)
   ```

4. **Component re-renders** (Zustand listener)
   ```tsx
   // Component automatically updates when store changes
   ```

### Global Auth Store

```tsx
const { user, isAuthenticated } = useAuthStore()
// Available everywhere, persisted to localStorage
```

---

## Offline-First Architecture

### Online Mode
```
User → Component → Hook → Service → Repository
                                    ↓
                                   API
                                    ↓
                                  Cache to IndexedDB
```

### Offline Mode
```
User → Component → Hook → Service → Repository
                                    ↓
                                  IndexedDB (immediately)
                                    ↓
                                  Sync Queue
```

### Sync Process
```
When connection restored:
1. Repository.sync() is called
2. Gets all items from sync_queue
3. For each queued item:
   - If 'create': POST to /api/module
   - If 'update': PUT to /api/module/:id
   - If 'delete': DELETE to /api/module/:id
4. On success: remove from sync_queue, update local ID
5. Refresh store from server
```

**Sync Manager Hook** (should be created for production):
```tsx
export const useSyncManager = () => {
  const { isOnline } = useOfflineStore()
  
  useEffect(() => {
    if (isOnline) {
      // Trigger sync for all modules
      jamaahRepository.sync()
      donasiRepository.sync()
      // ... other modules
    }
  }, [isOnline])
}
```

---

## Adding New Modules

To add a new module (e.g., `donasi`), follow this template:

### 1. Create Store
**File**: `src/stores/donasiStore.ts`
```tsx
interface Donasi { id: string; tenantId: string; jamaahId: string; ... }
export const useDonasiStore = create<DonasiStore>(...)
```

### 2. Create Repository
**File**: `src/modules/donasi/donasiRepository.ts`
```tsx
export class DonasiRepository extends BaseRepository<Donasi> {
  protected storeName = 'donasi'
  protected apiEndpoint = '/donasi'
}
export const donasiRepository = new DonasiRepository()
```

### 3. Create Service
**File**: `src/modules/donasi/donasiService.ts`
```tsx
export class DonasiService {
  async fetchDonasi(tenantId: string, params?: PaginationParams) {
    const store = useDonasiStore.getState()
    // ... similar pattern to jamaahService
  }
}
export const donasiService = new DonasiService()
```

### 4. Create Hook
**File**: `src/modules/donasi/useDonasi.ts`
```tsx
export const useDonasi = () => {
  const { currentTenant } = useTenant()
  // ... similar pattern to useJamaah
}
```

### 5. Create Components
**File**: `src/modules/donasi/components/`
- DonasiList.tsx
- DonasiForm.tsx
- DonasiCard.tsx

### 6. Update IndexedDB Init
In `IndexedDBDatasource.ts`, add to stores array:
```tsx
{ name: 'donasi', keyPath: 'id', indexes: [['tenantId', false], ...] }
```

---

## Benefits of This Architecture

1. **Scalability**: Each module is independent, adding new ones is trivial
2. **Testability**: Each layer can be tested in isolation
3. **Offline-First**: Works seamlessly without internet
4. **Type Safety**: Full TypeScript with domain models
5. **Multi-Tenancy**: Tenant isolation enforced at every layer
6. **Performance**: IndexedDB caching, virtual scrolling support
7. **Maintainability**: Clear responsibilities, easy to debug
8. **Code Reuse**: BaseRepository, TenantContext, shared hooks

---

## Environment Setup

Create `.env` file:
```env
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=Mosque Management SaaS
```

---

## Tech Stack

- **Frontend**: React 18 + Vite
- **State**: Zustand + React Context
- **Storage**: IndexedDB (local) + PostgreSQL (remote)
- **HTTP**: Fetch API (APIDatasource wrapper)
- **TypeScript**: Full type safety
- **Styling**: Tailwind CSS (with shadcn/ui components)

---

## Next Steps for Production

1. Implement API backend with tenant isolation
2. Add Row Level Security (RLS) to PostgreSQL
3. Build comprehensive sync manager
4. Add conflict resolution for offline edits
5. Implement audit logging
6. Add encryption for sensitive data
7. Build admin dashboard for multi-tenant management
