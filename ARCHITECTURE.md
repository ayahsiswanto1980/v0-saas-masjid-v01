# Arsitektur SaaS Manajemen Masjid Multi-Tenant

## 1. DESAIN ARSITEKTUR CLEAN SEPARATION

### Layer Architecture (3-Tier)

```
┌─────────────────────────────────────────┐
│        PRESENTATION LAYER (UI)          │
│  React Components, State Management     │
└─────────────────────────────────────────┘
                    ↓ (Interface)
┌─────────────────────────────────────────┐
│        SERVICE LAYER (Business Logic)   │
│  Use Cases, Validasi, Koordinasi        │
└─────────────────────────────────────────┘
                    ↓ (Repository Pattern)
┌─────────────────────────────────────────┐
│        DATA ACCESS LAYER                │
│  Repository Abstraction (Interface)     │
│  ├─ IndexedDB Implementation (Phase 1) │
│  └─ API Client Implementation (Phase 2)│
└─────────────────────────────────────────┘
                    ↓ (Concrete)
┌─────────────────────────────────────────┐
│        DATA SOURCE LAYER                │
│  ├─ IndexedDB (Phase 1)                │
│  └─ Laravel API (Phase 2)              │
└─────────────────────────────────────────┘
```

### Design Pattern Explanation

**Keuntungan Clean Separation:**
- **UI Logic Decoupled**: Component tidak perlu tahu apakah data dari IndexedDB atau API
- **Easy Testing**: Service dan Repository bisa di-mock
- **Easy Migration**: Cukup ganti Repository implementation, UI tetap sama
- **Scalability**: Service layer bisa ditambah logic kompleks tanpa ubah UI

---

## 2. STRUKTUR FOLDER REACT YANG SCALABLE

```
src/
├── api/                          # API Client Layer (Phase 2)
│   ├── client.ts                 # Axios/Fetch instance
│   └── interceptors.ts           # Auth token, error handling
│
├── data/                         # Data Layer (Repository Pattern)
│   ├── repositories/             # Abstract interfaces + implementations
│   │   ├── IMosqueRepository.ts  # Interface (contract)
│   │   ├── mosque/
│   │   │   ├── MosqueIndexedDB.ts     # Phase 1: IndexedDB impl
│   │   │   ├── MosqueAPI.ts           # Phase 2: API impl
│   │   │   └── MosqueRepositoryFactory.ts
│   │   │
│   │   ├── IUserRepository.ts
│   │   ├── user/
│   │   │   ├── UserIndexedDB.ts
│   │   │   ├── UserAPI.ts
│   │   │   └── UserRepositoryFactory.ts
│   │   │
│   │   └── [other entities...]
│   │
│   └── models/                   # Data Models
│       ├── Mosque.ts
│       ├── User.ts
│       └── types.ts
│
├── services/                     # Service Layer (Business Logic)
│   ├── MosqueService.ts          # Use cases: list, create, update
│   ├── UserService.ts
│   ├── AuthService.ts
│   └── TenantService.ts          # Multi-tenant logic
│
├── hooks/                        # React Hooks (Business Logic Hooks)
│   ├── useMosque.ts              # Wraps MosqueService + state
│   ├── useUser.ts
│   ├── useAuth.ts
│   └── useTenant.ts              # Tenant context
│
├── stores/                       # State Management (Zustand/Context)
│   ├── authStore.ts              # Auth state
│   ├── tenantStore.ts            # Current tenant
│   └── uiStore.ts                # UI state (modals, etc)
│
├── components/                   # React Components
│   ├── layout/
│   │   ├── MainLayout.tsx
│   │   ├── Sidebar.tsx
│   │   └── Header.tsx
│   │
│   ├── mosque/                   # Feature components
│   │   ├── MosqueList.tsx
│   │   ├── MosqueForm.tsx
│   │   └── MosqueDetail.tsx
│   │
│   ├── user/
│   │   ├── UserList.tsx
│   │   ├── UserForm.tsx
│   │   └── UserRoles.tsx
│   │
│   ├── common/                   # Reusable components
│   │   ├── Button.tsx
│   │   ├── Modal.tsx
│   │   └── Table.tsx
│   │
│   └── auth/
│       ├── LoginForm.tsx
│       └── RegisterForm.tsx
│
├── pages/                        # Page Components (routing)
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   ├── MosqueManagementPage.tsx
│   └── UserManagementPage.tsx
│
├── utils/                        # Utilities
│   ├── validators.ts             # Input validation
│   ├── formatters.ts             # Date, currency formatting
│   ├── constants.ts              # Enums, constants
│   └── errors.ts                 # Error classes
│
├── config/                       # Configuration
│   ├── environment.ts
│   ├── database.ts               # IndexedDB config (Phase 1)
│   └── api.ts                    # API config (Phase 2)
│
└── App.tsx                       # Root component
    └── index.tsx
```

---

## 3. REPOSITORY PATTERN DESIGN

### Interface Definition

