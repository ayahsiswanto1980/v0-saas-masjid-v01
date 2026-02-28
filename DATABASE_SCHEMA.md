# SaaS Masjid Multi-Tenant - Database Schema Design

## Ringkasan Eksekutif

Dokumentasi ini menjelaskan desain database relasional untuk **SaaS Manajemen Masjid Multi-Tenant** dengan 13 modul utama. Setiap tabel dirancang dengan `tenant_id` untuk isolasi data, menggunakan UUID sebagai primary key, dan mengikuti best practices PostgreSQL.

---

## 1. ARSITEKTUR MULTI-TENANT

### 1.1 Prinsip Isolasi Tenant

Setiap baris data dalam database terkait dengan satu tenant melalui `tenant_id`:

```
┌─────────────────────────────────────────┐
│ DATABASE (Shared)                       │
├─────────────────────────────────────────┤
│ TENANT_1 │ TENANT_2 │ TENANT_3          │
│ (Masjid A) │ (Masjid B) │ (Masjid C)    │
│ ├─ Users   │ ├─ Users   │ ├─ Users      │
│ ├─ Jamaah  │ ├─ Jamaah  │ ├─ Jamaah     │
│ └─ Donasi  │ └─ Donasi  │ └─ Donasi     │
└─────────────────────────────────────────┘
```

### 1.2 Strategi Isolasi

1. **Field-Level Isolation**: Setiap tabel memiliki `tenant_id`
2. **Foreign Key Enforcement**: Semua FK mereferensi `tenant(id)` dengan CASCADE delete
3. **Row Level Security (RLS)**: Policies di PostgreSQL mencegah cross-tenant access
4. **Application Logic**: Backend harus memvalidasi `tenant_id` pada setiap query

---

## 2. RELASI ANTAR TABEL

### 2.1 Entity Relationship Diagram (ERD)

```
tenant (Core)
  ├─→ users (1:M) [Administrators & Staff]
  ├─→ jamaah (1:M) [Congregation Members]
  ├─→ organisasi_takmir (1:M) [Committee Structure]
  │   └─→ organisasi_takmir_anggota (Committee Members Junction)
  │       └─→ jamaah (M:N) [Many members in committee]
  ├─→ ustadz (1:M) [Scholars/Teachers]
  │   └─→ jamaah (1:M) [Teacher is a member]
  │   └─→ jadwal_kajian (1:M) [Classes taught by this ustadz]
  ├─→ jadwal_kajian (1:M) [Regular Study Classes]
  │   └─→ isi_kajian (1:M) [Class Topics/Sessions]
  │   └─→ kehadiran (1:M) [Attendance Records]
  ├─→ donasi_kategori (1:M) [Donation Types]
  │   └─→ donasi (1:M) [Donation Records]
  ├─→ donasi (1:M) [Financial Contributions]
  ├─→ aset_masjid (1:M) [Mosque Assets/Inventory]
  ├─→ notulensi (1:M) [Meeting Minutes]
  ├─→ kehadiran (1:M) [Attendance Tracking]
  ├─→ agenda (1:M) [Events & Schedules]
  └─→ audit_log (1:M) [Change Tracking]
```

### 2.2 Penjelasan Relasi Detail

#### Relasi 1: Tenant → Users
- **Tipe**: 1:M (One tenant has many users)
- **Constraint**: `FOREIGN KEY (tenant_id) REFERENCES tenant(id) ON DELETE CASCADE`
- **Arti**: Ketika tenant dihapus, semua users ikut terhapus
- **Kegunaan**: Setiap admin/staff adalah user dari tenant tertentu

#### Relasi 2: Tenant → Jamaah
- **Tipe**: 1:M (One tenant has many members)
- **Constraint**: `FOREIGN KEY (tenant_id) REFERENCES tenant(id) ON DELETE CASCADE`
- **Optional FK**: `user_id` (jamaah dapat login sebagai user, atau hanya member)
- **Arti**: Jamaah adalah anggota jama'ah suatu masjid

#### Relasi 3: Tenant → Organisasi Takmir
- **Tipe**: 1:M (One tenant has many committee positions)
- **Struktur**: 3-table approach untuk flexibility
  1. `organisasi_takmir` - Posisi/jabatan (Ketua, Wakil, Bendahara, dll)
  2. `organisasi_takmir_anggota` - Junction table
  3. `jamaah` - Orang yang mengisi posisi tersebut

