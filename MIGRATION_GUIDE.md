# Migration Guide: IndexedDB to REST API

Panduan langkah-demi-langkah untuk migrasi dari IndexedDB ke REST API tanpa mengubah UI.

---

## Phase 1: Before Migration (IndexedDB Only)

### Data Flow Diagram

```
┌────────────────────────────────────────┐
│     React Component                    │
│  (MosqueList.tsx)                      │
└────────────┬─────────────────────────┘
             │
             │ useMosqueService()
             ↓
┌────────────────────────────────────────┐
│  MosqueService                         │
│  - Validations                         │
│  - Caching                             │
│  - Business Logic                      │
└────────────┬─────────────────────────┘
             │
             │ this.repository.create()
             ↓
┌────────────────────────────────────────┐
│  IMosqueRepository                     │
│  (interface)                           │
└────────────┬─────────────────────────┘
             │
             ↓
┌────────────────────────────────────────┐
│  MosqueIndexedDBRepository             │
│  (concrete implementation)             │
└────────────┬─────────────────────────┘
             │
             ↓
┌────────────────────────────────────────┐
│  IndexedDB                             │
│  (local storage)                       │
└────────────────────────────────────────┘
```

### State Management Flow

```
Input: CreateMosqueDTO
  ↓
Service.createMosque(dto)
  ├─ Validate input
  ├─ Check business rules
  └─ Call repository.create()
    ↓
Repository.create(data)
  ├─ Store in IndexedDB
  ├─ Add to sync queue
  └─ Return created mosque
    ↓
UI updates
  └─ Display new mosque
```

### Example Code (Before)

```typescript
// Component
function CreateMosqueForm() {
  const service = useMosqueService()

  const handleSubmit = async (dto) => {
    const mosque = await service.createMosque(dto)
    // UI updates, no change needed after migration!
  }
}
```

---

## Phase 2: Prepare for Migration

### Checklist

- [ ] All repository methods implement IMosqueRepository
- [ ] All service methods validated
- [ ] No direct IndexedDB access from components
- [ ] No direct API calls from components
- [ ] All CRUD through service layer only
- [ ] Business logic centralized in service
- [ ] Tests cover service layer

### Verify Abstraction

Check that no component does this:
```typescript
// ❌ BAD - Direct repository access
const repo = new MosqueIndexedDBRepository()
const mosque = await repo.create(data, tenantId)
```

Should be:
```typescript
// ✅ GOOD - Through service
const service = useMosqueService()
const mosque = await service.createMosque(data)
```

---

## Phase 3: Prepare Backend API

### 3.1 Database Migration (Laravel)

```bash
php artisan make:migration create_mosques_table
```

```php
// database/migrations/xxxx_create_mosques_table.php
Schema::create('mosques', function (Blueprint $table) {
    $table->id();
    $table->foreignId('tenant_id')->constrained();
    $table->string('name')->unique('unique_name_per_tenant');
    $table->string('city');
    $table->string('address')->nullable();
    $table->string('phone')->nullable();
    $table->string('email')->nullable();
    $table->string('leader_name')->nullable();
    $table->string('leader_phone')->nullable();
    $table->enum('status', ['active', 'inactive'])->default('active');
    $table->timestamps();

    $table->index(['tenant_id', 'status']);
    $table->index('city');
});

php artisan migrate
```

### 3.2 Model & Resource

```bash
php artisan make:model Mosque -m -c -r
php artisan make:resource MosqueResource
```

```php
// app/Models/Mosque.php
class Mosque extends Model
{
    protected $fillable = [
        'tenant_id', 'name', 'city', 'address',
        'phone', 'email', 'leader_name', 'leader_phone', 'status'
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}
```

```php
// app/Resources/MosqueResource.php
class MosqueResource extends JsonResource
{
    public function toArray($request)
    {
        return [
            'id' => $this->id,
            'tenantId' => $this->tenant_id,
            'name' => $this->name,
            'city' => $this->city,
            'address' => $this->address,
            'phone' => $this->phone,
            'email' => $this->email,
            'leaderName' => $this->leader_name,
            'leaderPhone' => $this->leader_phone,
            'status' => $this->status,
            'createdAt' => $this->created_at,
            'updatedAt' => $this->updated_at,
        ];
    }
}
```

### 3.3 Controller

