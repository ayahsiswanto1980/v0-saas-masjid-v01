-- ============================================================================
-- RBAC Schema for Mosque Management SaaS
-- Multi-Tenant Role-Based Access Control with Audit Trail
-- ============================================================================

-- ============================================================================
-- 1. ROLES TABLE
-- Core role definitions for the platform
-- ============================================================================
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  scope VARCHAR(20) NOT NULL DEFAULT 'MOSQUE',
  -- scope: PLATFORM (Super Admin) or MOSQUE (all others)
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT roles_code_check CHECK (code IN (
    'SUPER_ADMIN', 'ADMIN_MASJID', 'BENDAHARA', 
    'TAKMIR', 'USTADZ', 'JAMAAH'
  ))
);

-- ============================================================================
-- 2. PERMISSIONS TABLE
-- Granular permissions for each action
-- ============================================================================
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) NOT NULL UNIQUE,
  -- Format: MODULE:ACTION (e.g., 'jamaah:create', 'donasi:approve')
  name VARCHAR(150) NOT NULL,
  description TEXT,
  module VARCHAR(50) NOT NULL,
  -- Modules: jamaah, jadwal, donasi, pengeluaran, kas, laporan, pengaturan, etc
  action VARCHAR(50) NOT NULL,
  -- Actions: create, read, update, delete, approve, export, etc
  require_approval BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_module_action (module, action),
  INDEX idx_code (code)
);

-- ============================================================================
-- 3. ROLE_PERMISSIONS MAPPING
-- Maps roles to their permissions with tenant context
-- ============================================================================
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL,
  permission_id UUID NOT NULL,
  tenant_id UUID,
  -- NULL for platform-wide, specific UUID for mosque-level
  can_delegate BOOLEAN DEFAULT FALSE,
  -- True if this role can assign this permission to others
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
  
  UNIQUE KEY unique_role_permission (role_id, permission_id, tenant_id),
  INDEX idx_role_id (role_id),
  INDEX idx_permission_id (permission_id),
  INDEX idx_tenant_id (tenant_id)
);

-- ============================================================================
-- 4. USER_ROLES MAPPING
-- Assigns roles to users with tenant scope
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  -- Specific mosque the user has this role in
  assigned_by UUID,
  -- Admin who assigned this role
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  -- Role expiration (optional)
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  
  UNIQUE KEY unique_user_tenant_role (user_id, tenant_id, role_id),
  INDEX idx_user_id (user_id),
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_role_id (role_id),
  INDEX idx_is_active (is_active)
);

-- ============================================================================
-- 5. AUDIT_LOGS TABLE
-- Complete audit trail for compliance and monitoring
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID,
  action VARCHAR(100) NOT NULL,
  -- e.g., 'donasi:create', 'pengeluaran:approve', 'user:role_assign'
  module VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  -- Type being modified: donasi, pengeluaran, jadwal, etc
  entity_id VARCHAR(100) NOT NULL,
  -- ID of the entity being modified
  old_values JSON,
  -- Before values (for updates)
  new_values JSON,
  -- After values (for updates)
  status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
  -- SUCCESS, FAILED, PENDING
  error_message TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_user_id (user_id),
  INDEX idx_entity_id (entity_id),
  INDEX idx_module (module),
  INDEX idx_action (action),
  INDEX idx_created_at (created_at),
  INDEX idx_status (status)
);

-- ============================================================================
-- 6. APPROVAL_WORKFLOWS TABLE
-- Tracks approval state for donasi and pengeluaran
-- ============================================================================
CREATE TABLE IF NOT EXISTS approval_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  -- 'donasi' or 'pengeluaran'
  entity_id UUID NOT NULL,
  current_step INT DEFAULT 1,
  total_steps INT DEFAULT 1,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  -- PENDING, APPROVED, REJECTED, CANCELED
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_entity_type_id (entity_type, entity_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);

-- ============================================================================
-- 7. APPROVAL_STEPS TABLE
-- Individual approval steps in a workflow
-- ============================================================================
CREATE TABLE IF NOT EXISTS approval_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL,
  step_order INT NOT NULL,
  approver_role VARCHAR(50) NOT NULL,
  -- Role required to approve (e.g., 'BENDAHARA')
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  -- PENDING, APPROVED, REJECTED
  approved_by UUID,
  approved_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (workflow_id) REFERENCES approval_workflows(id) ON DELETE CASCADE,
  
  INDEX idx_workflow_id (workflow_id),
  INDEX idx_status (status),
  INDEX idx_approver_role (approver_role)
);

-- ============================================================================
-- 8. TENANT_AUDIT_SETTINGS TABLE
-- Configure audit and compliance settings per tenant
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenant_audit_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE,
  enable_audit_log BOOLEAN DEFAULT TRUE,
  retention_days INT DEFAULT 730,
  -- 2 years
  enable_compliance_reports BOOLEAN DEFAULT TRUE,
  report_recipients JSON,
  -- Array of emails for monthly reports
  approval_required_for_donation BOOLEAN DEFAULT TRUE,
  approval_required_for_expense BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_tenant_id (tenant_id)
);

