// Mock in-memory storage for students (for development/demo purposes)
const studentsStore: Map<string, StudentDTO> = new Map();

// Internal API-layer Student type (camelCase, for API responses only)
interface StudentDTO {
  id: string;
  admissionNo: string;
  name: string;
  class: string;
  arm: string;
  gender: string;
  status: 'Active' | 'Suspended' | 'Graduated';
  guardian: string;
  phone: string;
  created_at?: string;
  updated_at?: string;
}

export interface StudentPayload {
  admissionNo: string;
  name: string;
  class: string;
  arm: string;
  gender: string;
  status: 'Active' | 'Suspended' | 'Graduated';
  guardian: string;
  phone: string;
}

// Initialize with sample data
function initializeSampleData() {
  if (studentsStore.size === 0) {
    const sampleStudents: StudentDTO[] = [
      {
        id: 'student_1',
        admissionNo: 'ADM001',
        name: 'John Adewale',
        class: 'JSS 1',
        arm: 'A',
        gender: 'Male',
        status: 'Active',
        guardian: 'Mr. Adewale',
        phone: '+234801234567',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'student_2',
        admissionNo: 'ADM002',
        name: 'Chioma Okafor',
        class: 'JSS 1',
        arm: 'B',
        gender: 'Female',
        status: 'Active',
        guardian: 'Mrs. Okafor',
        phone: '+234802345678',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: 'student_3',
        admissionNo: 'ADM003',
        name: 'Tunde Oluwaseun',
        class: 'JSS 2',
        arm: 'A',
        gender: 'Male',
        status: 'Active',
        guardian: 'Mr. Oluwaseun',
        phone: '+234803456789',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];
    sampleStudents.forEach(s => studentsStore.set(s.id, s));
  }
}

export async function fetchStudents(): Promise<StudentDTO[]> {
  try {
    initializeSampleData();
    return Array.from(studentsStore.values()).sort((a, b) => 
      new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    );
  } catch (error) {
    console.error('Error fetching students:', error);
    return [];
  }
}

export async function createStudent(studentData: StudentPayload): Promise<StudentDTO> {
  try {
    initializeSampleData();
    const id = `student_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const student: StudentDTO = {
      id,
      ...studentData,
      created_at: now,
      updated_at: now,
    };
    
    studentsStore.set(id, student);
    return student;
  } catch (error) {
    console.error('Error creating student:', error);
    throw new Error('Failed to create student');
  }
}

export async function createStudents(studentsData: StudentPayload[]): Promise<StudentDTO[]> {
  try {
    initializeSampleData();
    const createdStudents: StudentDTO[] = [];

    for (const studentData of studentsData) {
      const student = await createStudent(studentData);
      createdStudents.push(student);
    }

    return createdStudents;
  } catch (error) {
    console.error('Error creating students:', error);
    throw new Error('Failed to create students');
  }
}

export async function updateStudent(id: string, studentData: Partial<StudentPayload>): Promise<StudentDTO | null> {
  try {
    initializeSampleData();
    const existing = studentsStore.get(id);
    
    if (!existing) {
      return null;
    }

    const updated: StudentDTO = {
      ...existing,
      ...studentData,
      updated_at: new Date().toISOString(),
    };
    
    studentsStore.set(id, updated);
    return updated;
  } catch (error) {
    console.error('Error updating student:', error);
    throw new Error('Failed to update student');
  }
}

export async function deleteStudent(id: string): Promise<boolean> {
  try {
    initializeSampleData();
    return studentsStore.delete(id);
  } catch (error) {
    console.error('Error deleting student:', error);
    return false;
  }
}
