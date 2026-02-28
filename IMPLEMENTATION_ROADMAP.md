# Implementation Roadmap - State Stack Completion

## Phase 1: Foundation (Weeks 1-2)

### 1.1 Database & Type System
**Goal:** Align database schema with frontend types

#### Tasks:
```typescript
// 1. Create comprehensive type definitions
src/types/index.ts - Add all missing types:

interface Jamaah {
  id: string;
  tenantId: string;
  namaLengkap: string;          // database: nama_lengkap
  nomorIdentitas: string;        // database: nomor_identitas
  jenisIdentitas: string;        // KTP, SIM, Passport
  tempatLahir: string;
  tanggalLahir: Date;
  jenisKelamin: 'M' | 'F';
  agama: string;
  statusPernikahan: 'lajang' | 'menikah' | 'cerai';
  pekerjaan: string;
  pendidikanTerakhir: string;
  nomorTelepon: string;
  email: string;
  alamat: string;
  rtRw: string;
  kelurahan: string;
  kecamatan: string;
  kota: string;
  provinsi: string;
  kodePosisi: string;
  statusKeanggotaan: 'active' | 'inactive' | 'suspended';
  tanggalDaftar: Date;
  userId?: string; // link to user account
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

interface Donasi {
  id: string;
  tenantId: string;
  jamaahId: string;
  kategoriId: string;
  jumlah: number;
  tanggalDonasi: Date;
  metodePembayaran: 'tunai' | 'transfer' | 'cek';
  nomorReferensi: string;
  keterangan: string;
  diterimaPOleh: string; // user_id
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// ... continue for all entities
```

#### Verification:
```bash
# Check field mapping
diff <(database schema fields) <(typescript interfaces)
# Should show 100% alignment
```

### 1.2 Database Migration Framework
**Goal:** Create reproducible database deployments

#### Tasks:
```typescript
// Create migration system
scripts/
  ├── migrations/
  │   ├── 001_initial_schema.sql
  │   ├── 002_enable_rls.sql
  │   ├── 003_create_triggers.sql
  │   └── 004_seed_data.sql
  ├── migrate.ts (migration runner)
  └── rollback.ts (rollback runner)

// Example migration file structure:
-- migrations/001_initial_schema.sql
-- @description: Create base schema
-- @version: 1
-- @rollback: true

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS tenant (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  -- ...
);

-- ... rest of schema
```

#### Migration Runner Implementation:
```typescript
// scripts/migrate.ts
import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';

interface Migration {
  version: number;
  filename: string;
  content: string;
  applied: boolean;
}

class MigrationRunner {
  private pool: Pool;
  private migrationsDir = './scripts/migrations';

  async init() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Create migrations tracking table
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        version INT UNIQUE NOT NULL,
        filename VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        duration_ms INT
      )
    `);
  }

  async getMigrations(): Promise<Migration[]> {
    const files = fs.readdirSync(this.migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    return files.map(filename => {
      const version = parseInt(filename.split('_')[0]);
      const content = fs.readFileSync(
        path.join(this.migrationsDir, filename),
        'utf-8'
      );
      return { version, filename, content, applied: false };
    });
  }

  async getAppliedMigrations(): Promise<number[]> {
    const result = await this.pool.query(
      'SELECT version FROM _migrations ORDER BY version'
    );
    return result.rows.map(r => r.version);
  }

  async run() {
    const migrations = await this.getMigrations();
    const applied = await this.getAppliedMigrations();

    for (const migration of migrations) {
      if (!applied.includes(migration.version)) {
        console.log(`Running migration: ${migration.filename}`);
        const start = Date.now();

        try {
          // Extract SQL statements
          const statements = migration.content
            .split(';')
            .map(s => s.trim())
            .filter(s => s && !s.startsWith('--'));

          for (const statement of statements) {
            await this.pool.query(statement);
          }

          const duration = Date.now() - start;

          // Track applied migration
          await this.pool.query(
            'INSERT INTO _migrations (version, filename, duration_ms) VALUES ($1, $2, $3)',
            [migration.version, migration.filename, duration]
          );

          console.log(`✅ ${migration.filename} (${duration}ms)`);
        } catch (error) {
          console.error(`❌ Failed: ${migration.filename}`, error);
          throw error;
        }
      }
    }

    console.log('\n✅ All migrations applied successfully');
    await this.pool.end();
  }
}

