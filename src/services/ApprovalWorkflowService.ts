/**
 * Approval Workflow Service
 * Handles donation and expense approval workflows
 * 
 * Approval Strategy:
 * - Bendahara is the single authority for ALL approvals
 * - No amount-based batching
 * - All transactions require explicit approval
 * - Complete audit trail for compliance
 */

import {
  ApprovalWorkflow,
  ApprovalStep,
  ApprovalStatus,
  EntityType,
  RoleCode,
  AuditLog,
  AuditStatus,
  PermissionDeniedError,
} from '../types/rbac'
import { PermissionService } from './PermissionService'

/**
 * Approval Workflow Service
 */
export class ApprovalWorkflowService {
  constructor(
    private permissionService: PermissionService
  ) {}

  /**
   * Create a new approval workflow for donasi or pengeluaran
   * 
   * For both donasi & pengeluaran:
   * - Single step: Bendahara approval
   * - No amount-based batching
   */
  async createApprovalWorkflow(
    tenantId: string,
    entityType: EntityType,
    entityId: string,
    createdByUserId: string
  ): Promise<ApprovalWorkflow> {
    // Create workflow record
    const workflow: ApprovalWorkflow = {
      id: this.generateId(),
      tenantId,
      entityType,
      entityId,
      currentStep: 1,
      totalSteps: 1, // Single approval step
      status: ApprovalStatus.PENDING,
      createdBy: createdByUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
      steps: [],
    }

    // Create approval steps
    // For both donasi & pengeluaran: Only Bendahara approval
    const bendaharaStep: ApprovalStep = {
      id: this.generateId(),
      workflowId: workflow.id,
      stepOrder: 1,
      approverRole: RoleCode.BENDAHARA,
      status: 'PENDING',
      createdAt: new Date(),
    }

    workflow.steps = [bendaharaStep]

    // In production, save to database
    // await db.approval_workflows.insert(workflow)
    // await db.approval_steps.insert(bendaharaStep)

    return workflow
  }

  /**
   * Submit for approval (create workflow if not exists)
   * Called when Jamaah/Takmir creates donasi or pengeluaran
   */
  async submitForApproval(
    tenantId: string,
    entityType: EntityType,
    entityId: string,
    createdByUserId: string
  ): Promise<ApprovalWorkflow> {
    const workflow = await this.createApprovalWorkflow(
      tenantId,
      entityType,
      entityId,
      createdByUserId
    )

    // Entity status automatically set to PENDING_APPROVAL by caller
    // This service only manages the workflow

    return workflow
  }

  /**
   * Get approval workflow by entity
   */
  async getApprovalWorkflow(
    tenantId: string,
    entityType: EntityType,
    entityId: string
  ): Promise<ApprovalWorkflow | null> {
    // In production:
    // SELECT * FROM approval_workflows
    // WHERE tenant_id = ? AND entity_type = ? AND entity_id = ?
    // Placeholder
    return null
  }

  /**
   * BENDAHARA: Approve donation/expense
   * 
   * Only Bendahara can approve
   * No amount batching - ALL amounts require approval
   */
  async approveDonasi(
    tenantId: string,
    dosasiId: string,
    bendaharaUserId: string,
    notes?: string
  ): Promise<ApprovalWorkflow> {
    // Verify Bendahara permission
    const hasPerm = await this.permissionService.hasPermission(
      bendaharaUserId,
      tenantId,
      'donasi:approve'
    )

    if (!hasPerm) {
      throw new PermissionDeniedError(
        'donasi:approve',
        bendaharaUserId,
        tenantId
      )
    }

    // Get workflow
    const workflow = await this.getApprovalWorkflow(
      tenantId,
      EntityType.DONASI,
      dosasiId
    )

    if (!workflow) {
      throw new Error(`Workflow not found for donasi ${dosasiId}`)
    }

    // Update approval step
    const bendaharaStep = workflow.steps?.find(
      s => s.approverRole === RoleCode.BENDAHARA
    )

    if (!bendaharaStep) {
      throw new Error('Bendahara approval step not found')
    }

    bendaharaStep.status = 'APPROVED'
    bendaharaStep.approvedBy = bendaharaUserId
    bendaharaStep.approvedAt = new Date()
    bendaharaStep.notes = notes

    // Mark workflow as approved
    workflow.status = ApprovalStatus.APPROVED
    workflow.currentStep = 1 // Only 1 step
    workflow.updatedAt = new Date()
    workflow.completedAt = new Date()

    // In production:
    // await db.approval_workflows.update(workflow.id, workflow)
    // await db.approval_steps.update(bendaharaStep.id, bendaharaStep)
    // await db.donasi.update(id, { status: 'APPROVED' })

    return workflow
  }

