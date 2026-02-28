# RBAC System - Complete Documentation Index

Role-Based Access Control for Mosque Management SaaS Multi-Tenant Platform

## Quick Start (5 Minutes)

**New to this system?** Start here:

1. **Read**: `RBAC_QUICK_REFERENCE.txt` (5 min)
   - Visual overview of all 6 roles
   - Permission matrix at a glance
   - Integration checklist
   - Common workflows

2. **Watch**: Mental model
   ```
   6 Roles → 25+ Permissions → Services → Middleware → API → React
   ```

3. **Next**: Choose your path below

---

## Documentation Paths

### Path 1: Understanding the System (30 minutes)

For stakeholders, managers, and anyone wanting to understand RBAC:

1. **RBAC_QUICK_REFERENCE.txt** (5 min) ← Start here
   - 6 roles overview
   - Permission matrix
   - Key workflows
   - Visual diagrams

2. **RBAC_PERMISSION_MATRIX.md** (15 min)
   - Detailed permission breakdown by module
   - Role responsibilities
   - Business rules
   - Tenant isolation strategy

3. **RBAC_APPROVAL_WORKFLOWS.md** (10 min)
   - Donasi approval workflow
   - Pengeluaran approval workflow
   - Jadwal approval workflow
   - Audit trail examples
   - Best practices

**Outcome**: You understand who can do what and why

---

### Path 2: Implementation Guide (3-5 Days)

For developers implementing the system:

1. **RBAC_IMPLEMENTATION_SUMMARY.md** (20 min)
   - Architecture overview
   - File structure
   - Feature summary
   - Implementation checklist

2. **RBAC_PERMISSION_MATRIX.md** (20 min)
   - Detailed permission rules
   - Tenant isolation details
   - Delegation rules

3. **Code Files** (3-5 days)
   - **scripts/rbac-schema.sql** - Database schema
   - **src/types/rbac.ts** - All types & constants
   - **src/services/PermissionService.ts** - Permission checking
   - **src/services/ApprovalWorkflowService.ts** - Approval workflows
   - **src/services/AuditService.ts** - Audit & compliance
   - **src/middleware/tenantIsolation.ts** - Tenant security

4. **RBAC_APPROVAL_WORKFLOWS.md** (30 min)
   - Implementation examples
   - API patterns
   - Error handling

**Outcome**: You have a working RBAC system with all workflows

---

### Path 3: Operational Guide (2-3 Days)

For team leads and operations who manage the system:

1. **RBAC_QUICK_REFERENCE.txt** (5 min)
   - Quick lookup guide
   - Error messages
   - Common scenarios

2. **RBAC_PERMISSION_MATRIX.md** (20 min)
   - Role responsibilities
   - Permission breakdown
   - Audit requirements

3. **RBAC_APPROVAL_WORKFLOWS.md** (20 min)
   - Approval workflow details
   - Compliance report format
   - Best practices

4. **RBAC_IMPLEMENTATION_SUMMARY.md** (15 min)
   - File locations
   - Common scenarios
   - Performance considerations
   - Security best practices

**Outcome**: You can manage users, roles, and monitor compliance

---

## File Reference

### Implementation Files (Ready to Use)

#### Database Schema
- **`scripts/rbac-schema.sql`** (434 lines)
  - 10 core tables (roles, permissions, user_roles, audit_logs, etc)
  - Seed data for 6 roles and 25+ permissions
  - Triggers for automatic timestamp updates
  - Ready to execute: `mysql < rbac-schema.sql`

#### TypeScript Types
- **`src/types/rbac.ts`** (398 lines)
  - 6 role enums (SUPER_ADMIN, ADMIN_MASJID, etc)
  - 25+ permission constants
  - Type interfaces for all entities
  - Helper functions (hasPermission, parsePermissionCode, etc)
  - Error classes (PermissionDeniedError, InvalidTenantError, etc)