-- ============================================================================
-- 9. PERMISSION MATRIX VIEW
-- For easy querying of all role-permission mappings
-- ============================================================================
CREATE VIEW permission_matrix AS
SELECT 
  r.code as role_code,
  r.name as role_name,
  p.code as permission_code,
  p.name as permission_name,
  p.module,
  p.action,
  rp.tenant_id,
  rp.can_delegate
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.is_active = TRUE AND p.is_active = TRUE;

-- ============================================================================
-- 10. COMPLIANCE_REPORTS TABLE
-- Generated monthly compliance and audit reports
-- ============================================================================
CREATE TABLE IF NOT EXISTS compliance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  report_month DATE NOT NULL,
  -- First day of the month
  total_transactions INT,
  total_approvals INT,
  total_rejections INT,
  total_users INT,
  role_distribution JSON,
  -- {role: count} mapping
  activity_summary JSON,
  -- {module: count} mapping
  security_events JSON,
  -- Suspicious activities
  report_content LONGTEXT,
  -- Full report HTML/PDF content
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  generated_by UUID,
  
  UNIQUE KEY unique_tenant_month (tenant_id, report_month),
  INDEX idx_tenant_id (tenant_id),
  INDEX idx_report_month (report_month)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX idx_user_roles_user_tenant ON user_roles(user_id, tenant_id);
CREATE INDEX idx_user_roles_tenant_role ON user_roles(tenant_id, role_id);
CREATE INDEX idx_audit_logs_tenant_created ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_approval_workflows_tenant_entity ON approval_workflows(tenant_id, entity_type, entity_id);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update role updated_at timestamp
DELIMITER $$
CREATE TRIGGER update_role_timestamp 
BEFORE UPDATE ON roles
FOR EACH ROW
BEGIN
  SET NEW.updated_at = CURRENT_TIMESTAMP;
END$$
DELIMITER ;

-- Update permission updated_at timestamp
DELIMITER $$
CREATE TRIGGER update_permission_timestamp 
BEFORE UPDATE ON permissions
FOR EACH ROW
BEGIN
  SET NEW.updated_at = CURRENT_TIMESTAMP;
END$$
DELIMITER ;

-- Auto-create audit log when user roles change
DELIMITER $$
CREATE TRIGGER audit_user_role_assignment
AFTER INSERT ON user_roles
FOR EACH ROW
BEGIN
  INSERT INTO audit_logs (
    tenant_id, user_id, action, module, 
    entity_type, entity_id, new_values, status
  ) VALUES (
    NEW.tenant_id,
    NEW.assigned_by,
    'role:assign',
    'security',
    'user_role',
    CAST(NEW.id AS CHAR),
    JSON_OBJECT('user_id', NEW.user_id, 'role_id', NEW.role_id),
    'SUCCESS'
  );
END$$
DELIMITER ;

-- ============================================================================
-- SEED DATA: Default Roles
-- ============================================================================
INSERT INTO roles (code, name, description, scope) VALUES
('SUPER_ADMIN', 'Super Admin', 'Platform administrator with full access', 'PLATFORM'),
('ADMIN_MASJID', 'Admin Masjid', 'Mosque administrator', 'MOSQUE'),
('BENDAHARA', 'Bendahara', 'Treasurer - manages finances and approvals', 'MOSQUE'),
('TAKMIR', 'Takmir', 'Mosque committee member', 'MOSQUE'),
('USTADZ', 'Ustadz', 'Islamic scholar and teacher', 'MOSQUE'),
('JAMAAH', 'Jamaah', 'Congregation member', 'MOSQUE')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- ============================================================================
-- SEED DATA: Default Permissions
-- ============================================================================
INSERT INTO permissions (code, name, description, module, action, require_approval) VALUES
-- Jamaah Management
('jamaah:create', 'Buat Anggota Jamaah', 'Create congregation member', 'jamaah', 'create', FALSE),
('jamaah:read', 'Lihat Anggota Jamaah', 'View congregation members', 'jamaah', 'read', FALSE),
('jamaah:update', 'Edit Anggota Jamaah', 'Edit congregation member', 'jamaah', 'update', FALSE),
('jamaah:delete', 'Hapus Anggota Jamaah', 'Delete congregation member', 'jamaah', 'delete', FALSE),

-- Schedule Management
('jadwal:create', 'Buat Jadwal', 'Create schedule', 'jadwal', 'create', FALSE),
('jadwal:read', 'Lihat Jadwal', 'View schedule', 'jadwal', 'read', FALSE),
('jadwal:update', 'Edit Jadwal', 'Update schedule', 'jadwal', 'update', FALSE),
('jadwal:approve', 'Approve Jadwal', 'Approve schedule changes', 'jadwal', 'approve', TRUE),

-- Donation Management
('donasi:create', 'Buat Donasi', 'Create donation', 'donasi', 'create', FALSE),
('donasi:read', 'Lihat Donasi', 'View donations', 'donasi', 'read', FALSE),
('donasi:approve', 'Approve Donasi', 'Approve donation', 'donasi', 'approve', TRUE),
('donasi:export', 'Export Donasi', 'Export donation reports', 'donasi', 'export', FALSE),