  /**
   * BENDAHARA: Approve expense
   * 
   * Same as donation approval - single Bendahara authority
   */
  async approvePengeluaran(
    tenantId: string,
    pengeluaranId: string,
    bendaharaUserId: string,
    notes?: string
  ): Promise<ApprovalWorkflow> {
    // Verify Bendahara permission
    const hasPerm = await this.permissionService.hasPermission(
      bendaharaUserId,
      tenantId,
      'pengeluaran:approve'
    )

    if (!hasPerm) {
      throw new PermissionDeniedError(
        'pengeluaran:approve',
        bendaharaUserId,
        tenantId
      )
    }

    // Get workflow
    const workflow = await this.getApprovalWorkflow(
      tenantId,
      EntityType.PENGELUARAN,
      pengeluaranId
    )

    if (!workflow) {
      throw new Error(
        `Workflow not found for pengeluaran ${pengeluaranId}`
      )
    }

    // Update approval step
    const bendaharaStep = workflow.steps?.find(
      s => s.approverRole === RoleCode.BENDAHARA
    )

    if (!bendaharaStep) {
      throw new Error('Bendahara approval step not found')
    }

    bendaharaStep.status = 'APPROVED'
    bendaharaStep.approvedBy = bendaharaUserId
    bendaharaStep.approvedAt = new Date()
    bendaharaStep.notes = notes

    // Mark workflow as approved
    workflow.status = ApprovalStatus.APPROVED
    workflow.currentStep = 1 // Only 1 step
    workflow.updatedAt = new Date()
    workflow.completedAt = new Date()

    // In production:
    // await db.approval_workflows.update(workflow.id, workflow)
    // await db.approval_steps.update(bendaharaStep.id, bendaharaStep)
    // await db.pengeluaran.update(id, { status: 'APPROVED', approved_at: now() })

    return workflow
  }

  /**
   * BENDAHARA: Reject donation/expense
   */
  async rejectDonasi(
    tenantId: string,
    donasiId: string,
    bendaharaUserId: string,
    rejectionReason: string
  ): Promise<ApprovalWorkflow> {
    // Verify permission
    const hasPerm = await this.permissionService.hasPermission(
      bendaharaUserId,
      tenantId,
      'donasi:approve'
    )

    if (!hasPerm) {
      throw new PermissionDeniedError(
        'donasi:approve',
        bendaharaUserId,
        tenantId
      )
    }

    // Get workflow
    const workflow = await this.getApprovalWorkflow(
      tenantId,
      EntityType.DONASI,
      donasiId
    )

    if (!workflow) {
      throw new Error(`Workflow not found for donasi ${donasiId}`)
    }

    // Update approval step
    const bendaharaStep = workflow.steps?.find(
      s => s.approverRole === RoleCode.BENDAHARA
    )

    if (!bendaharaStep) {
      throw new Error('Bendahara approval step not found')
    }

    bendaharaStep.status = 'REJECTED'
    bendaharaStep.approvedBy = bendaharaUserId
    bendaharaStep.approvedAt = new Date()
    bendaharaStep.notes = rejectionReason

    // Mark workflow as rejected
    workflow.status = ApprovalStatus.REJECTED
    workflow.updatedAt = new Date()
    workflow.completedAt = new Date()

    // In production:
    // await db.approval_workflows.update(workflow.id, workflow)
    // await db.approval_steps.update(bendaharaStep.id, bendaharaStep)
    // await db.donasi.update(id, { status: 'REJECTED' })

    return workflow
  }

