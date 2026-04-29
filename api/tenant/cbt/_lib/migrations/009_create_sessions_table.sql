-- Migration: Create Sessions Table
-- Description: Creates sessions table for session management and tracking
-- Created: 2026-04-28

-- ============================================================================
-- sessions Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  device_info VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  is_active BOOLEAN DEFAULT true,
  logout_reason VARCHAR(255),
  logged_out_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_tenant ON sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_tenant_user ON sessions(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_created ON sessions(created_at);

-- ============================================================================
-- session_policies Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS session_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE,
  timeout_minutes INTEGER NOT NULL DEFAULT 30 CHECK (timeout_minutes > 0),
  max_sessions INTEGER NOT NULL DEFAULT 5 CHECK (max_sessions > 0),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_session_policies_tenant ON session_policies(tenant_id);

-- ============================================================================
-- session_history Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS session_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'activity', 'logout', 'timeout', 'force_logout')),
  ip_address VARCHAR(45),
  device_info VARCHAR(255),
  details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_session_history_session ON session_history(session_id);
CREATE INDEX IF NOT EXISTS idx_session_history_tenant ON session_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_session_history_user ON session_history(user_id);
CREATE INDEX IF NOT EXISTS idx_session_history_action ON session_history(action);
CREATE INDEX IF NOT EXISTS idx_session_history_created ON session_history(created_at);

-- ============================================================================
-- End of Migration
-- ============================================================================
