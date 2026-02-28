# RBAC Approval Workflows - Mosque Management SaaS

Dokumentasi lengkap tentang workflow approval untuk Donasi dan Pengeluaran Kas.

## Approval Strategy Summary

### Prinsip Utama:
- **Single Authority:** Bendahara adalah satu-satunya approver untuk SEMUA donasi dan pengeluaran
- **Tanpa Batching Amount:** Tidak ada perbedaan approval untuk amount kecil vs besar
- **Mandatory Approval:** Semua transaksi wajib mendapat approval sebelum dicatat
- **Complete Audit Trail:** Setiap approval keputusan tercatat untuk compliance

---

## Workflow 1: Donasi (Donation)

### Alur Penuh Donasi

```
┌─────────────────────────────────────────────────────────────────┐
│  DONASI WORKFLOW                                                │
└─────────────────────────────────────────────────────────────────┘

1. JAMAAH/TAKMIR: Create Donasi
   ├─ Input: Amount, Source, Category, Keterangan
   ├─ Status: PENDING_APPROVAL (otomatis)
   └─ Create Approval Workflow
       └─ Step 1: Bendahara approval needed

2. SYSTEM: Notify Bendahara
   ├─ Email notification
   └─ Dashboard alert

3. BENDAHARA: Review Donasi
   ├─ Check amount, source validity
   ├─ Review dokumentasi (foto bukti, surat, dll)
   └─ Decision: APPROVE atau REJECT

4a. BENDAHARA: APPROVE
    ├─ Update status: APPROVED
    ├─ Record approval timestamp
    ├─ Create Audit Log: 'donasi:approve'
    ├─ Update Kas: Increase balance
    ├─ Create Notification: To Jamaah/Takmir
    └─ Done - Donasi tercatat

4b. BENDAHARA: REJECT
    ├─ Update status: REJECTED
    ├─ Record rejection reason
    ├─ Create Audit Log: 'donasi:reject'
    ├─ Create Notification: To Jamaah/Takmir with reason
    └─ Return for revision (optional)

5. JAMAAH/TAKMIR: Notification received
   └─ Can view approval decision
```

### Implementation Example

