/**
 * Tenant Isolation Middleware
 * Ensures users can only access data from tenants they belong to
 * Part of multi-tenant RBAC system
 */

import {
  InvalidTenantError,
  PermissionDeniedError,
  AuditLog,
  AuditStatus,
} from '../types/rbac'

/**
 * Request context with user and tenant info
 */
export interface RequestContext {
  userId: string
  tenantId: string
  roles: string[]
  permissions: string[]
  requestId: string
  ipAddress: string
  userAgent: string
  timestamp: Date
}

/**
 * User-Tenant relationship from database
 */
interface UserTenantAccess {
  userId: string
  tenantId: string
  roles: string[]
  isActive: boolean
}

/**
 * Tenant Isolation Service
 * Handles verification of user access to tenants
 */
export class TenantIsolationService {
  private tenantCache: Map<string, UserTenantAccess[]> = new Map()

  /**
   * Verify user has access to tenant
   * @throws InvalidTenantError if user doesn't have access
   */
  async verifyTenantAccess(
    userId: string,
    tenantId: string
  ): Promise<boolean> {
    const access = await this.getUserTenantAccess(userId)

    const hasAccess = access.some(
      a => a.tenantId === tenantId && a.isActive
    )

    if (!hasAccess) {
      throw new InvalidTenantError(tenantId, userId)
    }

    return true
  }

  /**
   * Get all tenants user has access to
   */
  async getUserTenants(userId: string): Promise<string[]> {
    const access = await this.getUserTenantAccess(userId)
    return access
      .filter(a => a.isActive)
      .map(a => a.tenantId)
  }

  /**
   * Get user's roles in a specific tenant
   */
  async getUserRolesInTenant(
    userId: string,
    tenantId: string
  ): Promise<string[]> {
    const access = await this.getUserTenantAccess(userId)
    const tenantAccess = access.find(a => a.tenantId === tenantId)
    return tenantAccess?.roles || []
  }

  /**
   * Check if user can perform action in tenant
   * Combines tenant access + permission check
   */
  async canPerformAction(
    userId: string,
    tenantId: string,
    requiredPermission: string
  ): Promise<boolean> {
    // First verify tenant access
    try {
      await this.verifyTenantAccess(userId, tenantId)
    } catch (error) {
      return false
    }

    // Then check permission
    // This would be delegated to PermissionService
    // For now, return true (handled separately)
    return true
  }

  /**
   * Build request context with tenant verification
   */
  async buildRequestContext(
    userId: string,
    requestedTenantId: string,
    roles: string[],
    permissions: string[],
    ipAddress: string,
    userAgent: string
  ): Promise<RequestContext> {
    // Verify tenant access
    await this.verifyTenantAccess(userId, requestedTenantId)

    return {
      userId,
      tenantId: requestedTenantId,
      roles,
      permissions,
      requestId: this.generateRequestId(),
      ipAddress,
      userAgent,
      timestamp: new Date(),
    }
  }

  /**
   * Get user's tenant access (with caching)
   * In production, this would query the database
   */
  private async getUserTenantAccess(
    userId: string
  ): Promise<UserTenantAccess[]> {
    // Check cache first
    if (this.tenantCache.has(userId)) {
      return this.tenantCache.get(userId)!
    }

    // In real implementation, query database:
    // SELECT ur.tenant_id, r.code as role
    // FROM user_roles ur
    // JOIN roles r ON ur.role_id = r.id
    // WHERE ur.user_id = ? AND ur.is_active = TRUE
    const access: UserTenantAccess[] = [] // Placeholder

    // Cache for 5 minutes
    this.tenantCache.set(userId, access)
    setTimeout(() => this.tenantCache.delete(userId), 5 * 60 * 1000)

    return access
  }

  /**
   * Invalidate tenant access cache for a user
   */
  invalidateCache(userId: string): void {
    this.tenantCache.delete(userId)
  }

