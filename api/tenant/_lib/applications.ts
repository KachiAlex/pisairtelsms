import { sql } from '@vercel/postgres';

export interface Application {
  id: string;
  trackingId: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  classApplying: string;
  previousSchool: string;
  parentNames: string[];
  phones: string[];
  email: string;
  address: string;
  emergencyContacts: string[];
  specialNeeds: string;
  transportation: string;
  status: 'pending' | 'reviewing' | 'approved' | 'rejected';
  submittedAt: string;
  updatedAt: string;
}

export interface ApplicationPayload {
  fullName: string;
  dateOfBirth: string;
  gender: string;
  classApplying: string;
  previousSchool: string;
  parentNames: string[];
  phones: string[];
  email: string;
  address: string;
  emergencyContacts: string[];
  specialNeeds: string;
  transportation: string;
}

export interface ApplicationRow {
  id: string;
  tracking_id: string;
  full_name: string;
  date_of_birth: string;
  gender: string;
  class_applying: string;
  previous_school: string;
  parent_names: string[];
  phones: string[];
  email: string;
  address: string;
  emergency_contacts: string[];
  special_needs: string;
  transportation: string;
  status: string;
  submitted_at: Date;
  updated_at: Date;
}

export async function ensureApplicationsTable(): Promise<void> {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS applications (
        id TEXT PRIMARY KEY,
        tracking_id TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        date_of_birth TEXT NOT NULL,
        gender TEXT NOT NULL,
        class_applying TEXT NOT NULL,
        previous_school TEXT,
        parent_names TEXT[] NOT NULL,
        phones TEXT[] NOT NULL,
        email TEXT NOT NULL,
        address TEXT NOT NULL,
        emergency_contacts TEXT[] NOT NULL,
        special_needs TEXT,
        transportation TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    console.log('Applications table ensured.');
  } catch (error) {
    console.error('Error ensuring applications table:', error);
  }
}

export async function createApplication(applicationData: ApplicationPayload): Promise<Application> {
  try {
    await ensureApplicationsTable();

    // Generate tracking ID
    const trackingId = Math.random().toString(36).substr(2, 9).toUpperCase();
    const id = `application_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const result = await sql<ApplicationRow>`
      INSERT INTO applications (
        id, tracking_id, full_name, date_of_birth, gender, class_applying,
        previous_school, parent_names, phones, email, address,
        emergency_contacts, special_needs, transportation
      )
      VALUES (
        ${id}, ${trackingId}, ${applicationData.fullName}, ${applicationData.dateOfBirth},
        ${applicationData.gender}, ${applicationData.classApplying},
        ${applicationData.previousSchool}, ${applicationData.parentNames},
        ${applicationData.phones}, ${applicationData.email}, ${applicationData.address},
        ${applicationData.emergencyContacts}, ${applicationData.specialNeeds},
        ${applicationData.transportation}
      )
      RETURNING *
    `;

    const row = result.rows[0];
    return {
      id: row.id,
      trackingId: row.tracking_id,
      fullName: row.full_name,
      dateOfBirth: row.date_of_birth,
      gender: row.gender,
      classApplying: row.class_applying,
      previousSchool: row.previous_school,
      parentNames: row.parent_names,
      phones: row.phones,
      email: row.email,
      address: row.address,
      emergencyContacts: row.emergency_contacts,
      specialNeeds: row.special_needs,
      transportation: row.transportation,
      status: row.status as Application['status'],
      submittedAt: row.submitted_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  } catch (error) {
    console.error('Error creating application:', error);
    throw new Error('Failed to create application');
  }
}

export async function fetchApplications(): Promise<Application[]> {
  try {
    await ensureApplicationsTable();

    const result = await sql<ApplicationRow>`
      SELECT * FROM applications ORDER BY submitted_at DESC
    `;

    return result.rows.map(row => ({
      id: row.id,
      trackingId: row.tracking_id,
      fullName: row.full_name,
      dateOfBirth: row.date_of_birth,
      gender: row.gender,
      classApplying: row.class_applying,
      previousSchool: row.previous_school,
      parentNames: row.parent_names,
      phones: row.phones,
      email: row.email,
      address: row.address,
      emergencyContacts: row.emergency_contacts,
      specialNeeds: row.special_needs,
      transportation: row.transportation,
      status: row.status as Application['status'],
      submittedAt: row.submitted_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    }));
  } catch (error) {
    console.error('Error fetching applications:', error);
    return [];
  }
}

export async function updateApplicationStatus(id: string, status: Application['status']): Promise<Application | null> {
  try {
    await ensureApplicationsTable();

    const result = await sql<ApplicationRow>`
      UPDATE applications
      SET status = ${status}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      trackingId: row.tracking_id,
      fullName: row.full_name,
      dateOfBirth: row.date_of_birth,
      gender: row.gender,
      classApplying: row.class_applying,
      previousSchool: row.previous_school,
      parentNames: row.parent_names,
      phones: row.phones,
      email: row.email,
      address: row.address,
      emergencyContacts: row.emergency_contacts,
      specialNeeds: row.special_needs,
      transportation: row.transportation,
      status: row.status as Application['status'],
      submittedAt: row.submitted_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  } catch (error) {
    console.error('Error updating application status:', error);
    throw new Error('Failed to update application status');
  }
}