```typescript
// 1. JAMAAH/TAKMIR: Create Donasi
async function createDonasi(
  tenantId: string,
  userId: string,
  data: {
    amount: number
    source: 'cash' | 'transfer' | 'other'
    category: string
    keterangan: string
    bukti?: File
  }
) {
  // Validate permission
  await permissionService.checkPermission(userId, tenantId, 'donasi:create')

  // Create donasi record
  const donasi = {
    id: generateId(),
    tenantId,
    amount: data.amount,
    source: data.source,
    category: data.category,
    keterangan: data.keterangan,
    status: 'PENDING_APPROVAL', // Automatic status
    createdBy: userId,
    createdAt: new Date(),
  }

  // Save to database
  await db.donasi.insert(donasi)

  // Create approval workflow
  const workflow = await approvalService.submitForApproval(
    tenantId,
    EntityType.DONASI,
    donasi.id,
    userId
  )

  // Log action
  await auditService.logAction({
    tenantId,
    userId,
    action: 'donasi:create',
    module: 'donasi',
    entityType: 'donasi',
    entityId: donasi.id,
    newValues: donasi,
    status: AuditStatus.SUCCESS,
  })

  // Notify Bendahara
  await notificationService.notifyBendahara(tenantId, {
    type: 'DONASI_PENDING_APPROVAL',
    donasiId: donasi.id,
    amount: data.amount,
  })

  return donasi
}

// 2. BENDAHARA: Approve Donasi
async function approveDonasi(
  tenantId: string,
  bendaharaUserId: string,
  donasiId: string,
  notes?: string
) {
  // Verify Bendahara permission
  await permissionService.checkPermission(
    bendaharaUserId,
    tenantId,
    'donasi:approve'
  )

  // Get donasi
  const donasi = await db.donasi.findById(donasiId)
  if (!donasi || donasi.tenantId !== tenantId) {
    throw new Error('Donasi not found')
  }

  // Update approval workflow
  const workflow = await approvalService.approveDonasi(
    tenantId,
    donasiId,
    bendaharaUserId,
    notes
  )

  // Update donasi status
  const oldStatus = donasi.status
  donasi.status = 'APPROVED'
  donasi.approvedBy = bendaharaUserId
  donasi.approvedAt = new Date()
  donasi.approvalNotes = notes

  await db.donasi.update(donasiId, donasi)

  // Update Kas
  await updateKasBalance(tenantId, {
    type: 'INCOME',
    amount: donasi.amount,
    source: 'donasi',
    referenceId: donasiId,
  })

  // Log action
  await auditService.logUpdate(
    tenantId,
    bendaharaUserId,
    'donasi:approve',
    'donasi',
    'donasi',
    donasiId,
    { status: oldStatus },
    { status: 'APPROVED', approvedAt: new Date() }
  )

  // Notify creator
  await notificationService.notifyUser(donasi.createdBy, {
    type: 'DONASI_APPROVED',
    donasiId,
    amount: donasi.amount,
    approvedBy: bendaharaUserId,
  })

  return donasi
}

// 3. BENDAHARA: Reject Donasi
async function rejectDonasi(
  tenantId: string,
  bendaharaUserId: string,
  donasiId: string,
  rejectionReason: string
) {
  // Verify permission
  await permissionService.checkPermission(
    bendaharaUserId,
    tenantId,
    'donasi:approve'
  )

  // Get donasi
  const donasi = await db.donasi.findById(donasiId)
  if (!donasi || donasi.tenantId !== tenantId) {
    throw new Error('Donasi not found')
  }

  // Update approval workflow
  const workflow = await approvalService.rejectDonasi(
    tenantId,
    donasiId,
    bendaharaUserId,
    rejectionReason
  )

  // Update donasi status
  const oldStatus = donasi.status
  donasi.status = 'REJECTED'
  donasi.rejectedBy = bendaharaUserId
  donasi.rejectedAt = new Date()
  donasi.rejectionReason = rejectionReason

  await db.donasi.update(donasiId, donasi)

  // Log action
  await auditService.logUpdate(
    tenantId,
    bendaharaUserId,
    'donasi:reject',
    'donasi',
    'donasi',
    donasiId,
    { status: oldStatus },
    { status: 'REJECTED', rejectionReason }
  )

  // Notify creator with reason
  await notificationService.notifyUser(donasi.createdBy, {
    type: 'DONASI_REJECTED',
    donasiId,
    amount: donasi.amount,
    reason: rejectionReason,
  })

  return donasi
}
```

---

## Workflow 2: Pengeluaran (Expense)

### Alur Penuh Pengeluaran

```
┌─────────────────────────────────────────────────────────────────┐
│  PENGELUARAN WORKFLOW                                           │
└─────────────────────────────────────────────────────────────────┘

1. ADMIN MASJID/TAKMIR: Create Pengeluaran
   ├─ Input: Amount, Category, Description, Bukti/Invoice
   ├─ Status: PENDING_APPROVAL (otomatis)
   └─ Create Approval Workflow
       └─ Step 1: Bendahara approval needed

2. SYSTEM: Notify Bendahara
   ├─ Email notification dengan detail
   └─ Dashboard alert

3. BENDAHARA: Review Pengeluaran
   ├─ Check amount vs budget
   ├─ Validate dokumentasi (invoice, bukti pembayaran)
   ├─ Verify account/penerima pembayaran
   └─ Decision: APPROVE atau REJECT

4a. BENDAHARA: APPROVE
    ├─ Update status: APPROVED
    ├─ Record approval timestamp
    ├─ Create Audit Log: 'pengeluaran:approve'
    ├─ Update Kas: Decrease balance
    ├─ Create Notifikasi: To requester
    └─ Pengeluaran tercatat & siap untuk payment

4b. BENDAHARA: REJECT
    ├─ Update status: REJECTED
    ├─ Record rejection reason (missing doc, over budget, dll)
    ├─ Create Audit Log: 'pengeluaran:reject'
    ├─ Create Notifikasi: To requester with reason
    └─ Return for revision

5. REQUESTER: Menerima decision
   ├─ If APPROVED: Proceed with payment
   └─ If REJECTED: Revise and resubmit
```