```php
// app/Http/Controllers/MosqueController.php
class MosqueController extends Controller
{
    public function index(Request $request)
    {
        $tenantId = $request->query('tenant_id');
        $query = Mosque::where('tenant_id', $tenantId);

        // Filter
        if ($request->has('filter')) {
            foreach ($request->input('filter') as $field => $value) {
                $query->where($field, $value);
            }
        }

        // Pagination
        $page = $request->input('page', 0);
        $limit = $request->input('limit', 20);

        return MosqueResource::collection(
            $query->paginate($limit, ['*'], 'page', $page + 1)
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'city' => 'required|string|max:255',
            'email' => 'nullable|email',
            'phone' => 'nullable|string',
        ]);

        $mosque = Mosque::create([
            ...$validated,
            'tenant_id' => $request->query('tenant_id'),
        ]);

        return new MosqueResource($mosque);
    }

    public function show(Mosque $mosque, Request $request)
    {
        $tenantId = $request->query('tenant_id');
        if ($mosque->tenant_id != $tenantId) {
            abort(403);
        }
        return new MosqueResource($mosque);
    }

    public function update(Request $request, Mosque $mosque)
    {
        $tenantId = $request->query('tenant_id');
        if ($mosque->tenant_id != $tenantId) {
            abort(403);
        }

        $mosque->update($request->only([
            'name', 'city', 'address', 'phone', 'email',
            'leader_name', 'leader_phone', 'status'
        ]));

        return new MosqueResource($mosque);
    }

    public function destroy(Mosque $mosque, Request $request)
    {
        $tenantId = $request->query('tenant_id');
        if ($mosque->tenant_id != $tenantId) {
            abort(403);
        }
        $mosque->delete();
        return response()->noContent();
    }
}
```

### 3.4 Routes

```php
// routes/api.php
Route::middleware('auth:sanctum')->group(function () {
    Route::apiResource('mosques', MosqueController::class)
        ->middleware('verify-tenant');

    // Bulk operations
    Route::post('mosques/bulk', [MosqueController::class, 'bulkStore']);
    Route::put('mosques/bulk', [MosqueController::class, 'bulkUpdate']);
    Route::delete('mosques/bulk', [MosqueController::class, 'bulkDelete']);

    // Statistics
    Route::get('mosques/statistics', [MosqueController::class, 'statistics']);
});
```

---

## Phase 4: Test API

### Postman/Insomnia Collection

```bash
# Create
POST /api/mosques?tenant_id=tenant1
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Masjid Al-Ikhlas",
  "city": "Jakarta",
  "address": "Jl. Merdeka No. 1",
  "phone": "021-1234567",
  "email": "info@masjid.id",
  "leaderName": "H. Ahmad",
  "leaderPhone": "08123456789",
  "status": "active"
}

# Read
GET /api/mosques/1?tenant_id=tenant1

# Update
PUT /api/mosques/1?tenant_id=tenant1
{
  "name": "Masjid Al-Ikhlas Updated"
}

# Delete
DELETE /api/mosques/1?tenant_id=tenant1

# List
GET /api/mosques?tenant_id=tenant1&page=0&limit=10&filter[city]=Jakarta
```

---

## Phase 5: Switch Data Source

### 5.1 Update Environment Configuration

```bash
# .env.development (keep using IndexedDB)
VITE_DATA_SOURCE=indexeddb
VITE_API_URL=http://localhost:8000

# .env.staging (test with API)
VITE_DATA_SOURCE=api
VITE_API_URL=http://staging-api.yourdomain.com

# .env.production (use API)
VITE_DATA_SOURCE=api
VITE_API_URL=https://api.yourdomain.com
```

### 5.2 Update main.tsx

```typescript
import { RepositoryProvider } from './providers/RepositoryProvider'

const config = {
  dataSource: (import.meta.env.VITE_DATA_SOURCE || 'indexeddb') as 'indexeddb' | 'api',
  apiConfig: import.meta.env.VITE_DATA_SOURCE === 'api' ? {
    baseURL: import.meta.env.VITE_API_URL,
    timeout: 30000,
    getToken: () => localStorage.getItem('authToken')
  } : undefined
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RepositoryProvider config={config}>
      <App />
    </RepositoryProvider>
  </React.StrictMode>
)
```

### 5.3 That's It!

**Zero changes needed in components!**

The data flow automatically switches from IndexedDB to API:

```typescript
// Same code works for both!
const service = useMosqueService()
const mosque = await service.createMosque(dto)  // IndexedDB or API?
```

---

## Phase 6: After Migration (API Only)

### Data Flow Diagram