```typescript
// src/data/repositories/IMosqueRepository.ts
export interface IMosqueRepository {
  // CRUD Operations
  getAll(tenantId: string): Promise<Mosque[]>;
  getById(tenantId: string, id: string): Promise<Mosque | null>;
  create(tenantId: string, data: CreateMosqueDTO): Promise<Mosque>;
  update(tenantId: string, id: string, data: UpdateMosqueDTO): Promise<Mosque>;
  delete(tenantId: string, id: string): Promise<void>;
  
  // Bulk operations
  bulkCreate(tenantId: string, data: CreateMosqueDTO[]): Promise<Mosque[]>;
  
  // Search/Filter
  search(tenantId: string, query: string): Promise<Mosque[]>;
  filter(tenantId: string, filters: MosqueFilterCriteria): Promise<Mosque[]>;
  
  // Sync (for offline support)
  syncPending(): Promise<SyncResult>;
  markAsDirty(id: string): void;
}
```

### Phase 1: IndexedDB Implementation

```typescript
// src/data/repositories/mosque/MosqueIndexedDB.ts
import { IMosqueRepository } from '../IMosqueRepository';

export class MosqueIndexedDB implements IMosqueRepository {
  private dbName = 'mosque-saas-v1';
  private storeName = 'mosques';
  private db: IDBDatabase;

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('tenantId', 'tenantId', { unique: false });
          store.createIndex('tenantId_active', ['tenantId', 'isActive'], { unique: false });
        }
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(tenantId: string): Promise<Mosque[]> {
    const tx = this.db.transaction(this.storeName, 'readonly');
    const store = tx.objectStore(this.storeName);
    const index = store.index('tenantId');
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(tenantId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getById(tenantId: string, id: string): Promise<Mosque | null> {
    const tx = this.db.transaction(this.storeName, 'readonly');
    const store = tx.objectStore(this.storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => {
        const data = request.result;
        // Verify tenant ownership
        if (data && data.tenantId === tenantId) {
          resolve(data);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async create(tenantId: string, data: CreateMosqueDTO): Promise<Mosque> {
    const mosque = this.createEntity(tenantId, data);
    const tx = this.db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.add(mosque);
      request.onsuccess = () => resolve(mosque);
      request.onerror = () => reject(request.error);
    });
  }

  async update(tenantId: string, id: string, data: UpdateMosqueDTO): Promise<Mosque> {
    const existing = await this.getById(tenantId, id);
    if (!existing) throw new NotFoundError('Mosque not found');
    
    const updated = { ...existing, ...data, updatedAt: new Date() };
    const tx = this.db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.put(updated);
      request.onsuccess = () => resolve(updated);
      request.onerror = () => reject(request.error);
    });
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const existing = await this.getById(tenantId, id);
    if (!existing) throw new NotFoundError('Mosque not found');
    
    const tx = this.db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async syncPending(): Promise<SyncResult> {
    // Find all records marked as dirty/pending
    const dirtyRecords = await this.getDirtyRecords();
    
    // Track sync status - for Phase 2 will send to API
    return {
      synced: 0,
      failed: 0,
      errors: []
    };
  }

  private createEntity(tenantId: string, data: CreateMosqueDTO): Mosque {
    const id = crypto.randomUUID();
    return {
      id,
      tenantId,
      ...data,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      syncStatus: 'local' // Track sync status
    };
  }

  private async getDirtyRecords(): Promise<Mosque[]> {
    const tx = this.db.transaction(this.storeName, 'readonly');
    const store = tx.objectStore(this.storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const records = request.result.filter(r => r.syncStatus !== 'synced');
        resolve(records);
      };
      request.onerror = () => reject(request.error);
    });
  }
}
```

### Phase 2: API Implementation

```typescript
// src/data/repositories/mosque/MosqueAPI.ts
import { IMosqueRepository } from '../IMosqueRepository';

export class MosqueAPI implements IMosqueRepository {
  constructor(private apiClient: APIClient) {}

  async getAll(tenantId: string): Promise<Mosque[]> {
    const response = await this.apiClient.get(`/mosques`, {
      params: { tenant_id: tenantId }
    });
    return response.data;
  }

  async getById(tenantId: string, id: string): Promise<Mosque | null> {
    try {
      const response = await this.apiClient.get(`/mosques/${id}`, {
        params: { tenant_id: tenantId }
      });
      return response.data;
    } catch (error) {
      if (error.status === 404) return null;
      throw error;
    }
  }

  async create(tenantId: string, data: CreateMosqueDTO): Promise<Mosque> {
    const response = await this.apiClient.post(`/mosques`, {
      ...data,
      tenant_id: tenantId
    });
    return response.data;
  }

  async update(tenantId: string, id: string, data: UpdateMosqueDTO): Promise<Mosque> {
    const response = await this.apiClient.put(`/mosques/${id}`, {
      ...data,
      tenant_id: tenantId
    });
    return response.data;
  }

  async delete(tenantId: string, id: string): Promise<void> {
    await this.apiClient.delete(`/mosques/${id}`, {
      params: { tenant_id: tenantId }
    });
  }

  async syncPending(): Promise<SyncResult> {
    // Phase 2: Sync offline changes to server
    const offlineStore = new OfflineStore();
    const pendingChanges = await offlineStore.getPendingChanges();
    
    const result: SyncResult = { synced: 0, failed: 0, errors: [] };
    
    for (const change of pendingChanges) {
      try {
        await this.applySyncChange(change);
        result.synced++;
      } catch (error) {
        result.failed++;
        result.errors.push(error.message);
      }
    }
    
    return result;
  }

  private async applySyncChange(change: PendingChange): Promise<void> {
    switch (change.operation) {
      case 'create':
        await this.create(change.tenantId, change.data);
        break;
      case 'update':
        await this.update(change.tenantId, change.id, change.data);
        break;
      case 'delete':
        await this.delete(change.tenantId, change.id);
        break;
    }
  }
}
```

