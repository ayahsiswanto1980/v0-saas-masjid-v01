/**
 * RBAC Types and Constants
 * Role-Based Access Control system for Mosque Management SaaS
 */

// ============================================================================
// ROLE DEFINITIONS
// ============================================================================

export enum RoleCode {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN_MASJID = 'ADMIN_MASJID',
  BENDAHARA = 'BENDAHARA',
  TAKMIR = 'TAKMIR',
  USTADZ = 'USTADZ',
  JAMAAH = 'JAMAAH',
}

export enum RoleScope {
  PLATFORM = 'PLATFORM', // Super Admin only
  MOSQUE = 'MOSQUE', // All others
}

export interface Role {
  id: string
  code: RoleCode
  name: string
  description?: string
  scope: RoleScope
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// PERMISSION DEFINITIONS
// ============================================================================

export enum PermissionModule {
  JAMAAH = 'jamaah',
  JADWAL = 'jadwal',
  DONASI = 'donasi',
  PENGELUARAN = 'pengeluaran',
  KAS = 'kas',
  LAPORAN = 'laporan',
  PENGATURAN = 'pengaturan',
}

export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  APPROVE = 'approve',
  REJECT = 'reject',
  EXPORT = 'export',
}

export interface Permission {
  id: string
  code: string // e.g., 'jamaah:create'
  name: string
  description?: string
  module: PermissionModule
  action: PermissionAction
  requireApproval: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// ============================================================================
// ROLE-PERMISSION MAPPING
// ============================================================================

export interface RolePermission {
  id: string
  roleId: string
  permissionId: string
  tenantId?: string // NULL for platform-wide, specific ID for mosque-level
  canDelegate: boolean
  createdAt: Date
}

// ============================================================================
// USER ROLES
// ============================================================================

export interface UserRole {
  id: string
  userId: string
  roleId: string
  tenantId: string // Specific mosque
  assignedBy?: string
  assignedAt: Date
  expiresAt?: Date
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface UserWithRoles {
  id: string
  email: string
  nama: string
  roles: UserRole[]
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

export enum AuditStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  PENDING = 'PENDING',
}

export interface AuditLog {
  id: string
  tenantId: string
  userId?: string
  action: string // e.g., 'donasi:create', 'user:role_assign'
  module: string
  entityType: string // Type being modified
  entityId: string // ID of the entity
  oldValues?: Record<string, any>
  newValues?: Record<string, any>
  status: AuditStatus
  errorMessage?: string
  ipAddress?: string
  userAgent?: string
  createdAt: Date
}

export interface AuditLogInput {
  tenantId: string
  userId?: string
  action: string
  module: string
  entityType: string
  entityId: string
  oldValues?: Record<string, any>
  newValues?: Record<string, any>
  status?: AuditStatus
  errorMessage?: string
  ipAddress?: string
  userAgent?: string
}

// ============================================================================
// APPROVAL WORKFLOWS
// ============================================================================

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELED = 'CANCELED',
}

export enum EntityType {
  DONASI = 'donasi',
  PENGELUARAN = 'pengeluaran',
}

export interface ApprovalWorkflow {
  id: string
  tenantId: string
  entityType: EntityType
  entityId: string
  currentStep: number
  totalSteps: number
  status: ApprovalStatus
  createdBy: string
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
  steps?: ApprovalStep[]
}

export interface ApprovalStep {
  id: string
  workflowId: string
  stepOrder: number
  approverRole: RoleCode
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  approvedBy?: string
  approvedAt?: Date
  notes?: string
  createdAt: Date
}

export interface ApprovalWorkflowInput {
  entityType: EntityType
  entityId: string
  approverRoles: RoleCode[] // Roles that can approve at each step
}

// ============================================================================
// COMPLIANCE & REPORTING
// ============================================================================

export interface TenantAuditSettings {
  id: string
  tenantId: string
  enableAuditLog: boolean
  retentionDays: number
  enableComplianceReports: boolean
  reportRecipients?: string[]
  approvalRequiredForDonation: boolean
  approvalRequiredForExpense: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ComplianceReport {
  id: string
  tenantId: string
  reportMonth: Date
  totalTransactions: number
  totalApprovals: number
  totalRejections: number
  totalUsers: number
  roleDistribution: Record<RoleCode, number>
  activitySummary: Record<PermissionModule, number>
  securityEvents?: Record<string, any>
  reportContent: string
  generatedAt: Date
  generatedBy?: string
}

// ============================================================================
// PERMISSION MATRIX
// For easy querying and caching
// ============================================================================

export interface PermissionMatrix {
  roleCode: RoleCode
  roleName: string
  permissions: string[] // ['jamaah:read', 'donasi:approve', ...]
}

export interface RolePermissionMatrix {
  [roleCode in RoleCode]?: string[]
}

// ============================================================================
// PERMISSION CHECKER CONTEXT
// ============================================================================

export interface PermissionCheckerContext {
  userId: string
  tenantId: string
  roles: RoleCode[]
  permissions: string[]
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class PermissionDeniedError extends Error {
  constructor(
    public permission: string,
    public userId: string,
    public tenantId: string
  ) {
    super(
      `Permission denied: ${permission} for user ${userId} in tenant ${tenantId}`
    )
    this.name = 'PermissionDeniedError'
  }
}

export class RoleNotFoundError extends Error {
  constructor(public roleId: string) {
    super(`Role not found: ${roleId}`)
    this.name = 'RoleNotFoundError'
  }
}

export class InvalidTenantError extends Error {
  constructor(public tenantId: string, public userId: string) {
    super(
      `User ${userId} does not have access to tenant ${tenantId}`
    )
    this.name = 'InvalidTenantError'
  }
}

// ============================================================================
// PERMISSION MATRIX CONSTANT
// Predefined matrix for quick access
// ============================================================================

export const ROLE_PERMISSIONS: RolePermissionMatrix = {
  [RoleCode.SUPER_ADMIN]: [
    // All permissions
    'jamaah:create', 'jamaah:read', 'jamaah:update', 'jamaah:delete',
    'jadwal:create', 'jadwal:read', 'jadwal:update', 'jadwal:approve',
    'donasi:create', 'donasi:read', 'donasi:approve', 'donasi:export',
    'pengeluaran:create', 'pengeluaran:read', 'pengeluaran:approve', 'pengeluaran:export',
    'kas:read', 'kas:report',
    'laporan:read', 'laporan:export', 'laporan:audit',
    'pengaturan:read', 'pengaturan:update', 'pengaturan:manage_roles', 'pengaturan:manage_users',
  ],
  [RoleCode.ADMIN_MASJID]: [
    'jamaah:create', 'jamaah:read', 'jamaah:update', 'jamaah:delete',
    'jadwal:create', 'jadwal:read', 'jadwal:update',
    'donasi:read', 'donasi:export',
    'pengeluaran:read', 'pengeluaran:export',
    'kas:read', 'kas:report',
    'laporan:read', 'laporan:export', 'laporan:audit',
    'pengaturan:read', 'pengaturan:update', 'pengaturan:manage_users',
  ],
  [RoleCode.BENDAHARA]: [
    'donasi:read', 'donasi:approve', 'donasi:export',
    'pengeluaran:read', 'pengeluaran:approve', 'pengeluaran:export',
    'kas:read', 'kas:report',
    'laporan:read', 'laporan:export', 'laporan:audit',
    'jamaah:read',
  ],
  [RoleCode.TAKMIR]: [
    'jamaah:read', 'jamaah:create', 'jamaah:update',
    'jadwal:read', 'jadwal:create', 'jadwal:update',
    'donasi:read',
    'pengeluaran:read',
    'kas:read',
    'laporan:read',
  ],
  [RoleCode.USTADZ]: [
    'jadwal:read', 'jadwal:create', 'jadwal:update',
    'jamaah:read',
    'laporan:read',
  ],
  [RoleCode.JAMAAH]: [
    'donasi:create',
    'jadwal:read',
    'laporan:read',
  ],
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Build permission code from module and action
 */
export function buildPermissionCode(
  module: PermissionModule,
  action: PermissionAction
): string {
  return `${module}:${action}`
}

/**
 * Parse permission code into module and action
 */
export function parsePermissionCode(code: string): {
  module: string
  action: string
} {
  const [module, action] = code.split(':')
  return { module, action }
}

/**
 * Check if user has permission
 */
export function hasPermission(
  userPermissions: string[],
  requiredPermission: string
): boolean {
  return userPermissions.includes(requiredPermission)
}

/**
 * Check if user has any of the permissions
 */
export function hasAnyPermission(
  userPermissions: string[],
  requiredPermissions: string[]
): boolean {
  return requiredPermissions.some(perm => userPermissions.includes(perm))
}

/**
 * Check if user has all of the permissions
 */
export function hasAllPermissions(
  userPermissions: string[],
  requiredPermissions: string[]
): boolean {
  return requiredPermissions.every(perm => userPermissions.includes(perm))
}