const runner = new MigrationRunner();
runner.init().then(() => runner.run());
```

### 1.3 Update Package.json Scripts
```json
{
  "scripts": {
    "db:migrate": "ts-node scripts/migrate.ts",
    "db:rollback": "ts-node scripts/rollback.ts",
    "db:seed": "ts-node scripts/seed.ts",
    "db:setup": "npm run db:migrate && npm run db:seed",
    "db:reset": "npm run db:rollback && npm run db:setup"
  }
}
```

---

## Phase 2: Backend Implementation (Weeks 2-3)

### 2.1 API Routes for Core Entities
**Goal:** Create Next.js API routes for CRUD operations

#### Structure:
```
app/api/
├── auth/
│   ├── login/route.ts
│   ├── logout/route.ts
│   ├── register/route.ts
│   └── me/route.ts
├── jamaah/
│   ├── route.ts (GET/POST)
│   └── [id]/route.ts (GET/PUT/DELETE)
├── donasi/
│   ├── route.ts
│   └── [id]/route.ts
├── middleware.ts (auth, tenant isolation)
└── types.ts
```

#### Example Implementation:
```typescript
// app/api/jamaah/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Pool } from '@neondatabase/serverless';
import { verifyAuth, getTenantId } from '@/lib/auth';
import { jamaahSchema } from '@/lib/validation';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// GET /api/jamaah?page=1&limit=10&search=name
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = getTenantId(user);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';

    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM jamaah 
       WHERE tenant_id = $1 AND 
             (nama_lengkap ILIKE $2 OR email ILIKE $2)`,
      [tenantId, `%${search}%`]
    );

    const total = parseInt(countResult.rows[0].total);

    // Get paginated data
    const result = await pool.query(
      `SELECT * FROM jamaah 
       WHERE tenant_id = $1 AND 
             (nama_lengkap ILIKE $2 OR email ILIKE $2)
       ORDER BY tanggal_daftar DESC
       LIMIT $3 OFFSET $4`,
      [tenantId, `%${search}%`, limit, offset]
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('GET /api/jamaah error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/jamaah
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = getTenantId(user);
    const body = await request.json();

    // Validate input
    const validatedData = jamaahSchema.parse(body);

    // Insert into database
    const result = await pool.query(
      `INSERT INTO jamaah (
        tenant_id, nama_lengkap, nomor_identitas, jenis_identitas,
        tempat_lahir, tanggal_lahir, jenis_kelamin, agama,
        status_pernikahan, pekerjaan, pendidikan_terakhir,
        nomor_telepon, email, alamat, rt_rw, kelurahan, kecamatan,
        kota, provinsi, kode_pos, status_keanggotaan
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *`,
      [
        tenantId,
        validatedData.namaLengkap,
        validatedData.nomorIdentitas,
        validatedData.jenisIdentitas,
        validatedData.tempatLahir,
        validatedData.tanggalLahir,
        validatedData.jenisKelamin,
        validatedData.agama,
        validatedData.statusPernikahan,
        validatedData.pekerjaan,
        validatedData.pendidikanTerakhir,
        validatedData.nomorTelepon,
        validatedData.email,
        validatedData.alamat,
        validatedData.rtRw,
        validatedData.kelurahan,
        validatedData.kecamatan,
        validatedData.kota,
        validatedData.provinsi,
        validatedData.kodePosisi,
        validatedData.statusKeanggotaan,
      ]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    console.error('POST /api/jamaah error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### 2.2 Authentication Implementation
**Goal:** Replace mock login with real JWT-based auth

```typescript
// lib/auth.ts
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Pool } from '@neondatabase/serverless';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const JWT_SECRET = process.env.JWT_SECRET!;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(userId: string, tenantId: string): string {
  return jwt.sign(
    { userId, tenantId, iat: Math.floor(Date.now() / 1000) },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export async function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as {
      userId: string;
      tenantId: string;
      iat: number;
    };
  } catch (error) {
    return null;
  }
}