-- Expense Management
('pengeluaran:create', 'Buat Pengeluaran', 'Create expense', 'pengeluaran', 'create', FALSE),
('pengeluaran:read', 'Lihat Pengeluaran', 'View expenses', 'pengeluaran', 'read', FALSE),
('pengeluaran:approve', 'Approve Pengeluaran', 'Approve expense', 'pengeluaran', 'approve', TRUE),
('pengeluaran:export', 'Export Pengeluaran', 'Export expense reports', 'pengeluaran', 'export', FALSE),

-- Finance & Cash
('kas:read', 'Lihat Kas', 'View cash/balance', 'kas', 'read', FALSE),
('kas:report', 'Report Kas', 'Generate cash reports', 'kas', 'report', FALSE),

-- Reports
('laporan:read', 'Lihat Laporan', 'View reports', 'laporan', 'read', FALSE),
('laporan:export', 'Export Laporan', 'Export reports', 'laporan', 'export', FALSE),
('laporan:audit', 'Audit Trail', 'View audit logs', 'laporan', 'audit', FALSE),

-- Settings
('pengaturan:read', 'Lihat Pengaturan', 'View settings', 'pengaturan', 'read', FALSE),
('pengaturan:update', 'Edit Pengaturan', 'Update settings', 'pengaturan', 'update', FALSE),
('pengaturan:manage_roles', 'Kelola Role', 'Manage roles and permissions', 'pengaturan', 'manage_roles', FALSE),
('pengaturan:manage_users', 'Kelola User', 'Manage users', 'pengaturan', 'manage_users', FALSE)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- ============================================================================
-- SEED DATA: Role-Permission Mappings
-- ============================================================================
INSERT INTO role_permissions (role_id, permission_id, tenant_id, can_delegate)
SELECT r.id, p.id, NULL, (r.code = 'SUPER_ADMIN')
FROM roles r, permissions p
WHERE r.code = 'SUPER_ADMIN'
ON DUPLICATE KEY UPDATE can_delegate=VALUES(can_delegate);

-- Super Admin can delegate all
INSERT INTO role_permissions (role_id, permission_id, tenant_id, can_delegate)
SELECT r.id, p.id, NULL, TRUE
FROM roles r, permissions p
WHERE r.code = 'SUPER_ADMIN'
ON DUPLICATE KEY UPDATE can_delegate=VALUES(can_delegate);

-- Admin Masjid: Full control of own mosque
INSERT INTO role_permissions (role_id, permission_id, tenant_id, can_delegate)
SELECT r.id, p.id, NULL, TRUE
FROM roles r, permissions p
WHERE r.code = 'ADMIN_MASJID'
  AND p.code NOT IN ('pengaturan:manage_roles')
ON DUPLICATE KEY UPDATE can_delegate=VALUES(can_delegate);

-- Bendahara: Finance operations + approvals
INSERT INTO role_permissions (role_id, permission_id, tenant_id, can_delegate)
SELECT r.id, p.id, NULL, FALSE
FROM roles r, permissions p
WHERE r.code = 'BENDAHARA'
  AND p.code IN (
    'donasi:read', 'donasi:approve', 'donasi:export',
    'pengeluaran:read', 'pengeluaran:approve', 'pengeluaran:export',
    'kas:read', 'kas:report', 'laporan:read', 'laporan:export',
    'laporan:audit', 'jamaah:read'
  )
ON DUPLICATE KEY UPDATE can_delegate=VALUES(can_delegate);

-- Takmir: Committee operations
INSERT INTO role_permissions (role_id, permission_id, tenant_id, can_delegate)
SELECT r.id, p.id, NULL, FALSE
FROM roles r, permissions p
WHERE r.code = 'TAKMIR'
  AND p.code IN (
    'jamaah:read', 'jamaah:create', 'jamaah:update',
    'jadwal:read', 'jadwal:create', 'jadwal:update',
    'donasi:read', 'pengeluaran:read',
    'kas:read', 'laporan:read'
  )
ON DUPLICATE KEY UPDATE can_delegate=VALUES(can_delegate);

-- Ustadz: Teaching operations + self-manage schedule
INSERT INTO role_permissions (role_id, permission_id, tenant_id, can_delegate)
SELECT r.id, p.id, NULL, FALSE
FROM roles r, permissions p
WHERE r.code = 'USTADZ'
  AND p.code IN (
    'jadwal:read', 'jadwal:create', 'jadwal:update',
    'jamaah:read', 'laporan:read'
  )
ON DUPLICATE KEY UPDATE can_delegate=VALUES(can_delegate);

-- Jamaah: Basic access
INSERT INTO role_permissions (role_id, permission_id, tenant_id, can_delegate)
SELECT r.id, p.id, NULL, FALSE
FROM roles r, permissions p
WHERE r.code = 'JAMAAH'
  AND p.code IN (
    'donasi:create', 'jadwal:read', 'laporan:read'
  )
ON DUPLICATE KEY UPDATE can_delegate=VALUES(can_delegate);