#### Relasi 4: Organisasi Takmir → Anggota → Jamaah
- **Tipe**: M:N (Many positions, many people, many people per position)
- **Timeline**: Setiap anggota memiliki `tanggal_mulai` dan `tanggal_akhir`
- **Status**: `is_active` untuk menentukan anggota saat ini vs historis

#### Relasi 5: Jamaah → Ustadz (1:1 optional)
- **Tipe**: 1:1 (Satu jamaah adalah ustadz, tapi tidak semua jamaah adalah ustadz)
- **Constraint**: `UNIQUE(tenant_id, jamaah_id)` - Satu jamaah = max satu record ustadz
- **Arti**: Ustadz dipilih dari anggota jamaah

#### Relasi 6: Ustadz → Jadwal Kajian
- **Tipe**: 1:M (Satu ustadz mengajar banyak kelas)
- **Constraint**: `FOREIGN KEY (ustadz_id) REFERENCES ustadz(id) ON DELETE RESTRICT`
- **Arti**: Tidak bisa delete ustadz kalau masih ada jadwal kajian

#### Relasi 7: Jadwal Kajian → Isi Kajian
- **Tipe**: 1:M (Satu jadwal memiliki banyak sesi)
- **Contoh**: "Tafsir Al-Quran Senin Malam" memiliki sesi tanggal 3 Feb, 10 Feb, 17 Feb, dst

#### Relasi 8: Jadwal Kajian → Kehadiran
- **Tipe**: 1:M (Banyak orang hadir di satu kelas)
- **Arti**: Tracking siapa saja yang hadir di setiap sesi

#### Relasi 9: Donasi Kategori → Donasi
- **Tipe**: 1:M (Banyak donasi untuk satu kategori)
- **Kategori**: Infaq, Zakat, Sodaqoh, Qurban, dll
- **Constraint**: ON DELETE RESTRICT (Tidak bisa hapus kategori kalau ada donasi)

#### Relasi 10: Donasi ← Jamaah (optional)
- **Tipe**: N:1 (Banyak donasi dari satu jamaah, atau donasi anonim)
- **Nullable**: jamaah_id boleh NULL untuk donasi anonim

#### Relasi 11: Notulensi ← Organisasi Takmir (optional)
- **Tipe**: N:1 (Rapat bisa diadakan oleh komite tertentu)
- **Nullable**: organisasi_takmir_id boleh NULL untuk rapat umum

#### Relasi 12: Kehadiran ← Jamaah
- **Tipe**: 1:M (Satu jamaah memiliki banyak record kehadiran)
- **Composite Index**: `(tenant_id, jamaah_id, tanggal_kehadiran)` untuk query efisien

---

## 3. PRIMARY KEYS (Kunci Utama)

Semua tabel menggunakan **UUID v4** sebagai primary key:

```sql
id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
```

### Keuntungan UUID vs Serial Integer:

| Aspek | UUID | Serial Int |
|-------|------|-----------|
| Keamanan | Tidak dapat ditebak | Mudah ditebak |
| Distribusi | Dapat generate offline | Harus terpusat |
| Scalability | Global unique | Lokal per sequence |
| Merging Data | Aman | Risiko duplicate |
| Reverse Engineering | Aman | Rentan |

### Implementasi:
```sql
-- PostgreSQL auto-generates UUID
INSERT INTO tenant (name, slug) VALUES ('Masjid Al-Barokah', 'masjid-al-barokah');
-- id akan auto-generate UUID unique
```

---

## 4. FOREIGN KEYS (Kunci Asing)

### 4.1 Tipe-Tipe Constraint

```sql
-- 1. CASCADE: Hapus parent → child otomatis terhapus
FOREIGN KEY (tenant_id) REFERENCES tenant(id) ON DELETE CASCADE

-- 2. RESTRICT: Tidak boleh hapus parent kalau ada child
FOREIGN KEY (ustadz_id) REFERENCES ustadz(id) ON DELETE RESTRICT

-- 3. SET NULL: Hapus parent → child FK menjadi NULL
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
```

### 4.2 FK Relationships dalam Project