export async function verifyAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7);
  return verifyToken(token);
}

export function getTenantId(user: any): string {
  return user.tenantId;
}
```

---

## Phase 3: Repository & Service Completion (Weeks 3-4)

### 3.1 Create Missing Repositories
```typescript
// src/modules/donasi/donasiRepository.ts
import { BaseRepository } from '@/repositories/BaseRepository';

export interface Donasi {
  id: string;
  tenantId: string;
  jamaahId: string;
  kategoriId: string;
  jumlah: number;
  tanggalDonasi: Date;
  metodePembayaran: 'tunai' | 'transfer' | 'cek';
  nomorReferensi: string;
  keterangan?: string;
  diterimaOleh?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export class DonasiRepository extends BaseRepository<Donasi> {
  protected storeName = 'donasi';
  protected apiEndpoint = '/donasi';

  // Add custom methods
  async getByKategori(tenantId: string, kategoriId: string): Promise<Donasi[]> {
    const all = await this.readAll(tenantId);
    return all.data.filter(d => d.kategoriId === kategoriId);
  }

  async getTotalByPeriod(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const all = await this.readAll(tenantId);
    return all.data
      .filter(d => d.tanggalDonasi >= startDate && d.tanggalDonasi <= endDate)
      .reduce((sum, d) => sum + d.jumlah, 0);
  }
}

export const donasiRepository = new DonasiRepository();
```

### 3.2 Create Missing Services
```typescript
// src/modules/donasi/donasiService.ts
import { Donasi, donasiRepository } from './donasiRepository';
import { useDonasiStore } from '@/stores/donasiStore';
import { PaginationParams } from '@/types';

export class DonasiService {
  async fetchDonasi(tenantId: string, params?: PaginationParams): Promise<void> {
    const store = useDonasiStore.getState();
    store.setLoading(true);
    store.setError(undefined);

    try {
      const result = await donasiRepository.readAll(tenantId, params);
      store.setDonasi(result.data);
      store.setTotal(result.total);
      if (params) store.setPagination(params);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Gagal mengambil data donasi';
      store.setError(message);
    } finally {
      store.setLoading(false);
    }
  }

