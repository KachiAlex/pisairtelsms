-- Create academic_years table for centralized academic year management
CREATE TABLE IF NOT EXISTS academic_years (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_academic_years_tenant ON academic_years(tenant_id);
CREATE INDEX IF NOT EXISTS idx_academic_years_current ON academic_years(tenant_id, is_current);

-- Add foreign key constraint to timetable_terms
ALTER TABLE timetable_terms 
ADD COLUMN IF NOT EXISTS academic_year_id TEXT REFERENCES academic_years(id) ON DELETE SET NULL;

-- Migrate existing academic years from timetable_terms to academic_years table
INSERT INTO academic_years (id, tenant_id, name, start_date, end_date, is_current)
SELECT 
  'ay-' || SUBSTR(id, 1, 8) as id,
  tenant_id,
  academic_year as name,
  MIN(start_date) as start_date,
  MAX(end_date) as end_date,
  FALSE as is_current
FROM timetable_terms
GROUP BY tenant_id, academic_year
ON CONFLICT DO NOTHING;

-- Update timetable_terms to reference academic_years
UPDATE timetable_terms
SET academic_year_id = (
  SELECT ay.id 
  FROM academic_years ay 
  WHERE ay.name = timetable_terms.academic_year 
  AND ay.tenant_id = timetable_terms.tenant_id
  LIMIT 1
)
WHERE academic_year_id IS NULL;

INSERT INTO schema_migrations (version, description)
VALUES (12, 'Create academic_years table and migrate existing data')
ON CONFLICT DO NOTHING;
