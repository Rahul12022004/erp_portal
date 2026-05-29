// Mirrors the Go backend Student domain (camelCase JSON).
export interface Student {
  _id: string;
  schoolId: string;
  name: string;
  email: string;
  class: string;
  classSection: string;
  rollNumber: string;
  academicYear: string;
  phone: string;
  gender: string;
  status: string;
  needsTransport: boolean;
  admissionCompleted: boolean;
}

// Minimum fields the Go create/update handlers require.
export interface CreateStudentInput {
  name: string;
  email: string;
  class: string;
  rollNumber: string;
  schoolId: string;
  classSection?: string;
  academicYear?: string;
  phone?: string;
  gender?: string;
  needsTransport?: boolean;
}
