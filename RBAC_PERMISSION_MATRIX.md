# RBAC Permission Matrix - Mosque Management SaaS

Dokumentasi lengkap matriks permission untuk setiap role di sistem multi-tenant.

## Overview

Sistem ini mengimplementasikan **Role-Based Access Control (RBAC)** dengan 6 roles utama:

| Role | Scope | Level | Deskripsi |
|------|-------|-------|-----------|
| **Super Admin** | PLATFORM | Tertinggi | Administrator platform, mengelola semua masjid |
| **Admin Masjid** | MOSQUE | Tinggi | Administrator masjid, mengelola satu masjid |
| **Bendahara** | MOSQUE | Sedang | Treasurer, mengelola keuangan & approval |
| **Takmir** | MOSQUE | Sedang | Komite masjid, mengelola operasional |
| **Ustadz** | MOSQUE | Rendah | Pendidik Islam, kelola jadwal & kelas |
| **Jamaah** | MOSQUE | Minimal | Anggota jamaah, donasi & daftar |

---

## Permission Matrix by Module

### 1. JAMAAH MANAGEMENT (Manajemen Anggota Jamaah)

| Permission | Super Admin | Admin Masjid | Bendahara | Takmir | Ustadz | Jamaah |
|-----------|:----------:|:----------:|:--------:|:-----:|:-----:|:-----:|
| **jamaah:create** | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| **jamaah:read** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **jamaah:update** | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| **jamaah:delete** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

**Use Cases:**
- Admin Masjid & Takmir: Register anggota baru
- Bendahara: View anggota untuk laporan keuangan
- Ustadz: View anggota untuk tracking kehadiran kelas
- Jamaah: Hanya bisa melihat profil sendiri (data tersegmentasi di frontend)

---

### 2. JADWAL MANAGEMENT (Manajemen Jadwal)

| Permission | Super Admin | Admin Masjid | Bendahara | Takmir | Ustadz | Jamaah |
|-----------|:----------:|:----------:|:--------:|:-----:|:-----:|:-----:|
| **jadwal:create** | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| **jadwal:read** | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ |
| **jadwal:update** | ✅ | ✅ | ❌ | ✅ | ✅* | ❌ |
| **jadwal:approve** | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |

**Use Cases:**
- Ustadz: Create jadwal mengajar sendiri → Approval perlu dari Takmir
- Takmir: Create jadwal shalat, approve jadwal Ustadz
- Jamaah: View jadwal shalat & kelas

**Approval Workflow untuk Ustadz:**
```
Ustadz create jadwal → status: PENDING_APPROVAL
                     ↓
              Takmir: review & approve
                     ↓
         status: APPROVED / REJECTED
```

---

### 3. DONASI MANAGEMENT (Manajemen Donasi)

| Permission | Super Admin | Admin Masjid | Bendahara | Takmir | Ustadz | Jamaah |
|-----------|:----------:|:----------:|:--------:|:-----:|:-----:|:-----:|
| **donasi:create** | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ |
| **donasi:read** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **donasi:approve** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **donasi:export** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

**Approval Workflow - BENDAHARA APPROVE SEMUA:**
```
Jamaah / Takmir create donasi (cash/online)
                     ↓
         status: PENDING_APPROVAL
                     ↓
     Bendahara: review approval (amount, source)
                     ↓
    ✅ APPROVE atau ❌ REJECT
                     ↓
     Audit log created + notification sent
```

**Business Rules:**
- Bendahara adalah single authority untuk semua donasi
- Amount tidak ada batching (Bendahara approve semua)
- Approval wajib untuk compliance
- Audit trail lengkap dicatat

---

### 4. PENGELUARAN (EXPENSE) MANAGEMENT

| Permission | Super Admin | Admin Masjid | Bendahara | Takmir | Ustadz | Jamaah |
|-----------|:----------:|:----------:|:--------:|:-----:|:-----:|:-----:|
| **pengeluaran:create** | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| **pengeluaran:read** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **pengeluaran:approve** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **pengeluaran:export** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