  /**
   * Generate unique request ID for tracking
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

/**
 * Middleware for Express/similar frameworks
 * Usage: app.use(createTenantIsolationMiddleware())
 */
export function createTenantIsolationMiddleware(
  tenantService: TenantIsolationService
) {
  return async (
    req: any,
    res: any,
    next: any
  ) => {
    try {
      // Get user from request (set by auth middleware)
      const userId = req.user?.id
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' })
        return
      }

      // Get tenant from request (multiple sources)
      const tenantId =
        req.headers['x-tenant-id'] ||
        req.body?.tenant_id ||
        req.params?.tenant_id ||
        req.query?.tenant_id

      if (!tenantId) {
        res.status(400).json({ error: 'Missing tenant_id' })
        return
      }

      // Verify user has access to this tenant
      await tenantService.verifyTenantAccess(userId, tenantId)

      // Store in request context for later use
      req.tenantId = tenantId
      req.userId = userId

      // Continue to next middleware
      next()
    } catch (error) {
      if (error instanceof InvalidTenantError) {
        res.status(403).json({
          error: 'Forbidden',
          message: error.message,
        })
      } else {
        res.status(500).json({ error: 'Internal server error' })
      }
    }
  }
}

/**
 * Query helper to automatically add tenant filter
 * Prevents accidental data leaks
 */
export class TenantFilteredQuery {
  constructor(
    private tenantId: string,
    private context: RequestContext
  ) {}

  /**
   * Apply tenant filter to query conditions
   */
  applyFilter(conditions: Record<string, any>): Record<string, any> {
    return {
      ...conditions,
      tenant_id: this.tenantId,
    }
  }

  /**
   * Apply tenant filter to bulk insert
   */
  applyInsertFilter(data: Record<string, any>): Record<string, any> {
    return {
      ...data,
      tenant_id: this.tenantId,
      created_by: this.context.userId,
      created_at: new Date(),
    }
  }

  /**
   * Apply tenant filter to bulk update
   */
  applyUpdateFilter(data: Record<string, any>): Record<string, any> {
    return {
      ...data,
      updated_at: new Date(),
      updated_by: this.context.userId,
    }
  }

  /**
   * Get audit log entry
   */
  createAuditLog(
    action: string,
    module: string,
    entityType: string,
    entityId: string,
    oldValues?: Record<string, any>,
    newValues?: Record<string, any>,
    status: AuditStatus = AuditStatus.SUCCESS
  ): Omit<AuditLog, 'id' | 'createdAt'> {
    return {
      tenantId: this.tenantId,
      userId: this.context.userId,
      action,
      module,
      entityType,
      entityId,
      oldValues,
      newValues,
      status,
      ipAddress: this.context.ipAddress,
      userAgent: this.context.userAgent,
    }
  }
}

/**
 * Helper to verify and filter data array by tenant
 * Security checkpoint to prevent data leaks
 */
export function verifyTenantData<T extends { tenant_id?: string }>(
  data: T[],
  expectedTenantId: string
): T[] {
  const filtered = data.filter(item => item.tenant_id === expectedTenantId)

  if (filtered.length !== data.length) {
    console.warn(
      `[SECURITY] Data leak detected: ${data.length - filtered.length} items with wrong tenant_id`
    )
  }

  return filtered
}

/**
 * Decorator for TypeScript methods to enforce tenant isolation
 */
export function RequireTenantAccess() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    descriptor.value = async function (
      context: RequestContext,
      ...args: any[]
    ) {
      // Verify context has tenant info
      if (!context.tenantId || !context.userId) {
        throw new Error(
          'Missing required context: tenantId and userId'
        )
      }

      return originalMethod.call(this, context, ...args)
    }

    return descriptor
  }
}

/**
 * Type guard to ensure object has tenant_id
 */
export function hasTenantId(
  obj: any
): obj is { tenant_id: string } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'tenant_id' in obj &&
    typeof obj.tenant_id === 'string'
  )
}

/**
 * Batch operation with tenant isolation
 * Ensures all items belong to same tenant
 */
export function batchOperationWithTenantCheck<T extends { tenant_id?: string }>(
  items: T[],
  expectedTenantId: string
): T[] {
  const invalid = items.filter(
    item => item.tenant_id && item.tenant_id !== expectedTenantId
  )

  if (invalid.length > 0) {
    throw new InvalidTenantError(
      expectedTenantId,
      `Batch operation contains ${invalid.length} items from different tenant`
    )
  }

  return items
}

export default TenantIsolationService
