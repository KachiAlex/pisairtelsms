-- 037_staff_messages_body.sql
-- api/staff/messages.ts reads and writes `body` and `sender_role`, but the
-- original staff_messages schema never created them — every GET/POST 500'd.
ALTER TABLE staff_messages ADD COLUMN IF NOT EXISTS body TEXT;
ALTER TABLE staff_messages ADD COLUMN IF NOT EXISTS sender_role VARCHAR(50) DEFAULT 'staff';