  /**
   * BENDAHARA: Reject expense
   */
  async rejectPengeluaran(
    tenantId: string,
    pengeluaranId: string,
    bendaharaUserId: string,
    rejectionReason: string
  ): Promise<ApprovalWorkflow> {
    // Verify permission
    const hasPerm = await this.permissionService.hasPermission(
      bendaharaUserId,
      tenantId,
      'pengeluaran:approve'
    )

    if (!hasPerm) {
      throw new PermissionDeniedError(
        'pengeluaran:approve',
        bendaharaUserId,
        tenantId
      )
    }

    // Get workflow
    const workflow = await this.getApprovalWorkflow(
      tenantId,
      EntityType.PENGELUARAN,
      pengeluaranId
    )

    if (!workflow) {
      throw new Error(
        `Workflow not found for pengeluaran ${pengeluaranId}`
      )
    }

    // Update approval step
    const bendaharaStep = workflow.steps?.find(
      s => s.approverRole === RoleCode.BENDAHARA
    )

    if (!bendaharaStep) {
      throw new Error('Bendahara approval step not found')
    }

    bendaharaStep.status = 'REJECTED'
    bendaharaStep.approvedBy = bendaharaUserId
    bendaharaStep.approvedAt = new Date()
    bendaharaStep.notes = rejectionReason

    // Mark workflow as rejected
    workflow.status = ApprovalStatus.REJECTED
    workflow.updatedAt = new Date()
    workflow.completedAt = new Date()

    // In production:
    // await db.approval_workflows.update(workflow.id, workflow)
    // await db.approval_steps.update(bendaharaStep.id, bendaharaStep)
    // await db.pengeluaran.update(id, { status: 'REJECTED' })

    return workflow
  }

  /**
   * Get pending approvals for a Bendahara
   */
  async getPendingApprovals(
    tenantId: string,
    bendaharaUserId: string
  ): Promise<ApprovalWorkflow[]> {
    // Verify Bendahara role
    const hasPerm = await this.permissionService.hasPermission(
      bendaharaUserId,
      tenantId,
      'donasi:approve'
    )

    if (!hasPerm) {
      return []
    }

    // In production:
    // SELECT aw.* FROM approval_workflows aw
    // WHERE aw.tenant_id = ? AND aw.status = 'PENDING'
    // AND EXISTS (
    //   SELECT 1 FROM approval_steps ast
    //   WHERE ast.workflow_id = aw.id
    //   AND ast.approver_role = 'BENDAHARA'
    //   AND ast.status = 'PENDING'
    // )

    return []
  }

  /**
   * Get approval statistics for audit reports
   */
  async getApprovalStats(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalSubmitted: number
    totalApproved: number
    totalRejected: number
    avgApprovalTime: number // in hours
    donasiStats: {
      submitted: number
      approved: number
      rejected: number
    }
    pengeluaranStats: {
      submitted: number
      approved: number
      rejected: number
    }
  }> {
    // In production:
    // SELECT
    //   COUNT(*) as totalSubmitted,
    //   SUM(CASE WHEN status = 'APPROVED' THEN 1 ELSE 0 END) as totalApproved,
    //   SUM(CASE WHEN status = 'REJECTED' THEN 1 ELSE 0 END) as totalRejected,
    //   AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) / 3600 as avgApprovalTime
    // FROM approval_workflows
    // WHERE tenant_id = ? AND created_at BETWEEN ? AND ?

    return {
      totalSubmitted: 0,
      totalApproved: 0,
      totalRejected: 0,
      avgApprovalTime: 0,
      donasiStats: {
        submitted: 0,
        approved: 0,
        rejected: 0,
      },
      pengeluaranStats: {
        submitted: 0,
        approved: 0,
        rejected: 0,
      },
    }
  }

  /**
   * Helper: Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

export default ApprovalWorkflowService
