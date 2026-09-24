-- 025_offline_sync_queue_tenant.sql
-- offline_sync_queue was created without tenant_id; ownership was inferred
-- by joining exams. Add the column for direct tenant scoping + indexing.

ALTER TABLE offline_sync_queue ADD COLUMN IF NOT EXISTS tenant_id TEXT;

UPDATE offline_sync_queue q
SET tenant_id = e.tenant_id
FROM exams e
WHERE e.id::text = q.exam_id::text AND q.tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_sync_queue_tenant
  ON offline_sync_queue (tenant_id, sync_status);