  async createDonasi(
    tenantId: string,
    donasi: Omit<Donasi, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Donasi> {
    const store = useDonasiStore.getState();
    const newDonasi: Donasi = {
      ...donasi,
      id: `donasi-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const created = await donasiRepository.create(newDonasi);
    store.addDonasi(created);
    return created;
  }

  async updateDonasi(id: string, updates: Partial<Donasi>): Promise<Donasi> {
    const store = useDonasiStore.getState();
    const updated = await donasiRepository.update(id, updates);
    store.updateDonasi(updated);
    return updated;
  }

  async deleteDonasi(id: string): Promise<void> {
    const store = useDonasiStore.getState();
    await donasiRepository.delete(id);
    store.deleteDonasi(id);
  }

  async syncDonasi(tenantId: string): Promise<void> {
    await donasiRepository.sync(tenantId);
    await this.fetchDonasi(tenantId);
  }
}

export const donasiService = new DonasiService();
```

### 3.3 Create Missing Stores
```typescript
// src/stores/donasiStore.ts
import { create } from 'zustand';
import { PaginationParams } from '@/types';

export interface Donasi {
  // ... all fields
}

interface DonasiStore {
  donasi: Donasi[];
  pagination: PaginationParams;
  total: number;
  isLoading: boolean;
  error?: string;
  filters: {
    kategoriId?: string;
    startDate?: Date;
    endDate?: Date;
  };

  setDonasi: (donasi: Donasi[]) => void;
  addDonasi: (donasi: Donasi) => void;
  updateDonasi: (donasi: Donasi) => void;
  deleteDonasi: (id: string) => void;
  setPagination: (params: PaginationParams) => void;
  setLoading: (loading: boolean) => void;
  setError: (error?: string) => void;
  setTotal: (total: number) => void;
  setFilters: (filters: Partial<DonasiStore['filters']>) => void;
  clear: () => void;
}

export const useDonasiStore = create<DonasiStore>((set) => ({
  donasi: [],
  pagination: { page: 1, limit: 10 },
  total: 0,
  isLoading: false,
  error: undefined,
  filters: {},

  // ... all methods
}));
```

---

## Phase 4: Validation & Error Handling (Week 4)

### 4.1 Create Zod Schemas
```typescript
// lib/validation.ts
import { z } from 'zod';

export const jamaahSchema = z.object({
  namaLengkap: z.string().min(3, 'Nama minimal 3 karakter'),
  nomorIdentitas: z.string().optional(),
  jenisIdentitas: z.enum(['KTP', 'SIM', 'Passport']).optional(),
  tempatLahir: z.string().optional(),
  tanggalLahir: z.coerce.date().optional(),
  jenisKelamin: z.enum(['M', 'F']).optional(),
  agama: z.string().optional(),
  statusPernikahan: z.enum(['lajang', 'menikah', 'cerai']).optional(),
  pekerjaan: z.string().optional(),
  pendidikanTerakhir: z.string().optional(),
  nomorTelepon: z.string().regex(/^(\+62|0)[0-9]{9,12}$/).optional(),
  email: z.string().email().optional(),
  alamat: z.string().optional(),
  statusKeanggotaan: z.enum(['active', 'inactive', 'suspended']),
});

export type JamaahInput = z.infer<typeof jamaahSchema>;
```

### 4.2 Error Handling Middleware
```typescript
// lib/error-handler.ts
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function createErrorResponse(error: unknown) {
  if (error instanceof ApiError) {
    return {
      success: false,
      error: error.message,
      code: error.code,
      statusCode: error.statusCode,
    };
  }

  if (error instanceof z.ZodError) {
    return {
      success: false,
      error: 'Validation error',
      code: 'VALIDATION_ERROR',
      details: error.errors,
      statusCode: 400,
    };
  }

  console.error('Unexpected error:', error);
  return {
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    statusCode: 500,
  };
}
```

---

## Phase 5: Testing & Deployment (Week 5+)

### 5.1 Unit Tests
```typescript
// tests/unit/repositories/jamaahRepository.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { JamaahRepository } from '@/modules/jamaah/jamaahRepository';
import { indexedDBDatasource } from '@/datasource/IndexedDBDatasource';

describe('JamaahRepository', () => {
  let repository: JamaahRepository;

  beforeEach(async () => {
    await indexedDBDatasource.init();
    repository = new JamaahRepository();
  });

  it('should create a jamaah member', async () => {
    const jamaah = {
      id: 'test-1',
      tenantId: 'tenant-1',
      nama: 'Test User',
      email: 'test@example.com',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const created = await repository.create(jamaah);
    expect(created.id).toBe('test-1');
    expect(created.nama).toBe('Test User');
  });

  it('should read a jamaah member', async () => {
    // Setup
    const jamaah = { /* ... */ };
    await repository.create(jamaah);

    // Test
    const read = await repository.read('test-1');
    expect(read).toEqual(jamaah);
  });

  // ... more tests
});
```

### 5.2 Integration Tests
```typescript
// tests/integration/api/jamaah.test.ts
import { describe, it, expect } from 'vitest';
import { Pool } from '@neondatabase/serverless';

describe('Jamaah API', () => {
  let pool: Pool;

  beforeAll(() => {
    pool = new Pool({
      connectionString: process.env.DATABASE_TEST_URL,
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  it('should create and retrieve jamaah', async () => {
    // Create
    const response = await fetch('/api/jamaah', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ namaLengkap: 'Test' }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);

    // Retrieve
    const getResponse = await fetch(`/api/jamaah/${data.data.id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    expect(getResponse.status).toBe(200);
  });
});
```

---

## Summary Timeline

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| Phase 1 | Week 1-2 | Types, migrations, framework |
| Phase 2 | Week 2-3 | API routes, authentication |
| Phase 3 | Week 3-4 | Repositories, services, stores |
| Phase 4 | Week 4 | Validation, error handling |
| Phase 5 | Week 5+ | Testing, deployment, optimization |

**MVP Readiness:** End of Phase 2 (basic CRUD working)  
**Production Ready:** End of Phase 5 (complete, tested, deployed)