### Factory Pattern for Easy Switching

```typescript
// src/data/repositories/mosque/MosqueRepositoryFactory.ts
export class MosqueRepositoryFactory {
  static create(config: RepositoryConfig): IMosqueRepository {
    if (config.useAPI) {
      return new MosqueAPI(config.apiClient);
    } else {
      return new MosqueIndexedDB();
    }
  }
}

// Usage in app initialization
const config = {
  useAPI: process.env.REACT_APP_USE_API === 'true', // Toggle in .env
  apiClient: new APIClient()
};

const mosqueRepository = MosqueRepositoryFactory.create(config);
```

---

## 4. DESAIN STRUKTUR DATA KOMPATIBEL PostgreSQL

### Data Models with PostgreSQL Compatibility

```typescript
// src/data/models/types.ts

// Mosque Entity
export interface Mosque {
  id: string;                    // UUID (PostgreSQL: uuid)
  tenantId: string;              // UUID (multi-tenant key)
  name: string;                  // varchar(255)
  address: string;               // text
  city: string;                  // varchar(100)
  phoneNumber: string;           // varchar(20)
  email?: string;                // varchar(255)
  latitude?: number;             // decimal(10,8)
  longitude?: number;            // decimal(10,8)
  capacity: number;              // integer
  managerId: string;             // FK to User
  isActive: boolean;             // boolean
  createdAt: Date;               // timestamp
  updatedAt: Date;               // timestamp
  
  // Phase 1 only (IndexedDB tracking)
  syncStatus?: 'local' | 'syncing' | 'synced' | 'failed';
  lastSyncError?: string;
}

// User Entity
export interface User {
  id: string;                    // UUID
  tenantId: string;              // UUID (multi-tenant key)
  email: string;                 // varchar(255), unique per tenant
  password?: string;             // hashed (nullable for OAuth)
  fullName: string;              // varchar(255)
  role: UserRole;                // enum: admin, staff, user
  mosqueId?: string;             // FK to Mosque (optional)
  isActive: boolean;             // boolean
  lastLogin?: Date;              // timestamp
  createdAt: Date;               // timestamp
  updatedAt: Date;               // timestamp
  
  syncStatus?: 'local' | 'syncing' | 'synced' | 'failed';
}

// Schedule Entity
export interface Schedule {
  id: string;                    // UUID
  tenantId: string;              // UUID
  mosqueId: string;              // FK to Mosque
  type: 'prayer' | 'event' | 'class';
  name: string;                  // varchar(255)
  time: string;                  // time format HH:mm
  dayOfWeek?: number;            // 0-6 (Sunday-Saturday)
  startDate?: Date;              // date
  endDate?: Date;                // date
  capacity?: number;             // integer
  createdBy: string;             // FK to User
  createdAt: Date;               // timestamp
  updatedAt: Date;               // timestamp
  
  syncStatus?: 'local' | 'syncing' | 'synced' | 'failed';
}

// DTOs for API/Operations
export interface CreateMosqueDTO {
  name: string;
  address: string;
  city: string;
  phoneNumber: string;
  email?: string;
  latitude?: number;
  longitude?: number;
  capacity: number;
  managerId: string;
}

export interface UpdateMosqueDTO {
  name?: string;
  address?: string;
  city?: string;
  phoneNumber?: string;
  email?: string;
  capacity?: number;
  managerId?: string;
}

// Filter/Search DTOs
export interface MosqueFilterCriteria {
  city?: string;
  isActive?: boolean;
  managerId?: string;
}

// Pagination
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Sync tracking
export interface SyncResult {
  synced: number;
  failed: number;
  errors: string[];
}

export interface PendingChange {
  id: string;
  operation: 'create' | 'update' | 'delete';
  entityType: 'mosque' | 'user' | 'schedule';
  tenantId: string;
  entityId?: string;
  data: any;
  timestamp: Date;
}

// Multi-tenant context
export interface TenantContext {
  tenantId: string;
  tenantName: string;
  userId: string;
  userRole: UserRole;
  permissions: string[];
}
```

### PostgreSQL Schema (Phase 2 Reference)

