-- 014_messaging_unify.sql
-- Unifies the two incompatible parent_messages writers (conversation model from
-- api/parent/messages.ts vs admin-hub free-text model from api/tenant/parent-messages.ts)
-- and creates the student_message_replies table that student/messages.ts already writes to.

-- Conversation columns on parent_messages (parent portal writes these).
ALTER TABLE parent_messages ADD COLUMN IF NOT EXISTS parent_id TEXT;
ALTER TABLE parent_messages ADD COLUMN IF NOT EXISTS staff_id TEXT;
ALTER TABLE parent_messages ADD COLUMN IF NOT EXISTS child_id TEXT;
ALTER TABLE parent_messages ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE parent_messages ADD COLUMN IF NOT EXISTS body TEXT;
ALTER TABLE parent_messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE parent_messages ADD COLUMN IF NOT EXISTS parent_read_at TIMESTAMP;

-- Parent-portal rows populate the legacy columns too, but relax NOT NULL so a
-- single canonical insert shape always succeeds.
ALTER TABLE parent_messages ALTER COLUMN parent_name DROP NOT NULL;
ALTER TABLE parent_messages ALTER COLUMN student_name DROP NOT NULL;
ALTER TABLE parent_messages ALTER COLUMN message DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_parent_messages_staff ON parent_messages(tenant_id, staff_id);
CREATE INDEX IF NOT EXISTS idx_parent_messages_parent ON parent_messages(tenant_id, parent_id);

-- Student replies to school messages — api/student/messages.ts POST inserts here.
CREATE TABLE IF NOT EXISTS student_message_replies (
  id TEXT PRIMARY KEY,
  message_id TEXT,
  tenant_id TEXT,
  sender_name TEXT,
  body TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_student_msg_replies_msg ON student_message_replies(message_id);
CREATE INDEX IF NOT EXISTS idx_student_msg_replies_tenant ON student_message_replies(tenant_id);