#### Services (3 files, 1,233 lines)
- **`src/services/PermissionService.ts`** (327 lines)
  - checkPermission() - throws on denied
  - hasPermission() - returns boolean
  - getUserPermissions() - get all perms
  - canDelegate() - check delegation rights
  - With caching for performance

- **`src/services/ApprovalWorkflowService.ts`** (467 lines)
  - createApprovalWorkflow() - create workflow
  - approveDonasi() - Bendahara approves donation
  - approvePengeluaran() - Bendahara approves expense
  - rejectDonasi() - Bendahara rejects donation
  - rejectPengeluaran() - Bendahara rejects expense
  - getPendingApprovals() - get Bendahara queue
  - getApprovalStats() - statistics for reports

- **`src/services/AuditService.ts`** (439 lines)
  - logAction() - log any action
  - logUpdate() - log with before/after values
  - logFailure() - log errors
  - getAuditLogs() - retrieve logs
  - generateComplianceReport() - monthly reports
  - exportAuditLogsCSV() - CSV export
  - cleanupOldLogs() - retention policy

#### Middleware (1 file, 387 lines)
- **`src/middleware/tenantIsolation.ts`** (387 lines)
  - TenantIsolationService - main service
  - verifyTenantAccess() - check user can access tenant
  - buildRequestContext() - create context with verification
  - TenantFilteredQuery - helper for filtered queries
  - createTenantIsolationMiddleware() - Express middleware
  - Decorators & type guards for safety

### Documentation Files

#### Quick References
- **`RBAC_QUICK_REFERENCE.txt`** (258 lines)
  - Visual overview of 6 roles
  - Permission matrix at a glance
  - Quick lookup tables
  - Integration checklist
  - Error messages
  - Examples

#### Detailed Guides
- **`RBAC_PERMISSION_MATRIX.md`** (369 lines)
  - Detailed permission matrix per module
  - Role responsibilities
  - Business rules
  - Permission delegation rules
  - Critical permission rules
  - Compliance & reporting

- **`RBAC_APPROVAL_WORKFLOWS.md`** (698 lines)
  - Workflow 1: Donasi (Donation) approval
  - Workflow 2: Pengeluaran (Expense) approval
  - Workflow 3: Jadwal (Schedule) approval
  - Complete implementation examples
  - Audit trail examples
  - Compliance report examples
  - Best practices
  - Error handling

#### Implementation Guide
- **`RBAC_IMPLEMENTATION_SUMMARY.md`** (424 lines)
  - Architecture overview
  - What you have (summary of all files)
  - 6 roles & permissions summary
  - Approval workflows detail
  - Tenant isolation strategy
  - Audit trail explanation
  - Implementation checklist (6 phases)
  - Common scenarios
  - Performance considerations
  - Security best practices

---

## Code Examples

### Example 1: Check Permission
```typescript
// Single permission check
await permissionService.checkPermission(
  userId, 
  tenantId, 
  'donasi:approve'
)
// Throws PermissionDeniedError if not allowed

// Or check with boolean
const hasPermission = await permissionService.hasPermission(
  userId, 
  tenantId, 
  'donasi:approve'
)
```

### Example 2: Bendahara Approves Donation
```typescript
const workflow = await approvalService.approveDonasi(
  tenantId,
  donasiId,
  bendaharaUserId,
  'Donasi diterima dengan baik'
)
// Updates workflow status
// Updates donasi status to APPROVED
// Updates Kas balance (automatically)
// Creates audit log
// Sends notification
```

### Example 3: Log Action
```typescript
await auditService.logAction({
  tenantId,
  userId: bendaharaUserId,
  action: 'donasi:approve',
  module: 'donasi',
  entityType: 'donasi',
  entityId: donasiId,
  newValues: { status: 'APPROVED' },
  status: AuditStatus.SUCCESS,
  ipAddress: '192.168.1.100',
  userAgent: 'Mozilla/5.0...'
})
```

### Example 4: Verify Tenant Access
```typescript
await tenantService.verifyTenantAccess(userId, tenantId)
// Throws InvalidTenantError if user has no access

// Or get all tenant access
const tenants = await tenantService.getUserTenants(userId)
// Returns: ['mosque_123', 'mosque_456']
```