```sql
-- Tenants table (SaaS core)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mosques (multi-tenant)
CREATE TABLE mosques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  city VARCHAR(100),
  phone_number VARCHAR(20),
  email VARCHAR(255),
  latitude DECIMAL(10,8),
  longitude DECIMAL(10,8),
  capacity INTEGER,
  manager_id UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT unique_mosque_per_tenant UNIQUE (tenant_id, name),
  CONSTRAINT mosque_tenant_idx UNIQUE (tenant_id, id)
);

-- Users (multi-tenant)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255),
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  mosque_id UUID REFERENCES mosques(id),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT unique_user_per_tenant UNIQUE (tenant_id, email)
);

-- Schedules (multi-tenant)
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  mosque_id UUID NOT NULL REFERENCES mosques(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  time TIME,
  day_of_week INTEGER,
  start_date DATE,
  end_date DATE,
  capacity INTEGER,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for multi-tenant queries
CREATE INDEX idx_mosques_tenant_id ON mosques(tenant_id);
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email_tenant ON users(tenant_id, email);
CREATE INDEX idx_schedules_tenant_id ON schedules(tenant_id);
CREATE INDEX idx_schedules_mosque_id ON schedules(mosque_id);

-- Row Level Security (Phase 2 - PostgreSQL)
ALTER TABLE mosques ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY mosque_tenant_policy ON mosques
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY user_tenant_policy ON users
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY schedule_tenant_policy ON schedules
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

---

## 5. STRATEGI MULTI-TENANT DENGAN tenant_id

### Tenant Context Management

```typescript
// src/services/TenantService.ts
import { create } from 'zustand';

interface TenantStore {
  currentTenant: TenantContext | null;
  setTenant: (tenant: TenantContext) => void;
  getTenantId: () => string;
}

export const useTenantStore = create<TenantStore>((set, get) => ({
  currentTenant: null,
  
  setTenant: (tenant: TenantContext) => {
    localStorage.setItem('currentTenant', JSON.stringify(tenant));
    set({ currentTenant: tenant });
  },
  
  getTenantId: () => {
    return get().currentTenant?.tenantId || '';
  }
}));

export class TenantService {
  // Every repository call includes tenant_id
  async getMosquesForCurrentTenant(repo: IMosqueRepository): Promise<Mosque[]> {
    const tenantId = useTenantStore.getState().getTenantId();
    if (!tenantId) throw new Error('No tenant context');
    
    return repo.getAll(tenantId);
  }