**Approval Workflow - BENDAHARA APPROVE SEMUA:**
```
Admin Masjid / Takmir create pengeluaran
     (gaji, maintenance, supplies, etc)
                     ↓
         status: PENDING_APPROVAL
                     ↓
     Bendahara: review & validate (budget, dokumentasi)
                     ↓
    ✅ APPROVE atau ❌ REJECT
                     ↓
     Kas updated + Audit log + Notification
```

**Business Rules:**
- Hanya Bendahara yang bisa approve (keamanan keuangan)
- Detail dokumentasi wajib (lampiran, deskripsi)
- Audit trail lengkap untuk compliance

---

### 5. KAS MANAGEMENT (Cash/Balance)

| Permission | Super Admin | Admin Masjid | Bendahara | Takmir | Ustadz | Jamaah |
|-----------|:----------:|:----------:|:--------:|:-----:|:-----:|:-----:|
| **kas:read** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **kas:report** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

**Access Rules:**
- Hanya Admin, Bendahara, dan Takmir yang lihat saldo
- Laporan kas bisa di-export oleh Admin & Bendahara
- Setiap transaksi tercatat dengan approval status

---

### 6. LAPORAN (REPORTING & AUDIT)

| Permission | Super Admin | Admin Masjid | Bendahara | Takmir | Ustadz | Jamaah |
|-----------|:----------:|:----------:|:--------:|:-----:|:-----:|:-----:|
| **laporan:read** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **laporan:export** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **laporan:audit** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

**Reports Available:**
- Jadwal shalat (semua)
- Statistik jamaah (semua)
- Donasi & Pengeluaran (Admin, Bendahara only)
- Audit trail (Admin, Bendahara only)
- Compliance reports (Super Admin, Admin, Bendahara)

---

### 7. PENGATURAN (SETTINGS & CONFIGURATION)

| Permission | Super Admin | Admin Masjid | Bendahara | Takmir | Ustadz | Jamaah |
|-----------|:----------:|:----------:|:--------:|:-----:|:-----:|:-----:|
| **pengaturan:read** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **pengaturan:update** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **pengaturan:manage_roles** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **pengaturan:manage_users** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

**Settings:**
- Super Admin: Manage seluruh platform
- Admin Masjid: Manage mosque-level settings (jam shalat, lokasi, etc)
- Manage Users: Assign/revoke roles untuk masjid mereka

---

## Role-Based Summary

### Super Admin (Platform Level)
**Scope:** Semua masjid
**Permissions:** 32/32 (100%)
**Responsibilities:**
- Manage semua masjid
- Manage administrators
- View compliance reports
- System configuration

### Admin Masjid (Mosque Level)
**Scope:** Satu masjid saja
**Permissions:** 26/32 (81%)
**Responsibilities:**
- Manage jamaah
- Manage jadwal
- Assign roles dalam masjid
- Approve expense & donasi
- View laporan & audit

### Bendahara (Finance Officer)
**Scope:** Satu masjid saja
**Permissions:** 13/32 (41%)
**Responsibilities:**
- **APPROVE semua donasi dan pengeluaran**
- Manage kas/balance
- Export laporan keuangan
- Maintain audit trail
- Compliance reporting

**Key Responsibility:**
- Single authority untuk approval donasi & pengeluaran
- Tanpa batching amount (approve semua)
- Full audit trail untuk compliance

### Takmir (Committee Member)
**Scope:** Satu masjid saja
**Permissions:** 9/32 (28%)
**Responsibilities:**
- Manage jamaah (register, update)
- Manage jadwal
- Create donasi & pengeluaran
- View kas status

### Ustadz (Teacher)
**Scope:** Satu masjid saja
**Permissions:** 5/32 (16%)
**Responsibilities:**
- Create & update jadwal mengajar (perlu Takmir approval)
- View jamaah untuk presensi
- View laporan statistik