| Parent Table | Child Table | Constraint | Alasan |
|--------------|------------|-----------|--------|
| tenant | users, jamaah, donasi, etc | CASCADE | Tenant delete = semua data tenant dihapus |
| ustadz | jadwal_kajian | RESTRICT | Ustadz aktif tidak boleh dihapus |
| donasi_kategori | donasi | RESTRICT | Kategori tidak boleh dihapus kalau ada donasi |
| user_id | kehadiran, notulensi, etc | SET NULL | User bisa resign, tapi riwayat tetap ada |
| jamaah_id | donasi, kehadiran, etc | SET NULL | Member bisa di-archive, riwayat tetap ada |

---

## 5. INDEXING STRATEGY

### 5.1 Index Types

```sql
-- 1. Single Column Index (untuk WHERE clause sederhana)
CREATE INDEX idx_users_email ON users(email);

-- 2. Composite Index (untuk queries multi-field)
CREATE INDEX idx_users_tenant_role ON users(tenant_id, role);

-- 3. Partial Index (untuk kondisi spesifik)
CREATE INDEX idx_aset_masjid_aktif ON aset_masjid(tenant_id) 
  WHERE status = 'aktif';
```

### 5.2 Indexing Plan per Modul

#### A. Users Table
```sql
idx_users_tenant_id           -- Lookup user by tenant
idx_users_email               -- Login by email
idx_users_role                -- Filter by role
idx_users_status              -- Filter active/inactive
idx_users_created_at          -- Sort by date
```

**Alasan**: User queries sering filter by tenant, role, email, dan status

#### B. Jamaah Table
```sql
idx_jamaah_tenant_id          -- Tenant filter
idx_jamaah_user_id            -- User relationship
idx_jamaah_nomor_identitas    -- Lookup by KTP/SIM
idx_jamaah_status_keanggotaan -- Filter active members
idx_jamaah_tanggal_daftar     -- Sorting by date
```

#### C. Donasi Table
```sql
idx_donasi_tenant_id          -- Tenant filter
idx_donasi_jamaah_id          -- Member donations
idx_donasi_kategori_id        -- Category donations
idx_donasi_tanggal            -- Date range queries
idx_donasi_jumlah             -- Amount sorting/filtering
idx_donasi_metode             -- Payment method
```

**Contoh Query Dioptimasi**:
```sql
-- Query dengan index (FAST)
SELECT SUM(jumlah) FROM donasi 
WHERE tenant_id = $1 AND tanggal_donasi BETWEEN $2 AND $3;

-- Without index (SLOW - full scan)
SELECT SUM(jumlah) FROM donasi 
WHERE EXTRACT(YEAR FROM tanggal_donasi) = 2025;
```

#### D. Kehadiran Table
```sql
idx_kehadiran_tenant_id       -- Tenant filter
idx_kehadiran_jamaah_id       -- Member attendance
idx_kehadiran_tanggal         -- Date filtering
idx_kehadiran_status          -- Attendance status
idx_kehadiran_composite       -- Most common query
```

**Composite Index Alasan**:
```sql
-- Frequent query: Attendance for member on specific date
SELECT * FROM kehadiran 
WHERE tenant_id = $1 AND jamaah_id = $2 AND tanggal_kehadiran = $3;

-- Composite index mempercepat query ini
idx_kehadiran_composite ON kehadiran(tenant_id, jamaah_id, tanggal_kehadiran)
```

#### E. Agenda Table
```sql
idx_agenda_tenant_id          -- Tenant filter
idx_agenda_tanggal_mulai      -- Sort/filter by date
idx_agenda_tipe               -- Filter by type
idx_agenda_status             -- Active/completed
```

### 5.3 Index Maintenance

```sql
-- Analyze table untuk update statistics
ANALYZE kehadiran;

-- Reindex jika ada bloat
REINDEX INDEX idx_kehadiran_tenant_id;

-- Check unused indexes
SELECT * FROM pg_stat_user_indexes 
WHERE idx_scan = 0 ORDER BY relpages DESC;
```

---

## 6. TENANT ISOLATION - IMPLEMENTASI

### 6.1 Row Level Security (RLS)

RLS memastikan **di level database** bahwa satu user hanya bisa akses data tenant mereka:

