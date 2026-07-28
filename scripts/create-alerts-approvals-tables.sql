-- Create system_alerts table
CREATE TABLE IF NOT EXISTS system_alerts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  impact TEXT,
  owner TEXT,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  eta TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'acknowledged')),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create channel_health table
CREATE TABLE IF NOT EXISTS channel_health (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  channel TEXT NOT NULL,
  status TEXT DEFAULT 'operational' CHECK (status IN ('operational', 'degraded', 'down')),
  latency TEXT,
  uptime NUMERIC(5, 2),
  last_checked TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create maintenance_windows table
CREATE TABLE IF NOT EXISTS maintenance_windows (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  label TEXT NOT NULL,
  window_start TIMESTAMP NOT NULL,
  window_end TIMESTAMP NOT NULL,
  owner TEXT NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create escalation_channels table
CREATE TABLE IF NOT EXISTS escalation_channels (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  description TEXT,
  primary_on_call TEXT,
  trigger_condition TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'degraded', 'inactive')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create approval_requests table
CREATE TABLE IF NOT EXISTS approval_requests (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  type TEXT NOT NULL,
  requester TEXT NOT NULL,
  submitted_at TIMESTAMP DEFAULT NOW(),
  sla_deadline TIMESTAMP,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'escalated', 'queued')),
  approved_by TEXT,
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create approval_streams table
CREATE TABLE IF NOT EXISTS approval_streams (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  surface TEXT NOT NULL,
  owner TEXT NOT NULL,
  sla_hours INTEGER NOT NULL,
  risk TEXT DEFAULT 'low' CHECK (risk IN ('low', 'medium', 'high')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create sla_breaches table
CREATE TABLE IF NOT EXISTS sla_breaches (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  label TEXT NOT NULL,
  owner TEXT NOT NULL,
  severity TEXT DEFAULT 'warning' CHECK (severity IN ('warning', 'destructive')),
  breach_minutes INTEGER,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create reviewer_workloads table
CREATE TABLE IF NOT EXISTS reviewer_workloads (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  reviewer TEXT NOT NULL,
  pending_count INTEGER DEFAULT 0,
  eta TEXT,
  last_updated TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_system_alerts_tenant_id ON system_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON system_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_system_alerts_status ON system_alerts(status);

CREATE INDEX IF NOT EXISTS idx_channel_health_tenant_id ON channel_health(tenant_id);
CREATE INDEX IF NOT EXISTS idx_channel_health_channel ON channel_health(channel);
CREATE INDEX IF NOT EXISTS idx_channel_health_status ON channel_health(status);

CREATE INDEX IF NOT EXISTS idx_maintenance_windows_tenant_id ON maintenance_windows(tenant_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_windows_status ON maintenance_windows(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_windows_window_start ON maintenance_windows(window_start);

CREATE INDEX IF NOT EXISTS idx_escalation_channels_tenant_id ON escalation_channels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_escalation_channels_status ON escalation_channels(status);

CREATE INDEX IF NOT EXISTS idx_approval_requests_tenant_id ON approval_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_type ON approval_requests(type);
CREATE INDEX IF NOT EXISTS idx_approval_requests_sla_deadline ON approval_requests(sla_deadline);

CREATE INDEX IF NOT EXISTS idx_approval_streams_tenant_id ON approval_streams(tenant_id);
CREATE INDEX IF NOT EXISTS idx_approval_streams_surface ON approval_streams(surface);

CREATE INDEX IF NOT EXISTS idx_sla_breaches_tenant_id ON sla_breaches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sla_breaches_severity ON sla_breaches(severity);

CREATE INDEX IF NOT EXISTS idx_reviewer_workloads_tenant_id ON reviewer_workloads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reviewer_workloads_reviewer ON reviewer_workloads(reviewer);
