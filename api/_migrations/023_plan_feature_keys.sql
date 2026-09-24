-- 023: Add plan-gating keys for previously ungated features.
-- Merges new keys into each plan's features JSONB (existing keys preserved).
-- Tier logic: starter = records, standard = operational workflows, premium = automation/enterprise.
-- Idempotent: re-running produces identical values.

-- ============ STARTER ============
UPDATE plan_config SET features = jsonb_set(features, '{academicStructure}',
  (features->'academicStructure') || '{"lessonNotes": true, "schemeOfWork": false}'::jsonb)
WHERE plan_name = 'starter';
UPDATE plan_config SET features = jsonb_set(features, '{studentManagement}',
  (features->'studentManagement') || '{"behavioral": false}'::jsonb)
WHERE plan_name = 'starter';
UPDATE plan_config SET features = jsonb_set(features, '{communication}',
  (features->'communication') || '{"inAppNotifications": true, "messaging": false}'::jsonb)
WHERE plan_name = 'starter';
UPDATE plan_config SET features = jsonb_set(features, '{admin}',
  (features->'admin') || '{"commandCenter": false, "opsMonitoring": false, "backupRestore": false}'::jsonb)
WHERE plan_name = 'starter';
UPDATE plan_config SET features = features || '{"assignments": {"management": true}}'::jsonb
WHERE plan_name = 'starter';

-- ============ STANDARD ============
UPDATE plan_config SET features = jsonb_set(features, '{academicStructure}',
  (features->'academicStructure') || '{"lessonNotes": true, "schemeOfWork": true}'::jsonb)
WHERE plan_name = 'standard';
UPDATE plan_config SET features = jsonb_set(features, '{studentManagement}',
  (features->'studentManagement') || '{"behavioral": true}'::jsonb)
WHERE plan_name = 'standard';
UPDATE plan_config SET features = jsonb_set(features, '{communication}',
  (features->'communication') || '{"inAppNotifications": true, "messaging": true}'::jsonb)
WHERE plan_name = 'standard';
UPDATE plan_config SET features = jsonb_set(features, '{admin}',
  (features->'admin') || '{"commandCenter": false, "opsMonitoring": false, "backupRestore": true}'::jsonb)
WHERE plan_name = 'standard';
UPDATE plan_config SET features = features || '{"assignments": {"management": true}}'::jsonb
WHERE plan_name = 'standard';

-- ============ PREMIUM ============
UPDATE plan_config SET features = jsonb_set(features, '{academicStructure}',
  (features->'academicStructure') || '{"lessonNotes": true, "schemeOfWork": true}'::jsonb)
WHERE plan_name = 'premium';
UPDATE plan_config SET features = jsonb_set(features, '{studentManagement}',
  (features->'studentManagement') || '{"behavioral": true}'::jsonb)
WHERE plan_name = 'premium';
UPDATE plan_config SET features = jsonb_set(features, '{communication}',
  (features->'communication') || '{"inAppNotifications": true, "messaging": true}'::jsonb)
WHERE plan_name = 'premium';
UPDATE plan_config SET features = jsonb_set(features, '{admin}',
  (features->'admin') || '{"commandCenter": true, "opsMonitoring": true, "backupRestore": true}'::jsonb)
WHERE plan_name = 'premium';
UPDATE plan_config SET features = features || '{"assignments": {"management": true}}'::jsonb
WHERE plan_name = 'premium';