```sql
-- Enable RLS di semua tabel
ALTER TABLE jamaah ENABLE ROW LEVEL SECURITY;

-- Policy: User hanya lihat jamaah di tenant mereka
CREATE POLICY tenant_isolation_select ON jamaah
  FOR SELECT 
  USING (tenant_id = (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  ));

-- Policy: User hanya insert jamaah di tenant mereka
CREATE POLICY tenant_isolation_insert ON jamaah
  FOR INSERT 
  WITH CHECK (tenant_id = (
    SELECT tenant_id FROM users WHERE id = auth.uid()
  ));
```

### 6.2 Application-Level Enforcement

Setiap query di application harus include `tenant_id`:

```typescript
// ✅ AMAN - dengan tenant_id filter
const getJamaah = async (userId: string, tenantId: string) => {
  const user = await db.users.findOne(userId);
  if (user.tenant_id !== tenantId) throw new Error("Unauthorized");
  
  return await db.jamaah.find({ tenant_id: tenantId });
};

// ❌ TIDAK AMAN - tanpa tenant_id
const getJamaah = async (jamaahId: string) => {
  return await db.jamaah.findOne(jamaahId); // Bisa expose data tenant lain!
};
```

### 6.3 Multi-Layer Isolation Checklist

```
✓ Database Layer (RLS Policies)
✓ API Layer (tenant_id validation)
✓ Query Layer (WHERE tenant_id = $1)
✓ Index Layer (composite index includes tenant_id)
✓ Audit Layer (log all cross-tenant access attempts)
```

---

## 7. DIAGRAM ALUR DATA

### 7.1 Alur Registrasi Jamaah

```
User mendaftar
    ↓
→ INSERT users (tenant_id, email, password)
→ INSERT jamaah (tenant_id, user_id, nama_lengkap)
    ↓
Jamaah sekarang ada dalam sistem
```

### 7.2 Alur Donasi

```
Jamaah melakukan donasi
    ↓
→ User pilih kategori (donasi_kategori)
→ INPUT jumlah donasi
    ↓
→ INSERT donasi (tenant_id, jamaah_id, kategori_id, jumlah, tanggal)
    ↓
Revenue tracking:
  SELECT SUM(jumlah) FROM donasi 
  WHERE tenant_id = $1 AND kategori_id = $2
```

### 7.3 Alur Kajian & Kehadiran

```
1. SETUP JADWAL
   → INSERT jadwal_kajian (ustadz, hari, waktu)

2. SESI MENGAJAR
   → INSERT isi_kajian (jadwal_kajian_id, tanggal, topik)

3. RECORDING KEHADIRAN
   → INSERT kehadiran (jamaah_id, jadwal_kajian_id, tanggal, status)

4. LAPORAN
   → SELECT COUNT(*) FROM kehadiran 
     WHERE jadwal_kajian_id = $1 
     GROUP BY jamaah_id
```

---

## 8. QUERY CONTOH (SQL)

### 8.1 Dashboard Donasi

```sql
-- Total donasi per kategori (bulan ini)
SELECT 
  dk.nama_kategori,
  COUNT(*) as jumlah_transaksi,
  SUM(d.jumlah) as total_donasi
FROM donasi d
JOIN donasi_kategori dk ON d.kategori_id = dk.id
WHERE d.tenant_id = $1 
  AND DATE_TRUNC('month', d.tanggal_donasi) = DATE_TRUNC('month', CURRENT_DATE)
GROUP BY dk.nama_kategori
ORDER BY total_donasi DESC;
```

### 8.2 Laporan Kehadiran

```sql
-- Kehadiran jamaah per kajian (bulan ini)
SELECT 
  j.nama_lengkap,
  jk.nama_kajian,
  COUNT(CASE WHEN k.status_kehadiran = 'hadir' THEN 1 END) as hadir,
  COUNT(CASE WHEN k.status_kehadiran = 'izin' THEN 1 END) as izin,
  COUNT(CASE WHEN k.status_kehadiran = 'alpa' THEN 1 END) as alpa
FROM kehadiran k
JOIN jamaah j ON k.jamaah_id = j.id
JOIN jadwal_kajian jk ON k.jadwal_kajian_id = jk.id
WHERE k.tenant_id = $1 
  AND DATE_TRUNC('month', k.tanggal_kehadiran) = DATE_TRUNC('month', CURRENT_DATE)
GROUP BY j.nama_lengkap, jk.nama_kajian
ORDER BY j.nama_lengkap, jk.nama_kajian;
```