### Jamaah (Congregation Member)
**Scope:** Satu masjid, limited data
**Permissions:** 3/32 (9%)
**Responsibilities:**
- Create donasi
- View jadwal shalat & kelas
- View laporan statistik

---

## Tenant Isolation Strategy

### Multi-Tenant Boundaries

```
Platform (Super Admin)
    ├── Masjid A (Admin Masjid A)
    │   ├── User: Bendahara A (BENDAHARA role)
    │   ├── User: Takmir A1 (TAKMIR role)
    │   ├── User: Ustadz A1 (USTADZ role)
    │   └── User: Jamaah A1 (JAMAAH role)
    │
    └── Masjid B (Admin Masjid B)
        ├── User: Bendahara B (BENDAHARA role)
        ├── User: Takmir B1 (TAKMIR role)
        └── ...
```

### Data Isolation Rules

**Query Level:**
```sql
-- Every query includes tenant_id filter
SELECT * FROM jamaah 
WHERE tenant_id = ? 
AND user_can_access_tenant(current_user_id, tenant_id)
```

**Middleware Level:**
```typescript
// Verify user has access to requested tenant
function tenantIsolationMiddleware(req: Request) {
  const requestedTenant = req.body.tenant_id || req.params.tenant_id
  const userTenants = getUserTenants(req.user.id)
  
  if (!userTenants.includes(requestedTenant)) {
    throw new InvalidTenantError(requestedTenant, req.user.id)
  }
}
```

---

## Permission Delegation Rules

| Role | Can Delegate | To Whom | Limitations |
|------|:----------:|---------|-------------|
| Super Admin | ✅ Yes | Anyone | No limit |
| Admin Masjid | ✅ Yes | Roles in own mosque | Up to their permission level |
| Bendahara | ❌ No | - | Cannot delegate |
| Takmir | ❌ No | - | Cannot delegate |
| Ustadz | ❌ No | - | Cannot delegate |
| Jamaah | ❌ No | - | Cannot delegate |

---

## Critical Permission Rules

### Approval Requirements

| Entity | Requires Approval | Approver | Notes |
|--------|:---------------:|----------|-------|
| Donasi | ✅ YES | Bendahara | All amounts |
| Pengeluaran | ✅ YES | Bendahara | All amounts |
| Jadwal (Ustadz) | ✅ YES | Takmir | Schedule must be approved |
| Jadwal (Takmir) | ❌ NO | - | Direct approval |

### Audit Requirements

All transactions mengharuskan:
- User ID & timestamp
- Approval status & approver
- Old & new values (untuk updates)
- IP address & user agent (untuk security)

---

## Compliance & Reporting

### Automatic Audit Logging

Every action menciptakan audit log:
- Who: User ID
- What: Action & entity
- When: Timestamp
- Status: Success/Failed
- Old/New Values: For updates

### Monthly Compliance Reports

Generated automatically untuk:
- Total transactions
- Approval statistics
- Role distribution
- Security events
- Activity summary

---

## Permission Checking Implementation

See `src/services/PermissionService.ts` untuk implementasi lengkap.

```typescript
// Check single permission
const hasPermission = await permissionService.hasPermission(
  userId, 
  tenantId, 
  'donasi:approve'
)

// Check multiple permissions
const hasAny = await permissionService.hasAnyPermission(
  userId,
  tenantId,
  ['donasi:approve', 'pengeluaran:approve']
)

// Get all permissions for user
const permissions = await permissionService.getUserPermissions(
  userId,
  tenantId
)
```

---

## Next Steps

1. **Database Setup:** Run `rbac-schema.sql` untuk create tables
2. **Service Layer:** Implement `PermissionService.ts` & `AuditService.ts`
3. **Middleware:** Setup `tenantIsolationMiddleware.ts`
4. **React Hooks:** Create `usePermission.ts` & `useRole.ts`
5. **Backend Validation:** Validate permissions di setiap endpoint
6. **Frontend Guards:** Hide UI elements based on permissions