```
┌────────────────────────────────────────┐
│     React Component                    │
│  (MosqueList.tsx)                      │
│                                        │
│  ❌ NO CHANGES                         │
└────────────┬─────────────────────────┘
             │
             │ useMosqueService()
             ↓
┌────────────────────────────────────────┐
│  MosqueService                         │
│  - Validations                         │
│  - Caching                             │
│  - Business Logic                      │
│                                        │
│  ❌ NO CHANGES                         │
└────────────┬─────────────────────────┘
             │
             │ this.repository.create()
             ↓
┌────────────────────────────────────────┐
│  IMosqueRepository                     │
│  (interface)                           │
│                                        │
│  ❌ NO CHANGES                         │
└────────────┬─────────────────────────┘
             │
             ↓
┌────────────────────────────────────────┐
│  MosqueAPIRepository                   │
│  (different impl, same interface!)     │
└────────────┬─────────────────────────┘
             │
             │ fetch() with Bearer token
             ↓
┌────────────────────────────────────────┐
│  Laravel REST API                      │
│  /api/mosques                          │
└────────────┬─────────────────────────┘
             │
             ↓
┌────────────────────────────────────────┐
│  PostgreSQL Database                   │
│  (server-side persistence)             │
└────────────────────────────────────────┘
```

### State Management Flow

```
Input: CreateMosqueDTO
  ↓
Service.createMosque(dto)
  ├─ Validate input (SAME CODE)
  ├─ Check business rules (SAME CODE)
  └─ Call repository.create() (SAME CODE)
    ↓
Repository.create(data)  ← NOW API instead of IndexedDB
  ├─ POST /api/mosques with Bearer token
  ├─ Handle HTTP errors
  └─ Return created mosque
    ↓
UI updates (SAME CODE)
  └─ Display new mosque
```

---

## Comparison: Before vs After

### Before (IndexedDB)

```typescript
// Component code - SAME
const handleCreate = async (dto: CreateMosqueDTO) => {
  const mosque = await service.createMosque(dto)
  setMosques([...mosques, mosque])
}

// Behind the scenes:
// IndexedDB → Sync Queue → ??? (never syncs in offline-only setup)
```

### After (API)

```typescript
// Component code - IDENTICAL
const handleCreate = async (dto: CreateMosqueDTO) => {
  const mosque = await service.createMosque(dto)
  setMosques([...mosques, mosque])
}

// Behind the scenes:
// API → PostgreSQL → Persistent server-side storage
```

---

## Testing During Migration

### Run Both in Parallel

```typescript
// Test both implementations
describe('MosqueRepository', () => {
  let indexeddbRepo: IMosqueRepository
  let apiRepo: IMosqueRepository

  beforeEach(() => {
    indexeddbRepo = new MosqueIndexedDBRepository()
    apiRepo = new MosqueAPIRepository({
      baseURL: 'http://localhost:8000',
      getToken: () => 'test-token'
    })
  })

  it('should behave identically', async () => {
    const dto = { name: 'Test', city: 'Jakarta' }

    // Both should work the same
    const m1 = await indexeddbRepo.create(dto, 'tenant1')
    const m2 = await apiRepo.create(dto, 'tenant2')  // different tenant

    expect(m1.name).toBe(m2.name)
    expect(m1.id).toBeDefined()
    expect(m2.id).toBeDefined()
  })
})
```

---

## Rollback Plan

If API fails, rollback is simple:

```typescript
// Just change this
const config = {
  dataSource: 'indexeddb'  // ← switch back
}

// Everything else works unchanged!
```

---

## Performance Considerations

### IndexedDB (Before)
- ✅ Instant reads (local)
- ✅ Works offline
- ✅ No network latency
- ❌ Limited storage (~50MB)
- ❌ No server-side persistence
- ❌ Manual sync logic

### API (After)
- ✅ Server-side persistence
- ✅ Unlimited storage
- ✅ Real-time sync
- ✅ Multi-device sync
- ❌ Network latency
- ❌ Depends on internet

### Optimize API Performance

```typescript
// 1. Enable caching in service
const service = new MosqueService(repository, {
  enableCaching: true,
  cacheExpiry: 5 * 60 * 1000  // 5 minutes
})

// 2. Use pagination
const { items, total } = await service.listMosques(
  undefined,
  { page: 0, limit: 20 }
)

// 3. Batch operations
await service.bulkCreateMosques(items)  // Better than loop

// 4. Filter server-side
const active = await service.repository.findActive(tenantId)
```

---

## Summary

| Aspect | Before | After |
|--------|--------|-------|
| Data Source | IndexedDB | REST API |
| Persistence | Local only | Server-side |
| Sync | Manual queue | Automatic |
| Offline | Full support | None |
| Network | No latency | Network dependent |
| Code changes | Zero | Zero |
| Deployment | Local | Server required |

**Key Takeaway**: Complete abstraction means zero changes to business logic or UI components!