### Implementation Example

```typescript
// Similar structure as Donasi, but for expenses
async function createPengeluaran(
  tenantId: string,
  userId: string,
  data: {
    amount: number
    category: string
    description: string
    penerima?: string
    nomorRekening?: string
    bukti?: File
  }
) {
  // Validate permission
  await permissionService.checkPermission(
    userId,
    tenantId,
    'pengeluaran:create'
  )

  // Validate budget (if applicable)
  const budget = await getBudget(tenantId, data.category)
  if (budget && budget.remaining < data.amount) {
    throw new Error('Amount exceeds budget')
  }

  // Create pengeluaran record
  const pengeluaran = {
    id: generateId(),
    tenantId,
    amount: data.amount,
    category: data.category,
    description: data.description,
    penerima: data.penerima,
    nomorRekening: data.nomorRekening,
    status: 'PENDING_APPROVAL',
    createdBy: userId,
    createdAt: new Date(),
  }

  // Save to database
  await db.pengeluaran.insert(pengeluaran)

  // Create approval workflow
  await approvalService.submitForApproval(
    tenantId,
    EntityType.PENGELUARAN,
    pengeluaran.id,
    userId
  )

  // Log action
  await auditService.logAction({
    tenantId,
    userId,
    action: 'pengeluaran:create',
    module: 'pengeluaran',
    entityType: 'pengeluaran',
    entityId: pengeluaran.id,
    newValues: pengeluaran,
    status: AuditStatus.SUCCESS,
  })

  // Notify Bendahara
  await notificationService.notifyBendahara(tenantId, {
    type: 'PENGELUARAN_PENDING_APPROVAL',
    pengeluaranId: pengeluaran.id,
    amount: data.amount,
    category: data.category,
  })

  return pengeluaran
}

async function approvePengeluaran(
  tenantId: string,
  bendaharaUserId: string,
  pengeluaranId: string,
  notes?: string
) {
  // Verify Bendahara permission
  await permissionService.checkPermission(
    bendaharaUserId,
    tenantId,
    'pengeluaran:approve'
  )

  // Get pengeluaran
  const pengeluaran = await db.pengeluaran.findById(pengeluaranId)
  if (!pengeluaran || pengeluaran.tenantId !== tenantId) {
    throw new Error('Pengeluaran not found')
  }

  // Update approval workflow
  await approvalService.approvePengeluaran(
    tenantId,
    pengeluaranId,
    bendaharaUserId,
    notes
  )

  // Update pengeluaran status
  const oldStatus = pengeluaran.status
  pengeluaran.status = 'APPROVED'
  pengeluaran.approvedBy = bendaharaUserId
  pengeluaran.approvedAt = new Date()
  pengeluaran.approvalNotes = notes

  await db.pengeluaran.update(pengeluaranId, pengeluaran)

  // Update Kas
  await updateKasBalance(tenantId, {
    type: 'EXPENSE',
    amount: pengeluaran.amount,
    category: pengeluaran.category,
    referenceId: pengeluaranId,
  })

  // Log action
  await auditService.logUpdate(
    tenantId,
    bendaharaUserId,
    'pengeluaran:approve',
    'pengeluaran',
    'pengeluaran',
    pengeluaranId,
    { status: oldStatus },
    { status: 'APPROVED', approvedAt: new Date() }
  )

  // Notify requester
  await notificationService.notifyUser(pengeluaran.createdBy, {
    type: 'PENGELUARAN_APPROVED',
    pengeluaranId,
    amount: pengeluaran.amount,
    approvedBy: bendaharaUserId,
  })

  return pengeluaran
}
```

