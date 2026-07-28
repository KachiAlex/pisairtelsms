// Mock in-memory storage for applications (for development/demo purposes)
const applicationsStore: Map<string, ApplicationDTO> = new Map();

// DTO for API responses — camelCase
export interface ApplicationDTO {
  id: string
  studentName: string
  parentName: string
  contactPhone: string
  contactEmail: string
  classApplying: string
  status: 'pending' | 'reviewing' | 'approved' | 'rejected'
  academicSession: string | null
  source: string | null
  createdAt: string
  updatedAt: string
}

export interface ApplicationPayload {
  studentName: string
  parentName: string
  contactPhone: string
  contactEmail: string
  classApplying: string
  academicSession?: string
  source?: string
}

// Initialize with sample data
function initializeSampleData() {
  if (applicationsStore.size === 0) {
    const sampleApplications: ApplicationDTO[] = [
      {
        id: 'app_1',
        studentName: 'Amara Okonkwo',
        parentName: 'Mr. Okonkwo',
        contactPhone: '+234801111111',
        contactEmail: 'amara@example.com',
        classApplying: 'JSS 1',
        status: 'pending',
        academicSession: '2025/2026',
        source: 'Online Form',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'app_2',
        studentName: 'Emeka Nwosu',
        parentName: 'Mrs. Nwosu',
        contactPhone: '+234802222222',
        contactEmail: 'emeka@example.com',
        classApplying: 'JSS 1',
        status: 'reviewing',
        academicSession: '2025/2026',
        source: 'Online Form',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'app_3',
        studentName: 'Zainab Hassan',
        parentName: 'Mr. Hassan',
        contactPhone: '+234803333333',
        contactEmail: 'zainab@example.com',
        classApplying: 'JSS 2',
        status: 'approved',
        academicSession: '2025/2026',
        source: 'Referral',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'app_4',
        studentName: 'Chidi Eze',
        parentName: 'Mr. Eze',
        contactPhone: '+234804444444',
        contactEmail: 'chidi@example.com',
        classApplying: 'JSS 1',
        status: 'pending',
        academicSession: '2025/2026',
        source: 'Online Form',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    sampleApplications.forEach(a => applicationsStore.set(a.id, a));
  }
}

export async function fetchApplications(
  status?: string,
  academicSession?: string
): Promise<ApplicationDTO[]> {
  try {
    initializeSampleData();
    
    let filtered = Array.from(applicationsStore.values());
    
    if (status) {
      filtered = filtered.filter(a => a.status === status);
    }
    if (academicSession) {
      filtered = filtered.filter(a => a.academicSession === academicSession);
    }
    
    return filtered.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error('Error fetching applications:', error);
    return [];
  }
}

export async function createApplication(payload: ApplicationPayload): Promise<ApplicationDTO> {
  try {
    initializeSampleData();
    
    const id = `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const application: ApplicationDTO = {
      id,
      ...payload,
      status: 'pending',
      academicSession: payload.academicSession || null,
      source: payload.source || null,
      createdAt: now,
      updatedAt: now,
    };
    
    applicationsStore.set(id, application);
    return application;
  } catch (error) {
    console.error('Error creating application:', error);
    throw new Error('Failed to create application');
  }
}

export async function updateApplicationStatus(
  id: string,
  status: ApplicationDTO['status']
): Promise<ApplicationDTO | null> {
  try {
    initializeSampleData();
    
    const existing = applicationsStore.get(id);
    if (!existing) {
      return null;
    }
    
    const updated: ApplicationDTO = {
      ...existing,
      status,
      updatedAt: new Date().toISOString(),
    };
    
    applicationsStore.set(id, updated);
    return updated;
  } catch (error) {
    console.error('Error updating application status:', error);
    throw new Error('Failed to update application status');
  }
}
