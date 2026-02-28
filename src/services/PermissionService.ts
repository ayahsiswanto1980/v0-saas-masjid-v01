/**
 * Permission Service
 * Handles all permission checking and RBAC logic
 */

import {
  RoleCode,
  Permission,
  PermissionDeniedError,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  ROLE_PERMISSIONS,
} from '../types/rbac'

/**
 * Permission Service
 * Centralizes all permission logic for consistency
 */
export class PermissionService {
  // Cache for permission checks (in production, use Redis)
  private permissionCache: Map<string, string[]> = new Map()
  private cacheTTL = 5 * 60 * 1000 // 5 minutes

  /**
   * Check if user has a single permission
   * @throws PermissionDeniedError if user doesn't have permission
   */
  async checkPermission(
    userId: string,
    tenantId: string,
    requiredPermission: string
  ): Promise<void> {
    const permissions = await this.getUserPermissions(userId, tenantId)

    if (!hasPermission(permissions, requiredPermission)) {
      throw new PermissionDeniedError(
        requiredPermission,
        userId,
        tenantId
      )
    }
  }

  /**
   * Check if user has a single permission (boolean return)
   */
  async hasPermission(
    userId: string,
    tenantId: string,
    requiredPermission: string
  ): Promise<boolean> {
    try {
      await this.checkPermission(userId, tenantId, requiredPermission)
      return true
    } catch {
      return false
    }
  }

  /**
   * Check if user has ALL of the required permissions
   * @throws PermissionDeniedError if missing any permission
   */
  async checkAllPermissions(
    userId: string,
    tenantId: string,
    requiredPermissions: string[]
  ): Promise<void> {
    const permissions = await this.getUserPermissions(userId, tenantId)

    const missing = requiredPermissions.filter(
      p => !hasPermission(permissions, p)
    )

    if (missing.length > 0) {
      throw new PermissionDeniedError(
        `${missing.join(', ')}`,
        userId,
        tenantId
      )
    }
  }

  /**
   * Check if user has ANY of the required permissions
   */
  async checkAnyPermission(
    userId: string,
    tenantId: string,
    requiredPermissions: string[]
  ): Promise<void> {
    const permissions = await this.getUserPermissions(userId, tenantId)

    if (!hasAnyPermission(permissions, requiredPermissions)) {
      throw new PermissionDeniedError(
        `Any of: ${requiredPermissions.join(', ')}`,
        userId,
        tenantId
      )
    }
  }

  /**
   * Get all permissions for a user in a tenant
   */
  async getUserPermissions(
    userId: string,
    tenantId: string
  ): Promise<string[]> {
    const cacheKey = `${userId}:${tenantId}`

    // Check cache
    if (this.permissionCache.has(cacheKey)) {
      const cached = this.permissionCache.get(cacheKey)
      if (cached) {
        return cached
      }
    }

    // Get roles for user in tenant
    const roles = await this.getUserRoles(userId, tenantId)

    // Get permissions for these roles
    const permissions = this.getPermissionsForRoles(roles)

    // Cache result
    this.permissionCache.set(cacheKey, permissions)
    setTimeout(() => this.permissionCache.delete(cacheKey), this.cacheTTL)

    return permissions
  }

  /**
   * Get all roles for user in a tenant
   * In production, query database
   */
  private async getUserRoles(
    userId: string,
    tenantId: string
  ): Promise<RoleCode[]> {
    // In production:
    // SELECT DISTINCT r.code
    // FROM user_roles ur
    // JOIN roles r ON ur.role_id = r.id
    // WHERE ur.user_id = ? AND ur.tenant_id = ? AND ur.is_active = TRUE

    // For now, return empty (placeholder)
    return []
  }

  /**
   * Get all permissions for a set of roles
   */
  private getPermissionsForRoles(roles: RoleCode[]): string[] {
    const allPermissions = new Set<string>()

    for (const role of roles) {
      const rolePerms = ROLE_PERMISSIONS[role]
      if (rolePerms) {
        rolePerms.forEach(perm => allPermissions.add(perm))
      }
    }

    return Array.from(allPermissions)
  }

  /**
   * Invalidate permission cache for a user
   */
  invalidateUserCache(userId: string, tenantId?: string): void {
    if (tenantId) {
      this.permissionCache.delete(`${userId}:${tenantId}`)
    } else {
      // Invalidate all cache entries for this user
      const keysToDelete: string[] = []
      this.permissionCache.forEach((_, key) => {
        if (key.startsWith(`${userId}:`)) {
          keysToDelete.push(key)
        }
      })
      keysToDelete.forEach(key => this.permissionCache.delete(key))
    }
  }

  /**
   * Check if user can delegate a permission to others
   */
  async canDelegate(
    userId: string,
    tenantId: string,
    permission: string
  ): Promise<boolean> {
    const roles = await this.getUserRoles(userId, tenantId)

    // Super Admin can always delegate
    if (roles.includes(RoleCode.SUPER_ADMIN)) {
      return true
    }

    // Admin Masjid can delegate most permissions
    if (roles.includes(RoleCode.ADMIN_MASJID)) {
      // Cannot delegate role management
      return !permission.includes('manage_roles')
    }

    // Others cannot delegate
    return false
  }

  /**
   * Get permission matrix for a role
   */
  getRolePermissions(role: RoleCode): string[] {
    return ROLE_PERMISSIONS[role] || []
  }

  /**
   * Get all roles
   */
  getAllRoles(): RoleCode[] {
    return Object.values(RoleCode)
  }

  /**
   * Compare two permission sets
   * Useful for migration or auditing
   */
  comparePermissions(
    before: string[],
    after: string[]
  ): {
    added: string[]
    removed: string[]
    unchanged: string[]
  } {
    const beforeSet = new Set(before)
    const afterSet = new Set(after)

    const added = after.filter(p => !beforeSet.has(p))
    const removed = before.filter(p => !afterSet.has(p))
    const unchanged = before.filter(p => afterSet.has(p))

    return { added, removed, unchanged }
  }

  /**
   * Validate permission exists
   */
  isValidPermission(permission: string): boolean {
    // Check against all permissions in the system
    // In production, would query permissions table
    const allPerms = Object.values(ROLE_PERMISSIONS)
      .flat()
    return allPerms.includes(permission)
  }

  /**
   * Get required approvers for an action
   * Used by approval workflow
   */
  getRequiredApprovers(
    action: string,
    tenantId: string
  ): RoleCode[] {
    // Map actions to required approver roles
    const approverMap: Record<string, RoleCode[]> = {
      'donasi:approve': [RoleCode.BENDAHARA],
      'pengeluaran:approve': [RoleCode.BENDAHARA],
      'jadwal:approve': [RoleCode.TAKMIR],
    }

    return approverMap[action] || []
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.permissionCache.clear()
  }
}

/**
 * Utility function for middleware to check permission
 */
export async function requirePermission(
  userId: string,
  tenantId: string,
  permission: string,
  permissionService: PermissionService
): Promise<boolean> {
  try {
    await permissionService.checkPermission(
      userId,
      tenantId,
      permission
    )
    return true
  } catch (error) {
    return false
  }
}

/**
 * Utility function for middleware to check multiple permissions
 */
export async function requireAnyPermission(
  userId: string,
  tenantId: string,
  permissions: string[],
  permissionService: PermissionService
): Promise<boolean> {
  try {
    await permissionService.checkAnyPermission(
      userId,
      tenantId,
      permissions
    )
    return true
  } catch (error) {
    return false
  }
}

export default PermissionService