---

## Role Summary

### 6 Roles in System

| Role | Scope | Permissions | Key Action |
|------|-------|-------------|-----------|
| **SUPER_ADMIN** | Platform | 32 (all) | Manage platform |
| **ADMIN_MASJID** | Mosque | 26 | Manage users & mosque |
| **BENDAHARA** | Mosque | 13 | **APPROVE all donasi & pengeluaran** |
| **TAKMIR** | Mosque | 9 | Committee operations |
| **USTADZ** | Mosque | 5 | Manage teaching |
| **JAMAAH** | Mosque | 3 | Donate & view |

---

## Approval Workflow at a Glance

### Key Rules:
1. **Single Authority**: Bendahara approves ALL donasi & pengeluaran
2. **No Batching**: All amounts (Rp 100K, Rp 100M) same approval
3. **Mandatory**: All transactions require approval
4. **Complete Audit**: Every decision logged

### Flow:
```
Create → PENDING_APPROVAL → Bendahara Reviews → APPROVED/REJECTED
         Workflow created     Notification sent   Kas updated
                             Decision logged     Notification sent
```

---

## Integration Checklist

### Phase 1: Database (1 day)
- [ ] Run `rbac-schema.sql`
- [ ] Verify 10 tables created
- [ ] Seed roles & permissions

### Phase 2: Services (2 days)
- [ ] Add PermissionService
- [ ] Add ApprovalWorkflowService
- [ ] Add AuditService
- [ ] Setup DI container

### Phase 3: Middleware (2 days)
- [ ] Add TenantIsolationMiddleware
- [ ] Verify tenant on all routes
- [ ] Add permission checks

### Phase 4: Frontend (2 days)
- [ ] Create usePermission hook
- [ ] Create useRole hook
- [ ] Hide UI based on permissions

### Phase 5: Features (3 days)
- [ ] Approval dashboard
- [ ] Notifications
- [ ] Compliance reports

### Phase 6: Testing (2 days)
- [ ] Integration tests
- [ ] Security tests
- [ ] Workflow tests

**Total: 2-3 weeks**

---

## Security Checklist

- [ ] Tenant isolation at query level
- [ ] Permission check at middleware level
- [ ] Audit trail for all sensitive actions
- [ ] HTTPS only for API
- [ ] JWT tokens with expiry
- [ ] Rate limiting on sensitive endpoints
- [ ] Regular audit log backups
- [ ] Monthly compliance reports generated
- [ ] Access logs monitored
- [ ] Role delegation rules enforced

---

## Common Questions

### Q: Can amount-based approval be added later?
**A**: Yes, easy change in ApprovalWorkflowService. Currently all approvals go to Bendahara.

### Q: Can we add more roles?
**A**: Yes, add to RoleCode enum in types/rbac.ts and update permission matrix.

### Q: How are permissions cached?
**A**: 5-minute cache in memory. Redis recommended for production.

### Q: Can reports be exported?
**A**: Yes, CSV export and HTML email built-in. Monthly reports auto-generated.

### Q: What about role expiration?
**A**: Supported in user_roles table (expires_at column). Check on permission check.

### Q: Can users have multiple roles?
**A**: Yes, all their permissions merged. Maximum flexibility.

---

## Documentation by Role

### For Stakeholders/Managers:
1. RBAC_QUICK_REFERENCE.txt
2. RBAC_PERMISSION_MATRIX.md
3. RBAC_APPROVAL_WORKFLOWS.md

### For Developers:
1. RBAC_IMPLEMENTATION_SUMMARY.md
2. RBAC_PERMISSION_MATRIX.md (rules section)
3. All source files (scripts, src)
4. RBAC_APPROVAL_WORKFLOWS.md (implementation examples)

### For Operations/DevOps:
1. RBAC_QUICK_REFERENCE.txt
2. RBAC_IMPLEMENTATION_SUMMARY.md (performance, security)
3. RBAC_APPROVAL_WORKFLOWS.md (audit trail examples)

