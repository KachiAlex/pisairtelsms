export interface Student {
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

export interface Lead {
  id: string;
  studentName: string;
  parentName: string;
  contactDetails: {
    phone: string;
    email: string;
  };
  classInterested: string;
  source: 'website' | 'open_day' | 'phone' | 'walk_in' | 'referral';
  createdAt: Date;
  status: 'new' | 'contacted' | 'form_shared' | 'converted' | 'lost';
}

export interface Application {
  id: string;
  leadId: string;
  studentInfo: {
    fullName: string;
    dateOfBirth: Date;
    gender: string;
    classApplying: string;
    previousSchool: string;
  };
  parentInfo: {
    names: string[];
    phones: string[];
    email: string;
    address: string;
  };
  documents: {
    birthCertificate?: File;
    passportPhoto?: File;
    previousResults?: File;
    medicalRecords?: File;
  };
  otherDetails: {
    emergencyContacts: string[];
    specialNeeds?: string;
    transportation?: string;
  };
  submittedAt: Date;
  status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'documents_pending';
  applicationFeePaid: boolean;
}

export interface Assessment {
  id: string;
  applicationId: string;
  entranceExamScheduled?: Date;
  placementTestScheduled?: Date;
  interviewScheduled?: Date;
  medicalCheckScheduled?: Date;
  results: {
    entranceExam?: number;
    placementTest?: string;
    interviewNotes?: string;
    medicalCheck?: 'passed' | 'failed';
  };
  status: 'scheduled' | 'completed' | 'awaiting_results' | 'offer_recommended' | 'rejected';
}

export interface AdmissionOffer {
  id: string;
  assessmentId: string;
  offerLetter: string;
  feeBreakdown: {
    admissionFee: number;
    tuitionFee: number;
    otherFees: number;
  };
  deadline: Date;
  status: 'sent' | 'accepted' | 'declined' | 'scholarship_requested' | 'expired';
}

export interface Enrollment {
  id: string;
  offerId: string;
  admissionFeePaid: boolean;
  documentsVerified: boolean;
  orientationScheduled?: Date;
  enrolledAt?: Date;
  status: 'pending' | 'documents_verifying' | 'orientation_pending' | 'completed';
}

export type EnrollmentStage = 'inquiry' | 'application' | 'review' | 'assessment' | 'offer' | 'enrollment';

export interface AttendanceRecord {
  id: string;
  studentId: string;
  class: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  academicSession: string;
  term: string;
  createdAt: string;
}
