/**
 * Audit Service
 * Logs all user actions for compliance and monitoring
 * Generates monthly compliance reports
 */

import {
  AuditLog,
  AuditLogInput,
  AuditStatus,
  ComplianceReport,
  RoleCode,
} from '../types/rbac'

/**
 * Audit Service
 */
export class AuditService {
  private auditQueue: AuditLogInput[] = []

  /**
   * Log an action for audit trail
   * Asynchronous - queues for batch insertion
   */
  async logAction(input: AuditLogInput): Promise<AuditLog> {
    const auditLog: AuditLog = {
      id: this.generateId(),
      ...input,
      createdAt: new Date(),
    }

    // Queue for batch insertion
    this.auditQueue.push(input)

    // In production: Save to database
    // await db.audit_logs.insert(auditLog)

    // Flush queue if it reaches 100 items
    if (this.auditQueue.length >= 100) {
      await this.flushQueue()
    }

    return auditLog
  }

  /**
   * Log action with before/after values (for updates)
   */
  async logUpdate(
    tenantId: string,
    userId: string,
    action: string,
    module: string,
    entityType: string,
    entityId: string,
    beforeValues: Record<string, any>,
    afterValues: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuditLog> {
    return this.logAction({
      tenantId,
      userId,
      action,
      module,
      entityType,
      entityId,
      oldValues: beforeValues,
      newValues: afterValues,
      status: AuditStatus.SUCCESS,
      ipAddress,
      userAgent,
    })
  }

  /**
   * Log failed action
   */
  async logFailure(
    tenantId: string,
    userId: string,
    action: string,
    module: string,
    entityType: string,
    entityId: string,
    errorMessage: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuditLog> {
    return this.logAction({
      tenantId,
      userId,
      action,
      module,
      entityType,
      entityId,
      status: AuditStatus.FAILED,
      errorMessage,
      ipAddress,
      userAgent,
    })
  }

  /**
   * Get audit logs for a tenant
   */
  async getAuditLogs(
    tenantId: string,
    options: {
      limit?: number
      offset?: number
      module?: string
      action?: string
      startDate?: Date
      endDate?: Date
    } = {}
  ): Promise<{ logs: AuditLog[]; total: number }> {
    const {
      limit = 50,
      offset = 0,
      module,
      action,
      startDate,
      endDate,
    } = options

    // In production:
    // SELECT * FROM audit_logs
    // WHERE tenant_id = ?
    // AND (module = ? OR ? IS NULL)
    // AND (action = ? OR ? IS NULL)
    // AND (created_at >= ? OR ? IS NULL)
    // AND (created_at <= ? OR ? IS NULL)
    // ORDER BY created_at DESC
    // LIMIT ? OFFSET ?

    return { logs: [], total: 0 }
  }

  /**
   * Get audit logs for an entity
   */
  async getEntityAuditTrail(
    tenantId: string,
    entityType: string,
    entityId: string
  ): Promise<AuditLog[]> {
    // In production:
    // SELECT * FROM audit_logs
    // WHERE tenant_id = ? AND entity_type = ? AND entity_id = ?
    // ORDER BY created_at ASC

    return []
  }

  /**
   * Get audit logs for a user (security/compliance)
   */
  async getUserAuditTrail(
    tenantId: string,
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AuditLog[]> {
    // In production:
    // SELECT * FROM audit_logs
    // WHERE tenant_id = ? AND user_id = ?
    // AND (created_at >= ? OR ? IS NULL)
    // AND (created_at <= ? OR ? IS NULL)
    // ORDER BY created_at DESC

    return []
  }

  /**
   * Generate monthly compliance report
   * Called automatically at end of month
   */
  async generateComplianceReport(
    tenantId: string,
    year: number,
    month: number
  ): Promise<ComplianceReport> {
    const reportMonth = new Date(year, month - 1, 1)
    const nextMonth = new Date(year, month, 1)

    // Get statistics
    const stats = await this.getComplianceStats(
      tenantId,
      reportMonth,
      nextMonth
    )

    const reportContent = this.generateReportContent(
      tenantId,
      reportMonth,
      stats
    )

    const report: ComplianceReport = {
      id: this.generateId(),
      tenantId,
      reportMonth,
      totalTransactions: stats.totalTransactions,
      totalApprovals: stats.totalApprovals,
      totalRejections: stats.totalRejections,
      totalUsers: stats.totalUsers,
      roleDistribution: stats.roleDistribution,
      activitySummary: stats.activitySummary,
      securityEvents: stats.securityEvents,
      reportContent,
      generatedAt: new Date(),
    }

    // In production: Save to database
    // await db.compliance_reports.insert(report)

    return report
  }

  /**
   * Get compliance statistics
   */
  private async getComplianceStats(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalTransactions: number
    totalApprovals: number
    totalRejections: number
    totalUsers: number
    roleDistribution: Record<RoleCode, number>
    activitySummary: Record<string, number>
    securityEvents: Record<string, any>
  }> {
    // In production:
    // Multiple queries to gather all statistics

    return {
      totalTransactions: 0,
      totalApprovals: 0,
      totalRejections: 0,
      totalUsers: 0,
      roleDistribution: {
        [RoleCode.SUPER_ADMIN]: 0,
        [RoleCode.ADMIN_MASJID]: 0,
        [RoleCode.BENDAHARA]: 0,
        [RoleCode.TAKMIR]: 0,
        [RoleCode.USTADZ]: 0,
        [RoleCode.JAMAAH]: 0,
      },
      activitySummary: {},
      securityEvents: {},
    }
  }

  /**
   * Generate report content (HTML for email/PDF)
   */
  private generateReportContent(
    tenantId: string,
    reportMonth: Date,
    stats: any
  ): string {
    const monthName = reportMonth.toLocaleString('id-ID', { month: 'long', year: 'numeric' })

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
    th { background-color: #007bff; color: white; }
    .section { margin: 30px 0; }
    .footer { margin-top: 40px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <h1>Laporan Compliance - ${monthName}</h1>
  
  <div class="section">
    <h2>Ringkasan Statistik</h2>
    <table>
      <tr>
        <th>Metrik</th>
        <th>Nilai</th>
      </tr>
      <tr>
        <td>Total Transaksi</td>
        <td>${stats.totalTransactions}</td>
      </tr>
      <tr>
        <td>Total Approval</td>
        <td>${stats.totalApprovals}</td>
      </tr>
      <tr>
        <td>Total Rejection</td>
        <td>${stats.totalRejections}</td>
      </tr>
      <tr>
        <td>Total Pengguna Aktif</td>
        <td>${stats.totalUsers}</td>
      </tr>
    </table>
  </div>

  <div class="section">
    <h2>Distribusi Role</h2>
    <table>
      <tr>
        <th>Role</th>
        <th>Jumlah Pengguna</th>
      </tr>
      ${Object.entries(stats.roleDistribution)
        .map(
          ([role, count]) => `<tr><td>${role}</td><td>${count}</td></tr>`
        )
        .join('')}
    </table>
  </div>

  <div class="section">
    <h2>Ringkasan Aktivitas</h2>
    <table>
      <tr>
        <th>Modul</th>
        <th>Jumlah Aktivitas</th>
      </tr>
      ${Object.entries(stats.activitySummary)
        .map(
          ([module, count]) => `<tr><td>${module}</td><td>${count}</td></tr>`
        )
        .join('')}
    </table>
  </div>

  <div class="footer">
    <p>Laporan ini dihasilkan otomatis pada ${new Date().toLocaleString('id-ID')}</p>
    <p>Untuk informasi lebih lanjut, hubungi administrator sistem.</p>
  </div>
</body>
</html>
    `.trim()
  }

  /**
   * Export audit logs as CSV
   */
  async exportAuditLogsCSV(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<string> {
    const logs = await this.getAuditLogs(tenantId, {
      startDate,
      endDate,
      limit: 10000,
    })

    if (logs.logs.length === 0) {
      return 'No audit logs found'
    }

    // Build CSV header
    const headers = [
      'ID',
      'User ID',
      'Action',
      'Module',
      'Entity Type',
      'Entity ID',
      'Status',
      'Timestamp',
    ]

    // Build CSV rows
    const rows = logs.logs.map(log => [
      log.id,
      log.userId || '',
      log.action,
      log.module,
      log.entityType,
      log.entityId,
      log.status,
      log.createdAt.toISOString(),
    ])

    // Combine
    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(v => `"${v}"`).join(',')),
    ].join('\n')

    return csv
  }

  /**
   * Flush audit queue (batch insert)
   */
  async flushQueue(): Promise<void> {
    if (this.auditQueue.length === 0) {
      return
    }

    // In production:
    // await db.audit_logs.batchInsert(this.auditQueue)
    this.auditQueue = []
  }

  /**
   * Clean up old audit logs (retention policy)
   * Called by background job monthly
   */
  async cleanupOldLogs(tenantId: string, retentionDays: number): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    // In production:
    // DELETE FROM audit_logs
    // WHERE tenant_id = ? AND created_at < ?

    return 0
  }

  /**
   * Helper: Generate unique ID
   */
  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

export default AuditService