### For System Admin:
1. RBAC_QUICK_REFERENCE.txt (roles, permissions)
2. RBAC_PERMISSION_MATRIX.md (detailed breakdown)
3. RBAC_IMPLEMENTATION_SUMMARY.md (user management)

---

## Key Concepts

### Multi-Tenant
- Each mosque is separate "tenant"
- User can have roles in multiple mosques
- Data never leaks between tenants
- Enforced at query, middleware, and service levels

### Permissions
- Granular (25+ permissions)
- Organized by module (jamaah, jadwal, donasi, etc)
- Combined as "action:module" (e.g., "donasi:approve")
- Can be delegated by Super Admin and Admin Masjid

### Approval Workflow
- Bendahara is single authority for all financial approval
- No amount-based batching (all same approval path)
- All approvals mandatory
- Each decision creates audit log

### Audit Trail
- Every action logged (who, what, when, where, why)
- Before/after values for updates
- IP address & user agent captured
- Stored for 2 years (configurable)

### Compliance
- Monthly reports auto-generated
- Includes transaction stats, role distribution, security events
- Emailed to stakeholders
- Exportable as CSV

---

## File Locations Summary

```
project/
├── scripts/
│   └── rbac-schema.sql                    (Database schema)
├── src/
│   ├── types/
│   │   └── rbac.ts                        (Types & constants)
│   ├── services/
│   │   ├── PermissionService.ts           (Permissions)
│   │   ├── ApprovalWorkflowService.ts     (Workflows)
│   │   └── AuditService.ts                (Audit & reports)
│   ├── middleware/
│   │   └── tenantIsolation.ts             (Tenant security)
│   └── ...
├── RBAC_QUICK_REFERENCE.txt               (Quick lookup)
├── RBAC_PERMISSION_MATRIX.md              (Detailed matrix)
├── RBAC_APPROVAL_WORKFLOWS.md             (Workflow guide)
├── RBAC_IMPLEMENTATION_SUMMARY.md         (Implementation)
└── RBAC_INDEX.md                          (This file)
```

---

## Getting Started

### Step 1: Database
```bash
mysql -u root -p < scripts/rbac-schema.sql
```

### Step 2: Review Types
```typescript
import { RoleCode, PermissionModule, hasPermission } from './src/types/rbac'
```

### Step 3: Add Services
```typescript
import PermissionService from './src/services/PermissionService'
import ApprovalWorkflowService from './src/services/ApprovalWorkflowService'
import AuditService from './src/services/AuditService'
```

### Step 4: Add Middleware
```typescript
import { createTenantIsolationMiddleware } from './src/middleware/tenantIsolation'
app.use(createTenantIsolationMiddleware(tenantService))
```

### Step 5: Protect Routes
```typescript
app.post('/api/donasi/:id/approve', async (req, res) => {
  await permissionService.checkPermission(
    req.user.id,
    req.tenantId,
    'donasi:approve'
  )
  // ... rest of logic
})
```

---

## Support

### Questions about Roles/Permissions?
→ See **RBAC_PERMISSION_MATRIX.md**

### How do workflows work?
→ See **RBAC_APPROVAL_WORKFLOWS.md**

### How to implement?
→ See **RBAC_IMPLEMENTATION_SUMMARY.md**

### Need quick lookup?
→ See **RBAC_QUICK_REFERENCE.txt**

---

## Success Criteria

You'll know the system is working when:
- ✓ All 6 roles can login with correct permissions
- ✓ Bendahara can approve/reject donasi & pengeluaran
- ✓ Kas updates automatically after approval
- ✓ Audit trail shows all transactions
- ✓ Monthly compliance reports generate
- ✓ Users can't access other mosque data
- ✓ Permissions update immediately on role change
- ✓ All notifications sent on time

---

**Ready to build?** Start with RBAC_QUICK_REFERENCE.txt then follow Path 2 above!
