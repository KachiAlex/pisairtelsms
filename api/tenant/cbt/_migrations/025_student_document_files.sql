-- Store uploaded document bytes on student_documents so uploads persist
-- instead of being simulated client-side.
ALTER TABLE student_documents ADD COLUMN IF NOT EXISTS file_data BYTEA;
ALTER TABLE student_documents ADD COLUMN IF NOT EXISTS mime_type TEXT;
ALTER TABLE student_documents ADD COLUMN IF NOT EXISTS file_size INTEGER;
ALTER TABLE student_documents ADD COLUMN IF NOT EXISTS notes TEXT;
