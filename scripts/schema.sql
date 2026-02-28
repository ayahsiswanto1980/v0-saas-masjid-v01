-- ============================================================================
-- MOSQUE MANAGEMENT SAAS - MULTI-TENANT DATABASE SCHEMA
-- ============================================================================
-- Multi-tenant PostgreSQL schema with UUID identifiers and proper isolation
-- Created: 2025-02-28
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. TENANT TABLE (Core multi-tenant foundation)
-- ============================================================================
CREATE TABLE tenant (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  subscription_tier VARCHAR(50) DEFAULT 'basic', -- basic, professional, enterprise
  max_users INT DEFAULT 10,
  storage_limit_mb BIGINT DEFAULT 5120, -- 5GB default
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_tenant_slug ON tenant(slug);
CREATE INDEX idx_tenant_is_active ON tenant(is_active);
CREATE INDEX idx_tenant_created_at ON tenant(created_at);

-- ============================================================================
-- 2. USERS TABLE (Authentication & Authorization)
-- ============================================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  full_name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255),
  role VARCHAR(50) NOT NULL, -- admin, manager, staff, viewer
  status VARCHAR(50) DEFAULT 'active', -- active, inactive, suspended
  last_login_at TIMESTAMP WITH TIME ZONE,
  email_verified BOOLEAN DEFAULT FALSE,
  email_verified_at TIMESTAMP WITH TIME ZONE,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT unique_tenant_email UNIQUE(tenant_id, email)
);

CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(tenant_id, role);
CREATE INDEX idx_users_status ON users(tenant_id, status);
CREATE INDEX idx_users_created_at ON users(tenant_id, created_at);