  // Validate tenant ownership
  validateTenantAccess(tenantId: string): void {
    const currentTenant = useTenantStore.getState().currentTenant;
    if (currentTenant?.tenantId !== tenantId) {
      throw new UnauthorizedError('Tenant access denied');
    }
  }
}
```

### Enforcement Layer (API Interceptor - Phase 2)

```typescript
// src/api/interceptors.ts
export function setupTenantInterceptor(apiClient: APIClient) {
  apiClient.interceptors.request.use((config) => {
    const tenantId = useTenantStore.getState().getTenantId();
    
    // Add tenant_id to every request (query param or header)
    config.headers['X-Tenant-ID'] = tenantId;
    
    // Alternative: Add to request body for mutations
    if (config.method !== 'get') {
      config.data = {
        ...config.data,
        tenant_id: tenantId
      };
    }
    
    return config;
  });
}
```

### Tenant Initialization Flow

```typescript
// src/hooks/useTenant.ts
export function useTenant() {
  const [loading, setLoading] = useState(true);
  const setTenant = useTenantStore((s) => s.setTenant);
  
  useEffect(() => {
    const initTenant = async () => {
      // Get from localStorage or auth response
      const savedTenant = localStorage.getItem('currentTenant');
      
      if (savedTenant) {
        setTenant(JSON.parse(savedTenant));
      } else {
        // Fetch tenant info from API/auth service
        const tenantInfo = await fetchCurrentTenant();
        setTenant(tenantInfo);
      }
      
      setLoading(false);
    };
    
    initTenant();
  }, []);
  
  return { loading };
}
```

---

## 6. STRATEGI MIGRASI DATA IndexedDB → PostgreSQL

### Phase 1 to Phase 2 Migration Strategy

#### Step 1: Add Sync Tracking to Phase 1

```typescript
// src/data/repositories/mosque/MosqueIndexedDB.ts (updated)
private async trackForSync(record: Mosque, operation: 'create' | 'update' | 'delete') {
  const syncQueue = await this.openStore('syncQueue');
  
  await new Promise((resolve, reject) => {
    const request = syncQueue.add({
      id: crypto.randomUUID(),
      operation,
      entityType: 'mosque',
      entityId: record.id,
      data: record,
      timestamp: new Date(),
      synced: false
    });
    
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}
```

#### Step 2: Bulk Export Function

```typescript
// src/data/export/IndexedDBExporter.ts
export class IndexedDBExporter {
  async exportAllData(tenantId: string): Promise<ExportData> {
    const db = await this.openDatabase();
    
    return {
      version: '1.0',
      exportDate: new Date(),
      tenantId,
      tables: {
        mosques: await this.exportTable(db, 'mosques', tenantId),
        users: await this.exportTable(db, 'users', tenantId),
        schedules: await this.exportTable(db, 'schedules', tenantId),
        syncQueue: await this.exportTable(db, 'syncQueue', tenantId),
      }
    };
  }

  private async exportTable(db: IDBDatabase, tableName: string, tenantId: string): Promise<any[]> {
    const tx = db.transaction(tableName, 'readonly');
    const store = tx.objectStore(tableName);
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const records = request.result.filter(r => r.tenantId === tenantId);
        resolve(records);
      };
      request.onerror = () => reject(request.error);
    });
  }

  downloadAsJSON(data: ExportData): void {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mosque-saas-export-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
```

#### Step 3: API Bulk Import Endpoint (Laravel)

```php
// Laravel Route: POST /api/migrate/import
Route::post('/migrate/import', [MigrationController::class, 'importData']);

// MigrationController.php
public function importData(Request $request)
{
    $validated = $request->validate([
        'tenantId' => 'required|uuid',
        'data' => 'required|json'
    ]);

    DB::transaction(function () use ($validated) {
        $importData = json_decode($validated['data'], true);
        $tenantId = $validated['tenantId'];

        // Import Mosques
        foreach ($importData['tables']['mosques'] as $mosque) {
            Mosque::updateOrCreate(
                ['id' => $mosque['id']],
                array_merge($mosque, ['tenant_id' => $tenantId])
            );
        }

        // Import Users (hash passwords)
        foreach ($importData['tables']['users'] as $user) {
            User::updateOrCreate(
                ['id' => $user['id']],
                array_merge($user, [
                    'tenant_id' => $tenantId,
                    'password' => Hash::make($user['password'] ?? 'temp123')
                ])
            );
        }

        // Import Schedules
        foreach ($importData['tables']['schedules'] as $schedule) {
            Schedule::updateOrCreate(
                ['id' => $schedule['id']],
                array_merge($schedule, ['tenant_id' => $tenantId])
            );
        }
    });

    return response()->json(['status' => 'imported']);
}
```

#### Step 4: Incremental Sync During Transition

```typescript
// src/services/SyncService.ts
export class SyncService {
  constructor(
    private mosqueRepo: IMosqueRepository,
    private useAPI: boolean // Toggle config
  ) {}

  async syncAllEntities(tenantId: string): Promise<void> {
    if (!this.useAPI) return; // Only sync when using API

    console.log('[Sync] Starting sync for tenant:', tenantId);

    try {
      // Get pending changes from sync queue
      const pendingChanges = await this.getPendingChanges(tenantId);
      
      for (const change of pendingChanges) {
        await this.applyChange(change);
        await this.markAsSynced(change.id);
      }

      console.log('[Sync] Sync completed successfully');
    } catch (error) {
      console.error('[Sync] Sync failed:', error);
      throw error;
    }
  }

  private async applyChange(change: PendingChange): Promise<void> {
    switch (change.operation) {
      case 'create':
        await this.mosqueRepo.create(change.tenantId, change.data);
        break;
      case 'update':
        await this.mosqueRepo.update(change.tenantId, change.entityId!, change.data);
        break;
      case 'delete':
        await this.mosqueRepo.delete(change.tenantId, change.entityId!);
        break;
    }
  }
}
```

### Migration Workflow

```
PHASE 1 (IndexedDB) → TRANSITION → PHASE 2 (API)

┌─────────────────────────────────────────────┐
│ Step 1: Export IndexedDB to JSON            │
│ - User clicks "Migrate to Cloud"            │
│ - All tenant data exported to JSON          │
│ - File downloaded to user's device          │
└─────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────┐
│ Step 2: User Sets Up Backend Account        │
│ - User creates account on Laravel app       │
│ - Tenant created in PostgreSQL              │
│ - API credentials generated                 │
└─────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────┐
│ Step 3: Upload JSON to API                  │
│ - User uploads exported file to API         │
│ - Laravel validates & imports data          │
│ - Data stored in PostgreSQL                 │
└─────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────┐
│ Step 4: Switch Frontend to API              │
│ - Update .env: REACT_APP_USE_API=true       │
│ - Replace MosqueIndexedDB with MosqueAPI    │
│ - Clear IndexedDB, fetch from API           │
│ - Rebuild app (npm run build)               │
└─────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────┐
│ Step 5: Verify & Clean Up                   │
│ - Sync test: create/update/delete           │
│ - Clear old IndexedDB if all working        │
│ - Document migration in tenant record       │
└─────────────────────────────────────────────┘
```

---

## 7. RISIKO JIKA DESAIN SALAH DARI AWAL

### Critical Risks

#### 🔴 Risk 1: Tight Coupling UI to Data Source

**Problem**: 
```typescript
// ❌ BAD - UI directly coupled to IndexedDB
export function MosqueList() {
  const [mosques, setMosques] = useState<Mosque[]>([]);

  useEffect(() => {
    // Direct IndexedDB call from component
    indexedDB.open('mosque-db').then(db => {
      // ... complex query logic
    });
  }, []);

  return <div>{mosques.map(m => <div>{m.name}</div>)}</div>;
}
```

**Impact**: 
- Extremely difficult to migrate to API (must rewrite ALL components)
- Testing impossible without actual IndexedDB instance
- Code duplication across components
- **Effort to fix**: 2-3 weeks (rewrites many components)

**Solution**: 
- Use repository pattern (as designed)
- Inject repository into hooks/services
- Components only call hooks, never data layer directly

---

#### 🔴 Risk 2: Missing tenant_id in Data Model

**Problem**:
```typescript
// ❌ BAD - No tenant isolation
interface Mosque {
  id: string;
  name: string;
  // Missing: tenantId
}
```

**Impact**:
- All tenants can see each other's data
- Security breach on day 1
- **Cannot fix without data migration**
- Regulatory/legal liability

**Solution**:
- Add `tenantId` to EVERY entity from the start
- Add unique constraint `(tenantId, id)` on all tables
- Filter by `tenant_id` on ALL queries

---

#### 🔴 Risk 3: Inconsistent Data Types

**Problem**:
```typescript
// ❌ BAD - Mixing types
// Phase 1: Using string dates
const mosque: Mosque = {
  createdAt: "2024-01-01" // string ❌
};

// Phase 2: PostgreSQL returns Date objects
// Inconsistent serialization/deserialization
```

**Impact**:
- Date calculations fail
- JSON serialization breaks
- Comparisons don't work
- Complex debugging during migration

**Solution**:
- Define strict TypeScript types upfront
- Use ISO 8601 format (string) in transport
- Parse to Date objects only in model classes
- Consistent serialization in all layers

---

#### 🔴 Risk 4: No Pagination Strategy

**Problem**:
```typescript
// ❌ BAD - Load all data
async getAll(tenantId: string): Promise<Mosque[]> {
  // IndexedDB: OK with 1000 records
  // PostgreSQL: Disaster with 100k records
}
```

**Impact**:
- UI crashes with large datasets
- Network timeout
- Out of memory errors
- **Unfixable without architectural redesign**

**Solution**:
- Design pagination from start:
```typescript
interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

async getAll(tenantId: string, page: number = 1, pageSize: number = 20): Promise<PaginatedResult<Mosque>>;
```

---

#### 🔴 Risk 5: UUID vs Auto-increment ID

**Problem**:
```typescript
// ❌ BAD - Auto-increment ID
// IndexedDB: "1", "2", "3"
// PostgreSQL: serial integer
// Conflict on merge! Multiple records with id=1
```

**Impact**:
- Data corruption on migration
- Duplicate records after sync
- Impossible to reconcile

**Solution**:
- Use UUID (v4) from day 1
- Both IndexedDB and PostgreSQL support UUID
- No collision risk
- Globally unique

---

#### 🔴 Risk 6: No Sync Status Tracking

**Problem**:
- During offline phase, no way to track what's synced
- During migration, don't know what data is pending

**Impact**:
- Data loss during migration
- Duplicate records (create locally + create on server)
- Undetectable inconsistencies

**Solution**:
- Add `syncStatus` field to every entity
- Track: `'local' | 'syncing' | 'synced' | 'failed'`
- Maintain `syncQueue` table for pending operations

---

### Estimated Effort to Fix Each Risk

| Risk | If Designed Wrong | If Designed Right |
|------|-------------------|-------------------|
| Tight Coupling | 2-3 weeks | Already implemented |
| Missing tenant_id | 3-4 weeks + legal liability | Already enforced |
| Inconsistent Types | 1-2 weeks | Type-safe from start |
| No Pagination | 2-3 weeks | Built into interface |
| ID Strategy | 1-2 weeks + data migration | UUID from start |
| No Sync Tracking | 1-2 weeks | Already tracking |
| **TOTAL** | **~10 weeks** | **Zero additional effort** |

---

## 8. CONTOH ALUR REQUEST: SEBELUM vs SESUDAH MIGRASI

### Scenario: Membuat Mosque Baru

#### PHASE 1: IndexedDB (Offline-First)

```
┌─────────────────┐
│  React Component│
│  MosqueForm.tsx │
└────────┬────────┘
         │ onSubmit(data)
         ↓
┌─────────────────────────────────────┐
│  Service Layer                      │
│  MosqueService.create(tenantId, dto)│
├─────────────────────────────────────┤
│  - Validate data                    │
│  - Assign UUID                      │
│  - Add tenantId                     │
│  - Mark: syncStatus='local'         │
└────────┬────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────┐
│  Repository Pattern (Interface)     │
│  IMosqueRepository.create()         │
└────────┬────────────────────────────┘
         │ (Implementation: MosqueIndexedDB)
         ↓
┌─────────────────────────────────────┐
│  IndexedDB                          │
│  stores['mosques'].add({            │
│    id: "uuid-123",                  │
│    tenantId: "tenant-456",          │
│    name: "Masjid Al-Ikhlas",        │
│    syncStatus: 'local'              │
│  })                                 │
└────────┬────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────┐
│  Component State Update             │
│  - Add to local list                │
│  - Show success toast               │
│  - Redirect to detail page          │
└─────────────────────────────────────┘

📊 Data Flow:
Component → Service → Repository Interface → IndexedDB Impl → IndexedDB Storage

⏱️  Latency: ~50ms (local only)
📡 Offline: ✅ Yes
🔄 Sync Queue: ✅ Added to queue, ready for later sync
```

#### PHASE 2: PostgreSQL API (With Backend)

```
┌─────────────────┐
│  React Component│
│  MosqueForm.tsx │
└────────┬────────┘
         │ onSubmit(data)
         ↓
┌─────────────────────────────────────┐
│  Service Layer                      │
│  MosqueService.create(tenantId, dto)│
├─────────────────────────────────────┤
│  - Validate data                    │
│  - Assign UUID                      │
│  - Add tenantId                     │
│  - Mark: syncStatus='syncing'       │
└────────┬────────────────────────────┘
         │
         ↓
┌─────────────────────────────────────┐
│  Repository Pattern (Interface)     │
│  IMosqueRepository.create()         │
└────────┬────────────────────────────┘
         │ (Implementation: MosqueAPI)
         ↓
┌─────────────────────────────────────┐
│  API Client                         │
│  POST /api/mosques                  │
│  Headers:                           │
│  - X-Tenant-ID: tenant-456          │
│  - Authorization: Bearer token      │
│  Body: { name, address, ... }       │
└────────┬────────────────────────────┘
         │
    ┌────┴─────────────────────────┐
    │ HTTP Network Request          │
    │ ~200-500ms                    │
    └───────────────┬───────────────┘
                    │
         ┌──────────┴──────────┐
         │                     │
         ↓                     ↓
    ❌ Error           ✅ Success (201)
    │                 │
    │ Retry logic     ├─────────────────────────┐
    │                 │                         │
    └─────────────────┼─────────────────┐       │
                      │                 │       │
                      ↓                 ↓       ↓
            ┌──────────────────────────────────────┐
            │  Laravel API Handler                 │
            │  MosqueController@store()             │
            ├──────────────────────────────────────┤
            │  - Validate tenantId (X-Tenant-ID)   │
            │  - Check user permissions            │
            │  - Validate input data               │
            │  - Create model instance             │
            │  - Save to PostgreSQL                │
            │  - Return JSON response              │
            └───────────────┬──────────────────────┘
                            │
                            ↓
                  ┌────────────────────┐
                  │  PostgreSQL        │
                  │  INSERT INTO       │
                  │  mosques (         │
                  │    id,             │
                  │    tenant_id,      │
                  │    name,           │
                  │    created_at      │
                  │  ) VALUES (...)    │
                  └────────┬───────────┘
                           │
                           ↓ Row created, RLS verified
                  ┌────────────────────┐
                  │  API Response      │
                  │  {                 │
                  │    id: "uuid-123", │
                  │    name: "...",    │
                  │    createdAt: ...  │
                  │  }                 │
                  └────────┬───────────┘
                           │
                           ↓
           ┌───────────────────────────────────┐
           │  Component receives response       │
           │  - Update state with server data  │
           │  - Show success message           │
           │  - Redirect to detail page        │
           └───────────────────────────────────┘

📊 Data Flow:
Component → Service → Repository Interface → API Client → HTTP → Laravel → PostgreSQL

⏱️  Latency: ~200-500ms (network dependent)
📡 Offline: ❌ No (requires connectivity)
🔄 Sync Queue: ❌ Data immediately on server
🔐 Security: ✅ Tenant isolation enforced by RLS
💾 Persistence: ✅ Durable on PostgreSQL
```

---

### Scenario: Membaca List Mosque

#### PHASE 1: IndexedDB (IndexedDB Query)

```typescript
// Component Hook
const { data: mosques, loading } = useMosque();

// Hook Implementation
export function useMosque() {
  const [data, setData] = useState<Mosque[]>([]);
  const [loading, setLoading] = useState(true);
  const mosqueService = MosqueService.getInstance();

  useEffect(() => {
    const fetchMosques = async () => {
      try {
        const tenantId = useTenantStore.getState().getTenantId();
        const result = await mosqueService.getAll(tenantId, { page: 1, pageSize: 20 });
        setData(result.data);
      } finally {
        setLoading(false);
      }
    };

    fetchMosques();
  }, []);

  return { data, loading };
}

// Service Layer
class MosqueService {
  async getAll(tenantId: string, pagination: Pagination): Promise<PaginatedResult<Mosque>> {
    // Calls repository
    return this.repository.getAll(tenantId);
  }
}

// Repository Implementation (IndexedDB)
class MosqueIndexedDB implements IMosqueRepository {
  async getAll(tenantId: string): Promise<Mosque[]> {
    const tx = this.db.transaction('mosques', 'readonly');
    const store = tx.objectStore('mosques');
    const index = store.index('tenantId');

    return new Promise((resolve) => {
      const request = index.getAll(tenantId);
      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }
}

// Data retrieval
const allMosques = [
  { id: 'uuid-1', tenantId: 'tenant-456', name: 'Masjid Al-Ikhlas', syncStatus: 'local' },
  { id: 'uuid-2', tenantId: 'tenant-456', name: 'Masjid Raudhah', syncStatus: 'synced' }
];

// Response time: ~10-30ms (local)
```

#### PHASE 2: PostgreSQL API (API Query with Pagination)

```typescript
// Component Hook (SAME CODE - NO CHANGES!)
const { data: mosques, loading } = useMosque();

// Hook Implementation (SAME - NO CHANGES!)
export function useMosque() {
  const [data, setData] = useState<Mosque[]>([]);
  const [loading, setLoading] = useState(true);
  const mosqueService = MosqueService.getInstance();

  useEffect(() => {
    const fetchMosques = async () => {
      try {
        const tenantId = useTenantStore.getState().getTenantId();
        const result = await mosqueService.getAll(tenantId, { page: 1, pageSize: 20 });
        setData(result.data);
      } finally {
        setLoading(false);
      }
    };

    fetchMosques();
  }, []);

  return { data, loading };
}

// Service Layer (SAME - NO CHANGES!)
class MosqueService {
  async getAll(tenantId: string, pagination: Pagination): Promise<PaginatedResult<Mosque>> {
    return this.repository.getAll(tenantId);
  }
}

// Repository Implementation (CHANGED - NOW API)
class MosqueAPI implements IMosqueRepository {
  async getAll(tenantId: string): Promise<Mosque[]> {
    // API call instead of IndexedDB
    const response = await this.apiClient.get('/mosques', {
      params: {
        tenant_id: tenantId,
        page: 1,
        pageSize: 20
      },
      headers: {
        'X-Tenant-ID': tenantId
      }
    });

    return response.data;
  }
}

// Laravel Endpoint
// GET /api/mosques?page=1&pageSize=20
// Headers: X-Tenant-ID: tenant-456, Authorization: Bearer token

// Laravel Handler
public function index(Request $request)
{
    $tenantId = $request->header('X-Tenant-ID');
    $page = $request->input('page', 1);
    $pageSize = $request->input('pageSize', 20);

    $mosques = Mosque::where('tenant_id', $tenantId)
        ->paginate($pageSize, ['*'], 'page', $page);

    return response()->json($mosques);
}

// PostgreSQL Query (with RLS)
SET app.tenant_id = 'tenant-456';
SELECT * FROM mosques
WHERE tenant_id = 'tenant-456'
LIMIT 20
OFFSET 0;

// Response
[
  { id: 'uuid-1', tenant_id: 'tenant-456', name: 'Masjid Al-Ikhlas', created_at: '2024-01-01' },
  { id: 'uuid-2', tenant_id: 'tenant-456', name: 'Masjid Raudhah', created_at: '2024-01-02' }
]

// Response time: ~150-300ms (network + DB query)
```

**Key Insight**: 
- ✅ **Component code is IDENTICAL** in both phases
- ✅ **Hook code is IDENTICAL** in both phases
- ✅ **Service code is IDENTICAL** in both phases
- ❌ **Only Repository implementation changes** (IndexedDB → API)
- ✅ **This is the power of Repository Pattern!**

---

### Scenario: Offline Sync (Phase 1 → Phase 2 Transition)

#### During Migration: Hybrid Mode

```typescript
// During transition, sync older IndexedDB data to new API
class HybridMosqueRepository implements IMosqueRepository {
  constructor(
    private indexedDB: MosqueIndexedDB,
    private api: MosqueAPI,
    private useAPI: boolean
  ) {}

  async getAll(tenantId: string): Promise<Mosque[]> {
    if (this.useAPI) {
      try {
        // Try API first
        const data = await this.api.getAll(tenantId);
        return data;
      } catch (error) {
        console.warn('API failed, falling back to IndexedDB');
        return this.indexedDB.getAll(tenantId);
      }
    } else {
      // IndexedDB only
      return this.indexedDB.getAll(tenantId);
    }
  }

  async syncPending(): Promise<SyncResult> {
    // Get pending changes from IndexedDB
    const pending = await this.indexedDB.getPendingChanges();

    const result: SyncResult = { synced: 0, failed: 0, errors: [] };

    for (const change of pending) {
      try {
        // Push to API
        await this.applySyncToAPI(change);
        result.synced++;
      } catch (error) {
        result.failed++;
        result.errors.push(error.message);
      }
    }

    return result;
  }
}
```

**Migration Timeline**:

```
Week 1: User is on Phase 1 (IndexedDB)
- Creates offline data
- App stores in IndexedDB

Week 2: User migrates backend
- Exports IndexedDB as JSON
- Uploads to Laravel API
- PostgreSQL populated

Week 3: User switches frontend to API
- Environment variable: USE_API=true
- Rebuild frontend
- New requests hit API
- Old IndexedDB data cleared

Week 4: Everything synced
- All new data on PostgreSQL
- User fully migrated
```

---

## KESIMPULAN

### Checklist Implementasi

- ✅ Clean separation: UI → Service → Repository Interface → Implementation
- ✅ Scalable folder structure: data/, services/, hooks/, components/, pages/
- ✅ Repository pattern: `IMosqueRepository` interface with `MosqueIndexedDB` & `MosqueAPI` implementations
- ✅ PostgreSQL-compatible schema: UUID, tenant_id on every table, proper indexes
- ✅ Multi-tenant enforcement: tenant_id in every query, RLS policies
- ✅ Sync tracking: syncStatus field, syncQueue table, migration helpers
- ✅ Migration strategy: Export JSON → Upload API → Switch frontend config
- ✅ Risk mitigation: No tight coupling, proper typing, pagination from start

### Next Steps

1. **Implement Phase 1 skeleton** (React + Vite + IndexedDB)
2. **Build all repositories with interfaces** (no implementation tied to UI)
3. **Create services layer** with business logic
4. **Implement React hooks** that wrap services
5. **Add sync queue infrastructure** from day 1
6. **Design PostgreSQL schema** (ready for Phase 2)
7. **Plan API endpoints** to match repository methods
8. **Build migration tooling** (export, import, sync)

Dengan desain ini, migrasi dari IndexedDB ke PostgreSQL akan hanya memerlukan:
- Mengganti `MosqueIndexedDB` dengan `MosqueAPI`
- Update `.env` configuration
- Rebuild aplikasi

Seluruh aplikasi React akan tetap berfungsi tanpa perubahan! 🎉
