-- Consolidated migration: Create all tables
-- This migration is idempotent (uses IF NOT EXISTS)
-- Generated from inline DDL removal refactoring
-- Run this migration once before deploying the updated API

CREATE TABLE IF NOT EXISTS admin_provisioning_queue (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      type VARCHAR(100) DEFAULT 'tenant',
      eta VARCHAR(50) DEFAULT 'pending',
      owner VARCHAR(255),
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS admin_activity_feed (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(500) NOT NULL,
      meta VARCHAR(500),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS admin_incidents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title VARCHAR(500) NOT NULL,
      impact VARCHAR(255),
      status VARCHAR(50) DEFAULT 'Open',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS tenant_users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id VARCHAR(255) NOT NULL DEFAULT 'default-tenant',
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            role VARCHAR(255) NOT NULL DEFAULT 'Staff',
            status VARCHAR(50) NOT NULL DEFAULT 'invited',
            last_active TIMESTAMP WITH TIME ZONE,
            invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );

CREATE TABLE IF NOT EXISTS tenants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      subscription_plan VARCHAR(50) NOT NULL DEFAULT 'basic',
      region VARCHAR(50) DEFAULT 'global',
      usage_percent INT DEFAULT 0,
      status VARCHAR(50) NOT NULL DEFAULT 'active',
      last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      open_alerts INT DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS student_assignments (
      id TEXT PRIMARY KEY, student_id TEXT NOT NULL, subject TEXT, title TEXT NOT NULL,
      description TEXT, due_date DATE, status TEXT DEFAULT 'pending', type TEXT DEFAULT 'homework',
      teacher_name TEXT, submitted_at TIMESTAMP, score NUMERIC, max_score NUMERIC DEFAULT 100,
      feedback TEXT, created_at TIMESTAMP DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS attendance (
      id TEXT PRIMARY KEY, student_id TEXT, date DATE, status TEXT, created_at TIMESTAMP DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS fee_assignments (
      id TEXT PRIMARY KEY, student_id TEXT, amount NUMERIC, created_at TIMESTAMP DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY, fee_assignment_id TEXT, amount NUMERIC, status TEXT, created_at TIMESTAMP DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS exams (
      id SERIAL PRIMARY KEY, title TEXT, exam_date DATE, start_time TIME, end_time TIME,
      room TEXT, student_class TEXT, description TEXT, created_at TIMESTAMP DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS results (
      id SERIAL PRIMARY KEY, student_id TEXT, subject TEXT, ca_score NUMERIC, exam_score NUMERIC, updated_at TIMESTAMP DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS announcements (
      id SERIAL PRIMARY KEY, title TEXT, body TEXT, created_at TIMESTAMP DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS school_events (
      id SERIAL PRIMARY KEY, title VARCHAR(255) NOT NULL, description TEXT,
      event_date DATE, start_time TIME, end_time TIME, venue VARCHAR(255),
      category VARCHAR(50), is_mandatory BOOLEAN DEFAULT false, created_at TIMESTAMP DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS parent_child_violations (
      parent_id TEXT NOT NULL,
      child_id TEXT NOT NULL,
      context TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      first_attempt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_attempt TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (parent_id, child_id, context)
    );

CREATE TABLE IF NOT EXISTS parent_messages (
      id TEXT PRIMARY KEY, parent_id TEXT, staff_id TEXT, child_id TEXT,
      subject TEXT, body TEXT, is_read BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS timetable (
      id SERIAL PRIMARY KEY, staff_id TEXT, day TEXT, subject TEXT,
      class_name TEXT, room TEXT, start_time TEXT, end_time TEXT, created_at TIMESTAMP DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS parent_notification_preferences (
      parent_id TEXT PRIMARY KEY,
      email_notifications BOOLEAN DEFAULT TRUE,
      in_app_notifications BOOLEAN DEFAULT TRUE,
      sms_notifications BOOLEAN DEFAULT FALSE,
      academic BOOLEAN DEFAULT TRUE,
      attendance BOOLEAN DEFAULT TRUE,
      behavioral BOOLEAN DEFAULT TRUE,
      fees BOOLEAN DEFAULT TRUE,
      communication BOOLEAN DEFAULT TRUE,
      health BOOLEAN DEFAULT TRUE,
      updated_at TIMESTAMP DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS parent_notifications (
      id TEXT PRIMARY KEY,
      parent_id TEXT NOT NULL,
      student_id TEXT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      action_url TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS students (
          id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          admission_no TEXT,
          name TEXT NOT NULL,
          class TEXT,
          arm TEXT,
          gender TEXT,
          status TEXT,
          guardian TEXT,
          phone TEXT,
          guardian_email TEXT,
          deleted_at TIMESTAMP WITH TIME ZONE
        );

CREATE TABLE IF NOT EXISTS attendance_records (
          id TEXT PRIMARY KEY,
          tenant_id TEXT NOT NULL,
          student_id TEXT NOT NULL,
          class TEXT,
          date DATE NOT NULL,
          status TEXT NOT NULL,
          absence_reason_id TEXT,
          source TEXT,
          device_id TEXT,
          user_id TEXT,
          academic_session TEXT,
          term TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_by TEXT,
          updated_by TEXT
        );

CREATE TABLE IF NOT EXISTS staff_messages (
        id SERIAL PRIMARY KEY,
        staff_id VARCHAR(255) NOT NULL,
        sender_name VARCHAR(255),
        subject VARCHAR(255),
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );

CREATE TABLE IF NOT EXISTS staff_leave (
        id SERIAL PRIMARY KEY,
        staff_id VARCHAR(255) NOT NULL,
        start_date DATE,
        end_date DATE,
        reason TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW()
      );

CREATE TABLE IF NOT EXISTS student_messages (
      id SERIAL PRIMARY KEY, student_id TEXT, sender_name TEXT, subject TEXT, is_read BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS course_materials (
      id SERIAL PRIMARY KEY, title VARCHAR(255) NOT NULL, description TEXT,
      subject VARCHAR(255), teacher VARCHAR(255), type VARCHAR(50),
      file_name VARCHAR(255), file_size VARCHAR(50), file_type VARCHAR(255),
      url TEXT, upload_date TIMESTAMP DEFAULT NOW(), academic_session VARCHAR(50),
      term VARCHAR(50), class_level VARCHAR(50), tags JSONB DEFAULT '[]'::jsonb,
      is_required BOOLEAN DEFAULT false, view_count INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS fee_adjustments (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      fee_assignment_id TEXT NOT NULL,
      adjustment_type TEXT NOT NULL,
      amount NUMERIC(12,2) NOT NULL,
      reason TEXT NOT NULL,
      requires_approval BOOLEAN DEFAULT false,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        action TEXT NOT NULL,
        old_values JSONB,
        new_values JSONB,
        user_id TEXT NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        ip_address TEXT
      );

CREATE TABLE IF NOT EXISTS admin_notifications (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        payment_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        student_name TEXT,
        amount NUMERIC(12,2) NOT NULL,
        read BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

CREATE TABLE IF NOT EXISTS exemptions (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        fee_assignment_id TEXT NOT NULL REFERENCES fee_assignments(id),
        exemption_type TEXT NOT NULL,
        amount NUMERIC(12,2),
        percentage NUMERIC(5,2),
        reason TEXT NOT NULL,
        approved_by TEXT NOT NULL,
        approval_date TIMESTAMP WITH TIME ZONE NOT NULL,
        effective_from DATE NOT NULL,
        effective_to DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

CREATE TABLE IF NOT EXISTS student_payments (
        id TEXT PRIMARY KEY,
        student_id TEXT NOT NULL,
        fee_structure_id TEXT NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        payment_method TEXT NOT NULL,
        reference TEXT,
        receipt_url TEXT,
        paid_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        recorded_by TEXT,
        notes TEXT
      );

CREATE TABLE IF NOT EXISTS fee_structures (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        name TEXT NOT NULL,
        academic_session TEXT NOT NULL,
        term TEXT NOT NULL,
        effective_from DATE NOT NULL,
        effective_to DATE,
        status TEXT NOT NULL DEFAULT 'active',
        created_by TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

CREATE TABLE IF NOT EXISTS fee_items (
        id TEXT PRIMARY KEY,
        fee_structure_id TEXT NOT NULL REFERENCES fee_structures(id),
        category TEXT NOT NULL,
        description TEXT NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        applicable_classes TEXT NOT NULL,
        is_mandatory BOOLEAN NOT NULL DEFAULT false,
        sequence INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

CREATE TABLE IF NOT EXISTS tenant_payment_settings (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        gateway TEXT NOT NULL,
        public_key TEXT NOT NULL,
        secret_key TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT false,
        metadata TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

CREATE TABLE IF NOT EXISTS payment_proofs (
        id TEXT PRIMARY KEY,
        payment_id TEXT NOT NULL REFERENCES payments(id),
        file_url TEXT NOT NULL,
        file_type TEXT NOT NULL,
        uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

CREATE TABLE IF NOT EXISTS payment_reconciliation (
        id TEXT PRIMARY KEY,
        payment_id TEXT NOT NULL REFERENCES payments(id),
        bank_deposit_date DATE NOT NULL,
        bank_deposit_amount NUMERIC(12,2) NOT NULL,
        bank_reference TEXT NOT NULL,
        matched_at TIMESTAMP WITH TIME ZONE NOT NULL,
        matched_by TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        exception_reason TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

CREATE TABLE IF NOT EXISTS payment_plans (
        id TEXT PRIMARY KEY,
        fee_assignment_id TEXT NOT NULL,
        number_of_installments INTEGER NOT NULL,
        installment_amount NUMERIC(12,2) NOT NULL,
        start_date DATE NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        created_by TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

CREATE TABLE IF NOT EXISTS payment_plan_installments (
        id TEXT PRIMARY KEY,
        payment_plan_id TEXT NOT NULL REFERENCES payment_plans(id),
        installment_number INTEGER NOT NULL,
        due_date DATE NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        paid_amount NUMERIC(12,2) DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending'
      );

CREATE TABLE IF NOT EXISTS api_keys (
      id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      tenant_id         TEXT NOT NULL,
      name              TEXT NOT NULL,
      key               TEXT NOT NULL UNIQUE,
      secret            TEXT,
      status            TEXT NOT NULL DEFAULT 'active',
      rate_limit        INTEGER NOT NULL DEFAULT 60,
      allowed_endpoints TEXT[],
      expires_at        TIMESTAMPTZ,
      last_used_at      TIMESTAMPTZ,
      created_by        TEXT,
      revoked_by        TEXT,
      revoked_at        TIMESTAMPTZ,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS api_usage (
      id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      tenant_id     TEXT NOT NULL,
      api_key_id    TEXT NOT NULL,
      endpoint      TEXT NOT NULL,
      method        TEXT NOT NULL,
      status_code   INTEGER,
      response_time INTEGER,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS api_rate_limit_configs (
      id                   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      tenant_id            TEXT NOT NULL,
      api_key_id           TEXT NOT NULL UNIQUE,
      requests_per_minute  INTEGER NOT NULL DEFAULT 60,
      requests_per_hour    INTEGER NOT NULL DEFAULT 1000,
      requests_per_day     INTEGER NOT NULL DEFAULT 10000,
      created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS biometric_devices (
      id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      tenant_id     TEXT NOT NULL,
      name          TEXT NOT NULL,
      device_type   TEXT NOT NULL DEFAULT 'fingerprint',
      location      TEXT,
      ip_address    TEXT,
      serial_number TEXT,
      status        TEXT NOT NULL DEFAULT 'offline',
      last_sync_at  TIMESTAMPTZ,
      created_by    TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS biometric_syncs (
      id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      tenant_id         TEXT NOT NULL,
      device_id         TEXT NOT NULL,
      status            TEXT NOT NULL DEFAULT 'in_progress',
      records_processed INTEGER NOT NULL DEFAULT 0,
      records_failed    INTEGER NOT NULL DEFAULT 0,
      error             TEXT,
      started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at      TIMESTAMPTZ,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS biometric_device_logs (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      tenant_id   TEXT NOT NULL,
      device_id   TEXT NOT NULL,
      log_type    TEXT NOT NULL,
      message     TEXT NOT NULL,
      details     JSONB,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS lms_configs (
      id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      tenant_id     TEXT NOT NULL,
      provider      TEXT NOT NULL,
      base_url      TEXT NOT NULL,
      api_key       TEXT NOT NULL,
      is_active     BOOLEAN NOT NULL DEFAULT true,
      sync_status   TEXT NOT NULL DEFAULT 'pending',
      last_sync_at  TIMESTAMPTZ,
      created_by    TEXT,
      updated_by    TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS lms_syncs (
      id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      tenant_id         TEXT NOT NULL,
      lms_config_id     TEXT NOT NULL,
      provider          TEXT NOT NULL,
      sync_type         TEXT NOT NULL,
      status            TEXT NOT NULL DEFAULT 'in_progress',
      records_processed INTEGER NOT NULL DEFAULT 0,
      records_failed    INTEGER NOT NULL DEFAULT 0,
      error             TEXT,
      started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at      TIMESTAMPTZ,
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS lms_sync_logs (
      id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      tenant_id     TEXT NOT NULL,
      lms_config_id TEXT NOT NULL,
      log_type      TEXT NOT NULL,
      message       TEXT NOT NULL,
      details       JSONB,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS payment_gateway_configs (
      id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      tenant_id       TEXT NOT NULL,
      provider        TEXT NOT NULL,
      mode            TEXT NOT NULL DEFAULT 'test',
      api_key         TEXT NOT NULL,
      secret_key      TEXT NOT NULL,
      webhook_url     TEXT,
      webhook_secret  TEXT,
      is_active       BOOLEAN NOT NULL DEFAULT true,
      created_by      TEXT,
      updated_by      TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS payment_gateway_transactions (
      id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      tenant_id     TEXT NOT NULL,
      gateway_id    TEXT,
      provider      TEXT NOT NULL,
      reference_id  TEXT NOT NULL,
      amount        NUMERIC(14,2) NOT NULL,
      currency      TEXT NOT NULL DEFAULT 'NGN',
      status        TEXT NOT NULL DEFAULT 'pending',
      student_id    TEXT,
      description   TEXT,
      metadata      JSONB,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS payment_gateway_webhook_logs (
      id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      tenant_id   TEXT NOT NULL,
      provider    TEXT NOT NULL,
      event       TEXT NOT NULL,
      payload     JSONB NOT NULL DEFAULT '{}',
      processed   BOOLEAN NOT NULL DEFAULT false,
      error       TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS tenant_roles (
      id VARCHAR(255) PRIMARY KEY,
      tenant_id VARCHAR(255) NOT NULL DEFAULT 'default-tenant',
      name VARCHAR(255) NOT NULL,
      description TEXT,
      critical BOOLEAN NOT NULL DEFAULT false,
      member_count INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS tenant_role_grants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id VARCHAR(255) NOT NULL DEFAULT 'default-tenant',
      role_id VARCHAR(255) NOT NULL,
      module VARCHAR(255) NOT NULL,
      scope VARCHAR(255) NOT NULL,
      granted BOOLEAN NOT NULL DEFAULT false,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(tenant_id, role_id, module, scope)
    );

CREATE TABLE IF NOT EXISTS user_sessions (id TEXT PRIMARY KEY, tenant_id TEXT, created_at TIMESTAMP, expires_at TIMESTAMP, terminated_at TIMESTAMP);

CREATE TABLE IF NOT EXISTS role_assignments (id TEXT PRIMARY KEY, tenant_id TEXT, role_id TEXT, is_active BOOLEAN DEFAULT TRUE);

CREATE TABLE IF NOT EXISTS privileged_roles (id TEXT PRIMARY KEY, tenant_id TEXT, is_active BOOLEAN DEFAULT TRUE, next_review_date TIMESTAMP);

CREATE TABLE IF NOT EXISTS encryption_keys (id TEXT PRIMARY KEY, tenant_id TEXT, status TEXT DEFAULT 'active');

CREATE TABLE IF NOT EXISTS security_events (id TEXT PRIMARY KEY, tenant_id TEXT, severity TEXT, created_at TIMESTAMP DEFAULT NOW());

CREATE TABLE IF NOT EXISTS backup_jobs (id TEXT PRIMARY KEY, tenant_id TEXT, status TEXT, created_at TIMESTAMP DEFAULT NOW());

CREATE TABLE IF NOT EXISTS compliance_tasks (id TEXT PRIMARY KEY, tenant_id TEXT, status TEXT);

CREATE TABLE IF NOT EXISTS teacher_allocation_slots (
        id TEXT PRIMARY KEY,
        tenant_id TEXT,
        class TEXT,
        subject TEXT,
        teacher TEXT,
        coverage TEXT DEFAULT 'Open',
        warnings INT DEFAULT 0,
        day_of_week INT,
        created_at TIMESTAMP DEFAULT NOW()
      );

CREATE TABLE IF NOT EXISTS teacher_substitution_log (
        id TEXT PRIMARY KEY,
        tenant_id TEXT,
        slot TEXT,
        priority TEXT,
        action TEXT,
        relief TEXT,
        eta TEXT,
        impacted TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

CREATE TABLE IF NOT EXISTS staff (
      id TEXT PRIMARY KEY, staff_id TEXT, name TEXT, department TEXT, role TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );

CREATE TABLE IF NOT EXISTS ca_config (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(255) NOT NULL,
        config JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(tenant_id)
      );

CREATE TABLE IF NOT EXISTS announcement_reads (
        id TEXT PRIMARY KEY,
        announcement_id TEXT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
        reader_id TEXT NOT NULL,
        reader_type TEXT NOT NULL CHECK (reader_type IN ('student', 'parent', 'staff')),
        reader_name TEXT,
        read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        tenant_id TEXT NOT NULL
      );

CREATE TABLE IF NOT EXISTS fee_records (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        student_name TEXT NOT NULL,
        admission_no TEXT NOT NULL,
        class TEXT NOT NULL,
        fee_type TEXT NOT NULL,
        amount NUMERIC(12,2) NOT NULL,
        paid NUMERIC(12,2) DEFAULT 0,
        balance NUMERIC(12,2) DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending',
        last_payment_date TIMESTAMP WITH TIME ZONE,
        academic_session TEXT NOT NULL,
        term TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

CREATE TABLE IF NOT EXISTS leads (
        id VARCHAR(255) PRIMARY KEY,
        student_name VARCHAR(255) NOT NULL,
        parent_name VARCHAR(255),
        contact_phone VARCHAR(255),
        contact_email VARCHAR(255),
        class_interested VARCHAR(255),
        source VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        status VARCHAR(255) DEFAULT 'new'
      );

CREATE TABLE IF NOT EXISTS promotion_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        level VARCHAR(50) NOT NULL,
        promotion_threshold NUMERIC(5,2) NOT NULL,
        repeat_threshold NUMERIC(5,2) NOT NULL,
        review_threshold NUMERIC(5,2) NOT NULL,
        attendance_threshold NUMERIC(5,2) NOT NULL,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(tenant_id, level)
      );

CREATE TABLE IF NOT EXISTS promotion_records (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        student_name TEXT NOT NULL,
        from_class TEXT NOT NULL,
        to_class TEXT NOT NULL,
        action TEXT NOT NULL CHECK (action IN ('promote', 'repeat', 'demote', 'hold')),
        academic_session TEXT NOT NULL,
        term TEXT NOT NULL,
        average_score DECIMAL(5,2),
        attendance DECIMAL(5,2),
        teacher_recommendation TEXT,
        reason TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed')),
        approved_by TEXT,
        approved_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

CREATE TABLE IF NOT EXISTS student_scores (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        student_id TEXT NOT NULL,
        subject VARCHAR(100) NOT NULL,
        academic_session VARCHAR(20) NOT NULL,
        term VARCHAR(50) NOT NULL,
        ca_score NUMERIC(5,2) NOT NULL CHECK (ca_score >= 0 AND ca_score <= 100),
        exam_score NUMERIC(5,2) NOT NULL CHECK (exam_score >= 0 AND exam_score <= 100),
        total_score NUMERIC(5,2) NOT NULL,
        attendance_percentage NUMERIC(5,2) NOT NULL CHECK (attendance_percentage >= 0 AND attendance_percentage <= 100),
        class VARCHAR(50) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(tenant_id, student_id, subject, academic_session, term)
      );

CREATE TABLE IF NOT EXISTS staff_attendance (
        id TEXT PRIMARY KEY,
        staff_id TEXT NOT NULL,
        tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
        staff_name TEXT NOT NULL,
        date DATE NOT NULL,
        check_in TEXT,
        check_out TEXT,
        status TEXT NOT NULL DEFAULT 'present',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(staff_id, date)
      );

CREATE TABLE IF NOT EXISTS staff_payroll (
        id TEXT PRIMARY KEY,
        staff_id TEXT NOT NULL,
        tenant_id TEXT NOT NULL DEFAULT 'default-tenant',
        staff_name TEXT NOT NULL,
        month TEXT NOT NULL,
        year INTEGER NOT NULL,
        basic_salary NUMERIC NOT NULL DEFAULT 0,
        allowances NUMERIC NOT NULL DEFAULT 0,
        deductions NUMERIC NOT NULL DEFAULT 0,
        net_salary NUMERIC NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending',
        payment_date DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(staff_id, month, year)
      );

CREATE TABLE IF NOT EXISTS staff_tasks (
        id TEXT PRIMARY KEY,
        staff_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        priority TEXT NOT NULL DEFAULT 'medium',
        due_date DATE,
        assigned_by TEXT,
        assigned_by_role TEXT DEFAULT 'self',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        completed_at TIMESTAMP WITH TIME ZONE
      );

CREATE TABLE IF NOT EXISTS staff_documents (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT,
        file_name TEXT,
        file_size TEXT,
        file_type TEXT,
        uploaded_by TEXT,
        uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        download_url TEXT,
        is_restricted BOOLEAN DEFAULT false,
        department TEXT,
        academic_year TEXT
      );

CREATE TABLE IF NOT EXISTS tenant_settings (
        id INT PRIMARY KEY DEFAULT 1,
        settings JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

CREATE TABLE IF NOT EXISTS super_admin_accounts (
        id SERIAL PRIMARY KEY,
        full_name TEXT NOT NULL,
        organization TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );;

CREATE TABLE IF NOT EXISTS token_blacklist (
        id SERIAL PRIMARY KEY,
        token TEXT NOT NULL UNIQUE,
        user_id VARCHAR(255) NOT NULL,
        expires_at BIGINT NOT NULL,
        revoked_at BIGINT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );


-- Indexes

CREATE INDEX IF NOT EXISTS idx_students_class ON students(class) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_fee_adjustments_tenant ON fee_adjustments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fee_adjustments_fee_assignment_id ON fee_adjustments(fee_assignment_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity_type ON audit_log(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity_id ON audit_log(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_tenant_id ON admin_notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_read ON admin_notifications(read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_payment_id ON admin_notifications(payment_id);
CREATE INDEX IF NOT EXISTS idx_fee_assignments_student_id ON fee_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_assignments_fee_structure_id ON fee_assignments(fee_structure_id);
CREATE INDEX IF NOT EXISTS idx_fee_assignments_session_term ON fee_assignments(academic_session, term);
CREATE INDEX IF NOT EXISTS idx_exemptions_student_id ON exemptions(student_id);
CREATE INDEX IF NOT EXISTS idx_exemptions_fee_assignment_id ON exemptions(fee_assignment_id);
CREATE INDEX IF NOT EXISTS idx_student_payments_student_id ON student_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_student_payments_fee_structure_id ON student_payments(fee_structure_id);
CREATE INDEX IF NOT EXISTS idx_student_payments_paid_at ON student_payments(paid_at);
CREATE INDEX IF NOT EXISTS idx_fee_structures_tenant_id ON fee_structures(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fee_structures_session_term ON fee_structures(academic_session, term);
CREATE INDEX IF NOT EXISTS idx_fee_structures_status ON fee_structures(status);
CREATE INDEX IF NOT EXISTS idx_fee_items_fee_structure_id ON fee_items(fee_structure_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_fee_assignment_id ON payments(fee_assignment_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_gateway_ref ON payments(gateway_ref);
CREATE INDEX IF NOT EXISTS idx_tenant_payment_settings_tenant_id ON tenant_payment_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_payment_id ON payment_proofs(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_reconciliation_payment_id ON payment_reconciliation(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_reconciliation_status ON payment_reconciliation(status);
CREATE INDEX IF NOT EXISTS idx_payment_plans_fee_assignment_id ON payment_plans(fee_assignment_id);
CREATE INDEX IF NOT EXISTS idx_payment_plan_installments_payment_plan_id ON payment_plan_installments(payment_plan_id);
CREATE INDEX IF NOT EXISTS idx_announcements_status ON announcements(status);
CREATE INDEX IF NOT EXISTS idx_announcements_sent_at ON announcements(sent_at);
CREATE INDEX IF NOT EXISTS idx_announcements_tenant ON announcements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_announcement ON announcement_reads(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_reader ON announcement_reads(reader_id, announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_tenant ON announcement_reads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fee_records_tenant ON fee_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fee_records_student_id ON fee_records(student_id);
CREATE INDEX IF NOT EXISTS idx_fee_records_session_term ON fee_records(academic_session, term);
CREATE INDEX IF NOT EXISTS idx_fee_records_class ON fee_records(class);
CREATE INDEX IF NOT EXISTS idx_promotion_records_tenant ON promotion_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_promotion_rules_tenant ON promotion_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scores_student_id ON student_scores(student_id);
CREATE INDEX IF NOT EXISTS idx_scores_session_term ON student_scores(academic_session, term);
CREATE INDEX IF NOT EXISTS idx_scores_class ON student_scores(class);
CREATE INDEX IF NOT EXISTS idx_scores_tenant ON student_scores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_department ON staff(department);
CREATE INDEX IF NOT EXISTS idx_staff_status ON staff(status);
CREATE INDEX IF NOT EXISTS idx_staff_tenant_id ON staff(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leave_staff_id ON staff_leave(staff_id);
CREATE INDEX IF NOT EXISTS idx_leave_status ON staff_leave(status);
CREATE INDEX IF NOT EXISTS idx_leave_tenant_id ON staff_leave(tenant_id);
CREATE INDEX IF NOT EXISTS idx_attendance_staff_id ON staff_attendance(staff_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON staff_attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_tenant_id ON staff_attendance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payroll_staff_id ON staff_payroll(staff_id);
CREATE INDEX IF NOT EXISTS idx_payroll_month_year ON staff_payroll(month, year);
CREATE INDEX IF NOT EXISTS idx_payroll_tenant_id ON staff_payroll(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_staff_id ON staff_tasks(staff_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON staff_tasks(status);
CREATE INDEX IF NOT EXISTS idx_messages_staff_id ON staff_messages(staff_id);
CREATE INDEX IF NOT EXISTS idx_docs_category ON staff_documents(category);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_token ON token_blacklist(token);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_user_id ON token_blacklist(user_id);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires_at ON token_blacklist(expires_at);

-- Column additions

ALTER TABLE announcements ADD COLUMN IF NOT EXISTS audience VARCHAR(255);
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS sent_by VARCHAR(255);
ALTER TABLE student_assignments ADD COLUMN IF NOT EXISTS teacher_id TEXT;
ALTER TABLE student_assignments ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'homework';
ALTER TABLE students ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE branding_configs ADD COLUMN IF NOT EXISTS school_address TEXT;
ALTER TABLE branding_configs ADD COLUMN IF NOT EXISTS school_email TEXT;
ALTER TABLE branding_configs ADD COLUMN IF NOT EXISTS school_phone TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS level TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS risk_flag TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS subjects TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS allocation_periods INT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS contract_hours INT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS contract_hours NUMERIC;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS allocation_periods TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE promotion_records ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE promotion_rules ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE student_scores ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS staff_id TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE staff ADD COLUMN IF NOT EXISTS salary NUMERIC;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS qualification TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS emergency_contact TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS emergency_phone TEXT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE staff_leave ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE staff_attendance ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE staff_payroll ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS role VARCHAR(50);
