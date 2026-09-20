-- Migration 034: Remove platform-level "Super Admin" from tenant role directories.
-- Super admins are platform operators and must be fully isolated from tenant
-- role management — tenants manage only school-scoped roles.

DELETE FROM tenant_role_grants WHERE role_id LIKE 'super-admin_%';
DELETE FROM tenant_roles WHERE id LIKE 'super-admin_%' OR LOWER(name) = 'super admin';