### 8.3 Struktur Organisasi Takmir

```sql
-- Anggota takmir yang masih aktif
SELECT 
  ot.nama_posisi,
  j.nama_lengkap,
  ota.tanggal_mulai,
  ota.tanggal_akhir
FROM organisasi_takmir_anggota ota
JOIN organisasi_takmir ot ON ota.organisasi_id = ot.id
JOIN jamaah j ON ota.jamaah_id = j.id
WHERE ota.tenant_id = $1 
  AND ota.is_active = TRUE
ORDER BY ot.urutan;
```

---

## 9. TABEL RELASI QUICK REFERENCE

| Tabel | tenant_id | PK | FK | Tujuan |
|-------|-----------|----|----|--------|
| tenant | - | id | - | Induk semua data |
| users | ✓ | id | tenant | Login & role |
| jamaah | ✓ | id | tenant, user | Member profil |
| donasi_kategori | ✓ | id | tenant | Tipe donasi |
| donasi | ✓ | id | tenant, jamaah, kategori | Transaksi donasi |
| organisasi_takmir | ✓ | id | tenant | Posisi komite |
| organisasi_takmir_anggota | ✓ | id | tenant, organisasi, jamaah | Anggota komite |
| ustadz | ✓ | id | tenant, jamaah | Data guru |
| jadwal_kajian | ✓ | id | tenant, ustadz | Jadwal kelas |
| isi_kajian | ✓ | id | tenant, jadwal_kajian | Materi kelas |
| aset_masjid | ✓ | id | tenant | Inventaris |
| notulensi | ✓ | id | tenant, organisasi, user | Rapat |
| kehadiran | ✓ | id | tenant, jamaah, jadwal_kajian | Presensi |
| agenda | ✓ | id | tenant, user | Event |
| audit_log | ✓ | id | tenant, user | Audit trail |

---

## 10. MIGRATION & DEPLOYMENT

### 10.1 Urutan Eksekusi Script

```bash
# 1. Enable extensions
psql -U postgres -f scripts/extensions.sql

# 2. Create tables (dalam urutan dependency)
psql -U postgres -f scripts/schema.sql

# 3. Enable RLS & create policies
psql -U postgres -f scripts/rls-policies.sql

# 4. Seed initial data (optional)
psql -U postgres -f scripts/seed.sql
```

### 10.2 Backup & Restore

```bash
# Backup schema
pg_dump --schema-only -d mosque_saas > backup-schema.sql

# Restore
psql -d mosque_saas < backup-schema.sql
```

---

## 11. PERFORMANCE TIPS

### 11.1 Queries Lambat - Debugging

```sql
-- Analyze query performance
EXPLAIN ANALYZE 
SELECT * FROM kehadiran 
WHERE tenant_id = '123' AND tanggal_kehadiran > '2025-01-01';

-- Hasil: Jika "Seq Scan" (tidak ada index), tambahkan index
```

### 11.2 Materialized Views untuk Report

```sql
-- Create: Cache hasil query kompleks
CREATE MATERIALIZED VIEW v_donasi_summary AS
SELECT 
  tenant_id,
  DATE_TRUNC('month', tanggal_donasi) as bulan,
  SUM(jumlah) as total
FROM donasi
GROUP BY tenant_id, DATE_TRUNC('month', tanggal_donasi);

-- Refresh: Setiap hari jam 02:00
REFRESH MATERIALIZED VIEW CONCURRENTLY v_donasi_summary;
```

---

## 12. KESIMPULAN

Skema database ini dirancang untuk:

✅ **Multi-tenant isolation** - Setiap masjid data terpisah
✅ **Relational integrity** - Foreign keys memastikan konsistensi
✅ **Performance** - Indexes di tempat yang tepat
✅ **Security** - RLS + application-level validation
✅ **Scalability** - UUID + tenant_id untuk growth
✅ **Audit trail** - Semua perubahan tercatat

Implementasi dengan diikuti akan menghasilkan sistem yang aman, cepat, dan mudah di-maintain.