---

## Workflow 3: Jadwal (Schedule) - Ustadz Submission

### Alur Jadwal dengan Approval

```
┌─────────────────────────────────────────────────────────────────┐
│  JADWAL WORKFLOW (Ustadz Schedule)                              │
└─────────────────────────────────────────────────────────────────┘

1. USTADZ: Create Jadwal Mengajar
   ├─ Input: Tanggal, Jam, Materi, Lokasi
   ├─ Status: PENDING_APPROVAL
   └─ Create Approval Workflow
       └─ Step 1: Takmir approval needed

2. SYSTEM: Notify Takmir
   ├─ Email notification
   └─ Dashboard alert

3. TAKMIR: Review Jadwal
   ├─ Check schedule conflict
   ├─ Verify lokasi availability
   └─ Decision: APPROVE atau REJECT

4a. TAKMIR: APPROVE
    ├─ Update status: APPROVED
    ├─ Jadwal published otomatis
    ├─ Notify Jamaah
    ├─ Update calendar
    └─ Done

4b. TAKMIR: REJECT
    ├─ Update status: REJECTED
    ├─ Provide feedback to Ustadz
    └─ Ustadz revises and resubmits

5. JAMAAH: Can see approved schedule
```

---

## Audit Trail Examples

### Example 1: Complete Donasi Approval Audit

```json
{
  "donasi_id": "dona_12345",
  "audit_logs": [
    {
      "id": "audit_1001",
      "timestamp": "2024-02-15T10:30:00Z",
      "action": "donasi:create",
      "user_id": "jamaah_001",
      "user_name": "Budi Santoso",
      "entity_type": "donasi",
      "status": "SUCCESS",
      "new_values": {
        "amount": 500000,
        "source": "cash",
        "category": "umum",
        "keterangan": "Sumbangan untuk renovasi"
      }
    },
    {
      "id": "audit_1002",
      "timestamp": "2024-02-15T10:35:00Z",
      "action": "workflow:submitted",
      "entity_type": "approval_workflow",
      "status": "SUCCESS",
      "new_values": {
        "workflow_id": "wf_12345",
        "entity_type": "donasi",
        "entity_id": "dona_12345",
        "status": "PENDING",
        "approver_role": "BENDAHARA"
      }
    },
    {
      "id": "audit_1003",
      "timestamp": "2024-02-15T11:15:00Z",
      "action": "donasi:approve",
      "user_id": "bendahara_001",
      "user_name": "Ahmad Kaharuddin",
      "entity_type": "donasi",
      "status": "SUCCESS",
      "old_values": {
        "status": "PENDING_APPROVAL"
      },
      "new_values": {
        "status": "APPROVED",
        "approved_at": "2024-02-15T11:15:00Z",
        "approval_notes": "Donasi diterima dengan baik"
      }
    },
    {
      "id": "audit_1004",
      "timestamp": "2024-02-15T11:16:00Z",
      "action": "kas:update",
      "user_id": "system",
      "entity_type": "kas",
      "status": "SUCCESS",
      "new_values": {
        "transaction_type": "INCOME",
        "amount": 500000,
        "source": "donasi",
        "reference_id": "dona_12345",
        "balance_before": 5000000,
        "balance_after": 5500000
      }
    }
  ]
}
```

### Example 2: Rejected Pengeluaran Audit