-- ============================================================================
-- 3. JAMAAH TABLE (Mosque members/congregation)
-- ============================================================================
CREATE TABLE jamaah (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  nama_lengkap VARCHAR(255) NOT NULL,
  nomor_identitas VARCHAR(50), -- KTP/SIM/Passport
  jenis_identitas VARCHAR(50), -- KTP, SIM, Passport, etc
  tempat_lahir VARCHAR(255),
  tanggal_lahir DATE,
  jenis_kelamin CHAR(1), -- M/F
  agama VARCHAR(50),
  status_pernikahan VARCHAR(50), -- lajang, menikah, cerai
  pekerjaan VARCHAR(255),
  pendidikan_terakhir VARCHAR(100),
  nomor_telepon VARCHAR(20),
  email VARCHAR(255),
  alamat TEXT,
  rt_rw VARCHAR(20),
  kelurahan VARCHAR(100),
  kecamatan VARCHAR(100),
  kota VARCHAR(100),
  provinsi VARCHAR(100),
  kode_pos VARCHAR(10),
  status_keanggotaan VARCHAR(50) DEFAULT 'active', -- active, inactive, suspended
  tanggal_daftar DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_jamaah_tenant_id ON jamaah(tenant_id);
CREATE INDEX idx_jamaah_user_id ON jamaah(user_id);
CREATE INDEX idx_jamaah_nomor_identitas ON jamaah(tenant_id, nomor_identitas);
CREATE INDEX idx_jamaah_status_keanggotaan ON jamaah(tenant_id, status_keanggotaan);
CREATE INDEX idx_jamaah_tanggal_daftar ON jamaah(tenant_id, tanggal_daftar);

-- ============================================================================
-- 4. DONASI_KATEGORI TABLE (Donation categories)
-- ============================================================================
CREATE TABLE donasi_kategori (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  nama_kategori VARCHAR(100) NOT NULL,
  deskripsi TEXT,
  urutan INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_tenant_kategori UNIQUE(tenant_id, nama_kategori)
);

CREATE INDEX idx_donasi_kategori_tenant_id ON donasi_kategori(tenant_id);
CREATE INDEX idx_donasi_kategori_is_active ON donasi_kategori(tenant_id, is_active);

-- ============================================================================
-- 5. DONASI TABLE (Donations/Financial contributions)
-- ============================================================================
CREATE TABLE donasi (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  jamaah_id UUID REFERENCES jamaah(id) ON DELETE SET NULL,
  kategori_id UUID NOT NULL REFERENCES donasi_kategori(id) ON DELETE RESTRICT,
  jumlah DECIMAL(15, 2) NOT NULL,
  tanggal_donasi DATE NOT NULL DEFAULT CURRENT_DATE,
  metode_pembayaran VARCHAR(50), -- tunai, transfer, cek
  nomor_referensi VARCHAR(100),
  keterangan TEXT,
  diterima_oleh UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_donasi_tenant_id ON donasi(tenant_id);
CREATE INDEX idx_donasi_jamaah_id ON donasi(jamaah_id);
CREATE INDEX idx_donasi_kategori_id ON donasi(kategori_id);
CREATE INDEX idx_donasi_tanggal ON donasi(tenant_id, tanggal_donasi);
CREATE INDEX idx_donasi_jumlah ON donasi(tenant_id, jumlah);
CREATE INDEX idx_donasi_metode ON donasi(tenant_id, metode_pembayaran);

-- ============================================================================
-- 6. ORGANISASI_TAKMIR TABLE (Mosque committee/organization)
-- ============================================================================
CREATE TABLE organisasi_takmir (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  nama_posisi VARCHAR(100) NOT NULL,
  deskripsi TEXT,
  tanggal_mulai DATE,
  tanggal_akhir DATE,
  urutan INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_tenant_posisi UNIQUE(tenant_id, nama_posisi)
);

CREATE INDEX idx_organisasi_takmir_tenant_id ON organisasi_takmir(tenant_id);
CREATE INDEX idx_organisasi_takmir_is_active ON organisasi_takmir(tenant_id, is_active);

-- Junction table: Committee members
CREATE TABLE organisasi_takmir_anggota (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  organisasi_id UUID NOT NULL REFERENCES organisasi_takmir(id) ON DELETE CASCADE,
  jamaah_id UUID NOT NULL REFERENCES jamaah(id) ON DELETE CASCADE,
  tanggal_mulai DATE NOT NULL DEFAULT CURRENT_DATE,
  tanggal_akhir DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_anggota UNIQUE(tenant_id, organisasi_id, jamaah_id)
);

CREATE INDEX idx_organisasi_anggota_tenant_id ON organisasi_takmir_anggota(tenant_id);
CREATE INDEX idx_organisasi_anggota_organisasi_id ON organisasi_takmir_anggota(organisasi_id);
CREATE INDEX idx_organisasi_anggota_jamaah_id ON organisasi_takmir_anggota(jamaah_id);

-- ============================================================================
-- 7. USTADZ TABLE (Islamic scholars/teachers)
-- ============================================================================
CREATE TABLE ustadz (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  jamaah_id UUID NOT NULL REFERENCES jamaah(id) ON DELETE CASCADE,
  gelar_akademik VARCHAR(100),
  spesialisasi TEXT,
  bio TEXT,
  biografi_panjang TEXT,
  foto_url TEXT,
  sertifikasi TEXT,
  status_aktif BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT unique_tenant_ustadz UNIQUE(tenant_id, jamaah_id)
);

CREATE INDEX idx_ustadz_tenant_id ON ustadz(tenant_id);
CREATE INDEX idx_ustadz_status_aktif ON ustadz(tenant_id, status_aktif);

-- ============================================================================
-- 8. JADWAL_KAJIAN TABLE (Class/Study schedules)
-- ============================================================================
CREATE TABLE jadwal_kajian (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  ustadz_id UUID NOT NULL REFERENCES ustadz(id) ON DELETE RESTRICT,
  nama_kajian VARCHAR(255) NOT NULL,
  deskripsi TEXT,
  hari_dalam_seminggu VARCHAR(50), -- Senin, Selasa, etc or day number (1-7)
  waktu_mulai TIME NOT NULL,
  waktu_selesai TIME NOT NULL,
  lokasi VARCHAR(255),
  tingkat VARCHAR(100), -- Pemula, Menengah, Lanjut
  kapasitas INT,
  status VARCHAR(50) DEFAULT 'active', -- active, inactive, completed
  tanggal_mulai DATE,
  tanggal_akhir DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_jadwal_kajian_tenant_id ON jadwal_kajian(tenant_id);
CREATE INDEX idx_jadwal_kajian_ustadz_id ON jadwal_kajian(ustadz_id);
CREATE INDEX idx_jadwal_kajian_hari ON jadwal_kajian(tenant_id, hari_dalam_seminggu);
CREATE INDEX idx_jadwal_kajian_status ON jadwal_kajian(tenant_id, status);

-- ============================================================================
-- 9. ISI_KAJIAN TABLE (Class content/topics)
-- ============================================================================
CREATE TABLE isi_kajian (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  jadwal_kajian_id UUID NOT NULL REFERENCES jadwal_kajian(id) ON DELETE CASCADE,
  tanggal_kajian DATE NOT NULL,
  topik VARCHAR(255) NOT NULL,
  deskripsi TEXT,
  materi_url TEXT, -- Link to PDF, video, etc
  presenter_notes TEXT,
  kesimpulan TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_isi_kajian_tenant_id ON isi_kajian(tenant_id);
CREATE INDEX idx_isi_kajian_jadwal_id ON isi_kajian(jadwal_kajian_id);
CREATE INDEX idx_isi_kajian_tanggal ON isi_kajian(tenant_id, tanggal_kajian);

-- ============================================================================
-- 10. ASET_MASJID TABLE (Mosque assets/inventory)
-- ============================================================================
CREATE TABLE aset_masjid (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  nama_aset VARCHAR(255) NOT NULL,
  deskripsi TEXT,
  kategori VARCHAR(100), -- Furniture, Electronics, Qur'an, etc
  jumlah INT DEFAULT 1,
  kondisi VARCHAR(50), -- Baik, Cukup, Rusak
  tanggal_perolehan DATE,
  harga_perolehan DECIMAL(15, 2),
  lokasi_penyimpanan VARCHAR(255),
  nomor_seri VARCHAR(100),
  asuransi_nomor VARCHAR(100),
  pemeliharaan_terakhir DATE,
  status VARCHAR(50) DEFAULT 'aktif', -- aktif, rusak, hilang, terjual
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_aset_masjid_tenant_id ON aset_masjid(tenant_id);
CREATE INDEX idx_aset_masjid_kategori ON aset_masjid(tenant_id, kategori);
CREATE INDEX idx_aset_masjid_status ON aset_masjid(tenant_id, status);
CREATE INDEX idx_aset_masjid_kondisi ON aset_masjid(tenant_id, kondisi);

-- ============================================================================
-- 11. NOTULENSI TABLE (Meeting minutes)
-- ============================================================================
CREATE TABLE notulensi (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  organisasi_takmir_id UUID REFERENCES organisasi_takmir(id) ON DELETE SET NULL,
  tanggal_rapat DATE NOT NULL,
  waktu_mulai TIME NOT NULL,
  waktu_selesai TIME,
  lokasi_rapat VARCHAR(255),
  pemimpin_rapat UUID REFERENCES users(id) ON DELETE SET NULL,
  judul_rapat VARCHAR(255) NOT NULL,
  deskripsi TEXT,
  peserta JSONB, -- Array of user IDs (non-normalized for flexibility)
  pokok_bahasan TEXT,
  keputusan_rapat TEXT,
  tindak_lanjut TEXT,
  file_lampiran TEXT, -- URL to uploaded file
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_notulensi_tenant_id ON notulensi(tenant_id);
CREATE INDEX idx_notulensi_tanggal ON notulensi(tenant_id, tanggal_rapat);
CREATE INDEX idx_notulensi_organisasi_id ON notulensi(organisasi_takmir_id);
CREATE INDEX idx_notulensi_created_by ON notulensi(created_by);

-- ============================================================================
-- 12. KEHADIRAN TABLE (Attendance tracking)
-- ============================================================================
CREATE TABLE kehadiran (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  jamaah_id UUID NOT NULL REFERENCES jamaah(id) ON DELETE CASCADE,
  jadwal_kajian_id UUID REFERENCES jadwal_kajian(id) ON DELETE SET NULL,
  tipe_kehadiran VARCHAR(50), -- kajian, sholat, event, meeting
  tanggal_kehadiran DATE NOT NULL,
  waktu_masuk TIME,
  waktu_keluar TIME,
  status_kehadiran VARCHAR(50) NOT NULL, -- hadir, izin, alpa, sakit
  keterangan TEXT,
  dicatat_oleh UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_kehadiran_tenant_id ON kehadiran(tenant_id);
CREATE INDEX idx_kehadiran_jamaah_id ON kehadiran(jamaah_id);
CREATE INDEX idx_kehadiran_jadwal_kajian_id ON kehadiran(jadwal_kajian_id);
CREATE INDEX idx_kehadiran_tanggal ON kehadiran(tenant_id, tanggal_kehadiran);
CREATE INDEX idx_kehadiran_status ON kehadiran(tenant_id, status_kehadiran);
CREATE INDEX idx_kehadiran_composite ON kehadiran(tenant_id, jamaah_id, tanggal_kehadiran);

-- ============================================================================
-- 13. AGENDA TABLE (Events and scheduling)
-- ============================================================================
CREATE TABLE agenda (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  judul_agenda VARCHAR(255) NOT NULL,
  deskripsi TEXT,
  tipe_agenda VARCHAR(100), -- Sholat, Kajian, Pertemuan, Ibadah, Event
  kategori VARCHAR(100), -- Rutin, Khusus, Sosial, Pendidikan
  tanggal_mulai DATE NOT NULL,
  waktu_mulai TIME,
  tanggal_selesai DATE,
  waktu_selesai TIME,
  lokasi VARCHAR(255),
  penanggungjawab UUID REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'terjadwal', -- terjadwal, berlangsung, selesai, dibatalkan
  prioritas VARCHAR(50) DEFAULT 'normal', -- rendah, normal, tinggi
  peserta_diharapkan INT,
  file_lampiran TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_agenda_tenant_id ON agenda(tenant_id);
CREATE INDEX idx_agenda_tanggal_mulai ON agenda(tenant_id, tanggal_mulai);
CREATE INDEX idx_agenda_tipe ON agenda(tenant_id, tipe_agenda);
CREATE INDEX idx_agenda_status ON agenda(tenant_id, status);
CREATE INDEX idx_agenda_kategori ON agenda(tenant_id, kategori);
CREATE INDEX idx_agenda_penanggungjawab ON agenda(penanggungjawab);

-- ============================================================================
-- AUDIT TABLE (For tracking changes - optional but recommended)
-- ============================================================================
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  tabel_nama VARCHAR(100) NOT NULL,
  record_id UUID NOT NULL,
  aksi VARCHAR(50) NOT NULL, -- INSERT, UPDATE, DELETE
  nilai_lama JSONB,
  nilai_baru JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_log_tenant_id ON audit_log(tenant_id);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_tabel ON audit_log(tenant_id, tabel_nama);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- ============================================================================
-- MULTI-TENANT ISOLATION ENFORCEMENT
-- ============================================================================
-- This section documents Row Level Security (RLS) policies
-- Enable RLS for all tables to enforce tenant isolation

ALTER TABLE tenant ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE jamaah ENABLE ROW LEVEL SECURITY;
ALTER TABLE donasi_kategori ENABLE ROW LEVEL SECURITY;
ALTER TABLE donasi ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisasi_takmir ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisasi_takmir_anggota ENABLE ROW LEVEL SECURITY;
ALTER TABLE ustadz ENABLE ROW LEVEL SECURITY;
ALTER TABLE jadwal_kajian ENABLE ROW LEVEL SECURITY;
ALTER TABLE isi_kajian ENABLE ROW LEVEL SECURITY;
ALTER TABLE aset_masjid ENABLE ROW LEVEL SECURITY;
ALTER TABLE notulensi ENABLE ROW LEVEL SECURITY;
ALTER TABLE kehadiran ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- SCHEMA DOCUMENTATION & DESIGN NOTES
-- ============================================================================

/*
MULTI-TENANT ISOLATION STRATEGY
================================

1. TENANT_ID FIELD:
   - Every table (except `tenant`) contains a `tenant_id` field
   - tenant_id is a foreign key referencing tenant(id)
   - ON DELETE CASCADE ensures data cleanup when tenant is deleted

2. PRIMARY KEYS:
   - All tables use UUID v4 as primary key (uuid_generate_v4())
   - UUIDs provide better security and scalability than serial integers
   - UUID generation is handled by PostgreSQL built-in functions

3. FOREIGN KEY RELATIONSHIPS:
   - All FKs reference tenant(id) with ON DELETE CASCADE
   - Other FKs typically use ON DELETE SET NULL or ON DELETE RESTRICT
   - RESTRICT prevents deletion of referenced records (e.g., can't delete category if donations exist)

4. INDEXING STRATEGY:
   - Composite indexes on (tenant_id, field) for fast filtering
   - Single indexes on frequently searched fields
   - Indexes on foreign keys for join performance
   - Indexes on date fields for range queries

5. ROW LEVEL SECURITY (RLS):
   - All tables have RLS enabled
   - Policies enforce: SELECT, INSERT, UPDATE based on tenant_id
   - Implementation requires auth context with current_tenant_id()
   - Example policy: WHERE tenant_id = current_setting('app.current_tenant_id')::uuid

6. RELATIONAL INTEGRITY:
   - All tables use relational foreign keys (no denormalization except JSONB for peserta)
   - JSONB used only for dynamic lists (meeting attendees) - not recommended to over-use
   - Proper normalization ensures data consistency

SUGGESTED RLS POLICIES IMPLEMENTATION
=====================================

For each tenant-aware table, create policies like:

-- Example for jamaah table
CREATE POLICY tenant_isolation_select ON jamaah
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY tenant_isolation_insert ON jamaah
  FOR INSERT WITH CHECK (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY tenant_isolation_update ON jamaah
  FOR UPDATE USING (
    tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid())
  );

PERFORMANCE CONSIDERATIONS
===========================

1. Large Result Sets:
   - For attendance reports, consider materialized views
   - Aggregate tables for donation summaries
   - Archive old records to separate tables

2. Search Optimization:
   - Add JSONB indexes for peserta field in notulensi if searching frequently
   - Use partial indexes: CREATE INDEX ON jadwal_kajian(tenant_id) WHERE status = 'active'

3. Connection Pooling:
   - Set app.current_tenant_id in each connection request
   - Use prepared statements with tenant_id binding

DATA RETENTION & ARCHIVAL
==========================

- All tables include deleted_at (soft delete)
- Create archive tables for old records:
  - Archive tables by year (e.g., kehadiran_2024, kehadiran_2025)
  - Move records older than 2 years to archive tables
  - Query both current and archive tables in views

MIGRATION NOTES
===============

This schema is designed for PostgreSQL 12+
- UUID extension must be enabled
- RLS requires PostgreSQL 9.5+
- JSONB requires PostgreSQL 9.4+

Run this script sequentially:
1. Enable extensions
2. Create tables in dependency order
3. Create indexes
4. Enable RLS
5. Create RLS policies separately
*/
