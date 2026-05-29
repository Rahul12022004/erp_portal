import { PUBLIC_API_URL } from '$env/static/public';

export const API_BASE = PUBLIC_API_URL || '';

export const ENDPOINTS = {
  auth: {
    teacherLogin:     '/api/auth/staff/login',
    schoolAdminLogin: '/api/auth/school/login',
    superAdminLogin:  '/api/auth/super-admin/login',
    logout:           '/api/auth/logout',
  },

  schools: {
    list:          '/api/schools',
    register:      '/api/schools/register',
    byId:          (id: string)       => `/api/schools/${id}`,
    toggle:        (id: string)       => `/api/schools/toggle/${id}`,
    location:      (id: string)       => `/api/schools/${id}/location`,
    locationLock:  (id: string)       => `/api/schools/${id}/location-lock`,
    clearDatabase: '/api/schools/super-admin/clear-database',
  },

  staff: {
    bySchool: (schoolId: string) => `/api/staff/${schoolId}`,
    create:   '/api/staff',
    update:   (id: string)       => `/api/staff/${id}`,
    delete:   (id: string)       => `/api/staff/${id}`,
    session:  (schoolId: string, teacherId: string) => `/api/staff/session/${schoolId}/${teacherId}`,
  },

  teacherRoles: {
    bySchool: (schoolId: string) => `/api/teacher-roles/${schoolId}`,
    create:   '/api/teacher-roles',
    delete:   (id: string)       => `/api/teacher-roles/${id}`,
    login:    '/api/teacher-roles/login',
  },

  students: {
    bySchool: (schoolId: string) => `/api/students/${schoolId}`,
    create:   '/api/students',
    update:   (id: string)       => `/api/students/${id}`,
    delete:   (id: string)       => `/api/students/${id}`,
    import:   '/api/students/import',
  },

  classes: {
    bySchool: (schoolId: string)                    => `/api/classes?schoolId=${schoolId}`,
    byName:   (schoolId: string, className: string) => `/api/classes?schoolId=${schoolId}&name=${className}`,
    create:   '/api/classes',
    update:   (id: string)                          => `/api/classes/${id}`,
    delete:   (id: string)                          => `/api/classes/${id}`,
  },

  subjects: {
    bySchoolClass: (schoolId: string, classId: string) => `/api/subjects/${schoolId}/${classId}`,
    create:        '/api/subjects',
    delete:        (id: string)                        => `/api/subjects/${id}`,
  },

  attendance: {
    byDate:        (schoolId: string, date: string)                         => `/api/attendance/${schoolId}/${date}`,
    studentByDate: (schoolId: string, className: string, date: string)      => `/api/attendance/students/${schoolId}/${className}/${date}`,
    teacherByDate: (schoolId: string, teacherId: string, date: string)      => `/api/attendance/self/${schoolId}/${teacherId}/${date}`,
    report:        (schoolId: string)                                       => `/api/attendance/report/${schoolId}`,
    saveStudent:   '/api/attendance/students',
    saveTeacher:   '/api/attendance/self',
    lockTeacher:   '/api/attendance/self/lock',
    summary:       (schoolId: string)                                       => `/api/attendance/${schoolId}/summary`,
  },

  exams: {
    bySchool:  (schoolId: string)                    => `/api/exams/school/${schoolId}`,
    byTeacher: (schoolId: string, teacherId: string) => `/api/exams/teacher/${schoolId}/${teacherId}`,
    create:    '/api/exams',
    delete:    (id: string)                          => `/api/exams/${id}`,
    upload:    (examId: string)                      => `/api/exams/${examId}/upload`,
    aiCreate:  '/api/exams/ai-create',
  },

  marks: {
    byTeacher: (schoolId: string, teacherId: string)              => `/api/marks/${schoolId}/${teacherId}`,
    byExam:    (schoolId: string, teacherId: string, examId: string) => `/api/marks/${schoolId}/${teacherId}/${examId}`,
    download:  (schoolId: string, examId: string)                 => `/api/marks/download/${schoolId}/${examId}`,
    save:      '/api/marks',
  },

  assignments: {
    byClass:     (schoolId: string, classId: string)            => `/api/assignments/${schoolId}/${classId}`,
    byTeacher:   (schoolId: string, teacherId: string)          => `/api/assignments/${schoolId}/${teacherId}`,
    submissions: (assignmentId: string)                         => `/api/assignments/${assignmentId}/submissions`,
    grade:       (assignmentId: string, submissionId: string)   => `/api/assignments/${assignmentId}/grade/${submissionId}`,
    create:      '/api/assignments',
    delete:      (id: string)                                   => `/api/assignments/${id}`,
  },

  materials: {
    byClass: (schoolId: string, classId: string) => `/api/materials/${schoolId}/${classId}`,
    create:  '/api/materials',
    delete:  (id: string)                        => `/api/materials/${id}`,
  },

  leaves: {
    byTeacher: (schoolId: string, teacherId: string) => `/api/leaves/${schoolId}/${teacherId}`,
    bySchool:  (schoolId: string)                    => `/api/leaves/school/${schoolId}`,
    create:    '/api/leaves',
    status:    (leaveId: string)                     => `/api/leaves/${leaveId}/status`,
  },

  announcements: {
    // Go backend reads schoolId from query string, not a path param.
    bySchool: (schoolId: string) => `/api/announcements?schoolId=${schoolId}`,
    create:   '/api/announcements',
    delete:   (id: string)       => `/api/announcements/${id}`,
    aiDraft:  '/api/announcements/ai-draft',
  },

  campaigns: {
    bySchool: (schoolId: string) => `/api/campaigns?schoolId=${schoolId}`,
    create:   '/api/campaigns',
  },

  finance: {
    studentSummary:     (schoolId: string)                         => `/api/finance/${schoolId}/students/summary`,
    studentDetail:      (schoolId: string, studentId: string)      => `/api/finance/${schoolId}/students/${studentId}/summary`,
    studentExtension:   (schoolId: string, studentId: string)      => `/api/finance/${schoolId}/students/${studentId}/extension`,
    classFeeStructures: (schoolId: string)                         => `/api/finance/${schoolId}/class-fee-structures`,
    dashboardSummary:   (schoolId: string)                         => `/api/finance/${schoolId}/dashboard-summary`,
    availableYears:     (schoolId: string)                         => `/api/finance/${schoolId}/available-years`,
    staffSummary:       (schoolId: string)                         => `/api/finance/${schoolId}/staff/summary`,
    staffReport:        (schoolId: string, staffId: string)        => `/api/finance/${schoolId}/staff/${staffId}/salary-report`,
    salaryRoles:        (schoolId: string)                         => `/api/finance/${schoolId}/salary-roles`,
    assignments:        '/api/finance/assignments',
    payments:           '/api/finance/student-fee-payments',
    save:               '/api/finance',
    update:             (id: string)                               => `/api/finance/${id}`,
  },

  salaryStructures: {
    bySchool:  (schoolId: string)              => `/api/salary-structures/${schoolId}`,
    create:    (schoolId: string)              => `/api/salary-structures/${schoolId}`,
    update:    (schoolId: string, id: string)  => `/api/salary-structures/${schoolId}/${id}`,
    delete:    (schoolId: string, id: string)  => `/api/salary-structures/${schoolId}/${id}`,
    calculate: (schoolId: string, id: string)  => `/api/salary-structures/${schoolId}/${id}/calculate`,
  },

  payroll: {
    list:   '/api/payroll',
    create: '/api/payroll',
    pay:    (id: string) => `/api/payroll/${id}/pay`,
  },

  transport: {
    bySchool: (schoolId: string) => `/api/transport?schoolId=${schoolId}`,
    create:   '/api/transport',
    update:   (id: string)       => `/api/transport/${id}`,
    delete:   (id: string)       => `/api/transport/${id}`,
    readings: (busId: string)    => `/api/transport/${busId}/readings`,
  },

  hostel: {
    bySchool: (schoolId: string)  => `/api/hostel?schoolId=${schoolId}`,
    update:   (hostelId: string)  => `/api/hostel/${hostelId}`,
  },

  library: {
    bySchool: (schoolId: string) => `/api/library/books?schoolId=${schoolId}`,
    create:   '/api/library/books',
    assign:   '/api/library/assignments',
  },

  inventory: {
    bySchool: (schoolId: string)               => `/api/inventory?schoolId=${schoolId}`,
    create:   '/api/inventory',
    update:   (id: string)                     => `/api/inventory/${id}`,
    delete:   (id: string)                     => `/api/inventory/${id}`,
    action:   (id: string, actionType: string) => `/api/inventory/${id}/${actionType}`,
  },

  maintenance: {
    bySchool: (schoolId: string) => `/api/maintenance?schoolId=${schoolId}`,
    create:   '/api/maintenance',
    delete:   (id: string)       => `/api/maintenance/${id}`,
  },

  visitors: {
    bySchool: (schoolId: string) => `/api/visitors?schoolId=${schoolId}`,
    create:   '/api/visitors',
    delete:   (id: string)       => `/api/visitors/${id}`,
    scanExit: '/api/visitors/scan-exit',
  },

  surveys: {
    bySchool: (schoolId: string)  => `/api/surveys?schoolId=${schoolId}`,
    create:   '/api/surveys',
    status:   (surveyId: string)  => `/api/surveys/${surveyId}/status`,
    delete:   (surveyId: string)  => `/api/surveys/${surveyId}`,
  },

  socialMedia: {
    bySchool: (schoolId: string) => `/api/social-media/${schoolId}`,
    create:   '/api/social-media',
    update:   (id: string)       => `/api/social-media/${id}`,
    delete:   (id: string)       => `/api/social-media/${id}`,
  },

  notifications: {
    bySchool: (schoolId: string) => `/api/notifications?schoolId=${schoolId}`,
    markRead: (id: string)       => `/api/notifications/${id}/read`,
  },

  analytics: {
    dashboard:       (schoolId: string) => `/api/analytics/dashboard?schoolId=${schoolId}`,
    enrollmentTrend: (schoolId: string) => `/api/analytics/enrollment/trend?schoolId=${schoolId}`,
    feeTrend:        (schoolId: string) => `/api/analytics/fee/trend?schoolId=${schoolId}`,
    attendanceRate:  (schoolId: string) => `/api/analytics/attendance/rate?schoolId=${schoolId}`,
  },

  reports: {
    studentStrength:   (schoolId: string) => `/api/reports/students/strength?schoolId=${schoolId}`,
    financeCollection: (schoolId: string) => `/api/reports/finance/collection?schoolId=${schoolId}`,
    attendanceSummary: (schoolId: string) => `/api/reports/attendance/summary?schoolId=${schoolId}`,
    staff:             (schoolId: string) => `/api/reports/staff?schoolId=${schoolId}`,
  },

  dataImport: {
    preview:  '/api/data-import/preview',
    validate: '/api/data-import/validate',
    import:   '/api/data-import/import',
    history:  (schoolId: string) => `/api/data-import/history/${schoolId}`,
    rollback: (batchId: string)  => `/api/data-import/rollback/${batchId}`,
    reimport: (batchId: string)  => `/api/data-import/reimport/${batchId}`,
  },

  dashboard: {
    teacher: (schoolId: string, teacherId: string) => `/api/dashboard/teacher/${schoolId}/${teacherId}`,
  },

  logs: {
    list: '/api/logs',
  },

  health: {
    basic:   '/api/health',
    details: '/api/health/details',
  },
} as const;