```json
{
  "pengeluaran_id": "peng_67890",
  "audit_logs": [
    {
      "id": "audit_2001",
      "timestamp": "2024-02-16T09:00:00Z",
      "action": "pengeluaran:create",
      "user_id": "takmir_001",
      "entity_type": "pengeluaran",
      "status": "SUCCESS",
      "new_values": {
        "amount": 2000000,
        "category": "maintenance",
        "description": "Perbaikan atap musholah"
      }
    },
    {
      "id": "audit_2002",
      "timestamp": "2024-02-16T10:00:00Z",
      "action": "pengeluaran:reject",
      "user_id": "bendahara_001",
      "entity_type": "pengeluaran",
      "status": "SUCCESS",
      "old_values": {
        "status": "PENDING_APPROVAL"
      },
      "new_values": {
        "status": "REJECTED",
        "rejection_reason": "Dokumentasi invoice tidak lengkap. Mohon sertakan 3 penawaran harga (quotation)"
      }
    }
  ]
}
```

---

## Compliance Report Example

### Monthly Compliance Report Format

```
LAPORAN COMPLIANCE MASJID AS-SALAM
Bulan: Februari 2024

RINGKASAN STATISTIK:
- Total Transaksi: 45
  - Donasi: 25
  - Pengeluaran: 20
- Total Approval: 43
- Total Rejection: 2
- Rata-rata waktu approval: 2.5 jam

DISTRIBUSI ROLE:
- Super Admin: 1
- Admin Masjid: 1
- Bendahara: 1
- Takmir: 3
- Ustadz: 2
- Jamaah: 87

STATISTIK APPROVAL:
- Donasi Disetujui: 24 (96%)
- Donasi Ditolak: 1 (4%)
- Pengeluaran Disetujui: 19 (95%)
- Pengeluaran Ditolak: 1 (5%)

TOTAL NILAI TRANSAKSI:
- Donasi Diterima: Rp 45,500,000
- Pengeluaran Tersetujui: Rp 38,200,000
- Saldo Akhir: Rp 7,300,000

RINGKASAN AKTIVITAS:
- Jamaah Registrasi Baru: 5
- Jadwal Shalat Diupdate: 3
- Jadwal Pengajian: 8
- Laporan Diexport: 4

KEJADIAN KEAMANAN:
- Login gagal berulang: 0
- Perubahan permission: 0
- Akses data tidak sah: 0
- Alert: Tidak ada

CATATAN:
Tidak ada masalah keamanan atau compliance terdeteksi.
Semua transaksi tercatat dengan baik dalam audit trail.
```

---

## Best Practices

### Untuk Bendahara:
1. **Review cepat**: Target approval dalam 24 jam
2. **Dokumentasi**: Always request lengkap sebelum approve
3. **Konsistensi**: Gunakan kriteria sama untuk semua approval
4. **Catatan**: Selalu isi notes/reason pada setiap decision
5. **Monitoring**: Check pending approvals setiap hari

### Untuk Requester (Jamaah/Takmir):
1. **Lengkap**: Submit dengan dokumentasi lengkap
2. **Jelas**: Isi deskripsi yang detail dan jelas
3. **Bukti**: Upload bukti (foto, invoice, surat) jika diperlukan
4. **Follow-up**: Check status approval secara berkala

### Untuk System Administrator:
1. **Audit**: Review audit logs secara berkala
2. **Reports**: Generate compliance reports tepat waktu
3. **Cleanup**: Archive old logs (>2 tahun) untuk storage
4. **Backup**: Ensure audit logs di-backup harian

---

## Error Handling

### Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| Permission Denied | User bukan Bendahara | Verify role assignment |
| Workflow Not Found | Invalid entity ID | Check entity exists |
| Invalid Tenant | Wrong tenant context | Verify tenant_id header |
| Approval Already Done | Duplicate submission | Check workflow status |

---

## Next Steps

1. **Database**: Run `rbac-schema.sql` untuk setup tables
2. **Services**: Implement tiga services (Permission, Approval, Audit)
3. **API Endpoints**: Create REST endpoints dengan validation
4. **Frontend**: Build approval dashboard untuk Bendahara
5. **Notifications**: Setup email/SMS notifications
6. **Reports**: Implement compliance report generation
