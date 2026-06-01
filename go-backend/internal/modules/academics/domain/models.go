package domain

import "time"

type Class struct {
	ID               string    `json:"_id"`
	SchoolID         string    `json:"schoolId"`
	Name             string    `json:"name"`
	Section          string    `json:"section"`
	Stream           string    `json:"stream"`
	ClassTeacherID   string    `json:"classTeacher"`
	AssignedTeachers []string  `json:"assignedTeachers"`
	AcademicYear     string    `json:"academicYear"`
	Description      string    `json:"description"`
	MeetLink         string    `json:"meetLink"`
	ClassCode        string    `json:"classCode"`
	StudentCount     int       `json:"studentCount"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

type Subject struct {
	ID          string    `json:"_id"`
	SchoolID    string    `json:"schoolId"`
	ClassID     string    `json:"classId"`
	Name        string    `json:"name"`
	Code        string    `json:"code"`
	Description string    `json:"description"`
	TeacherID   string    `json:"teacherId"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type Exam struct {
	ID         string    `json:"_id"`
	SchoolID   string    `json:"schoolId"`
	ClassID    string    `json:"classId"`
	ClassName  string    `json:"className"`
	Title      string    `json:"title"`
	ExamType   string    `json:"examType"`
	Subject    string    `json:"subject"`
	ExamDate   string    `json:"examDate"`
	StartTime  string    `json:"startTime"`
	EndTime    string    `json:"endTime"`
	TotalMarks float64   `json:"totalMarks"`
	PassMarks  float64   `json:"passMarks"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

type Mark struct {
	ID         string    `json:"_id"`
	SchoolID   string    `json:"schoolId"`
	ExamID     string    `json:"examId"`
	StudentID  string    `json:"studentId"`
	ClassID    string    `json:"classId"`
	Subject    string    `json:"subject"`
	MarksObt   float64   `json:"marksObt"`
	TotalMarks float64   `json:"totalMarks"`
	Grade      string    `json:"grade"`
	Remarks    string    `json:"remarks"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

type Attendance struct {
	ID                       string    `json:"_id"`
	SchoolID                 string    `json:"schoolId"`
	StudentID                string    `json:"studentId"`
	StaffID                  string    `json:"staffId"`
	Date                     string    `json:"date"`
	Status                   string    `json:"status"`
	Remarks                  string    `json:"remarks"`
	SelfMarked               bool      `json:"selfMarked"`
	SelfLocked               bool      `json:"selfLocked"`
	IsOutsideSchool          bool      `json:"isOutsideSchool"`
	DistanceFromSchoolMeters float64   `json:"distanceFromSchoolMeters"`
	CreatedAt                time.Time `json:"createdAt"`
	UpdatedAt                time.Time `json:"updatedAt"`
}

type Assignment struct {
	ID                string    `json:"_id"`
	SchoolID          string    `json:"schoolId"`
	ClassID           string    `json:"classId"`
	ClassName         string    `json:"className"`
	TeacherID         string    `json:"teacherId"`
	Title             string    `json:"title"`
	Description       string    `json:"description"`
	Instructions      string    `json:"instructions"`
	Subject           string    `json:"subject"`
	DueDate           string    `json:"dueDate"`
	TotalPoints       float64   `json:"totalPoints"`
	Status            string    `json:"status"`
	SubmissionsTotal  int       `json:"submissionsTotal"`
	SubmissionsGraded int       `json:"submissionsGraded"`
	FileData          string    `json:"fileData"`
	FileName          string    `json:"fileName"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

type AssignmentSubmission struct {
	ID           string     `json:"_id"`
	AssignmentID string     `json:"assignmentId"`
	StudentID    string     `json:"studentId"`
	StudentName  string     `json:"studentName"`
	Content      string     `json:"content"`
	FileData     string     `json:"fileData"`
	FileName     string     `json:"fileName"`
	Status       string     `json:"status"`
	GradePoints  *float64   `json:"gradePoints"`
	GradeComment string     `json:"gradeComment"`
	SubmittedAt  *time.Time `json:"submittedAt"`
	CreatedAt    time.Time  `json:"createdAt"`
	UpdatedAt    time.Time  `json:"updatedAt"`
}

type Material struct {
	ID          string    `json:"_id"`
	SchoolID    string    `json:"schoolId"`
	ClassID     string    `json:"classId"`
	ClassName   string    `json:"className"`
	TeacherID   string    `json:"teacherId"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Subject     string    `json:"subject"`
	Type        string    `json:"type"`
	URL         string    `json:"url"`
	FileData    string    `json:"fileData"`
	FileName    string    `json:"fileName"`
	FileType    string    `json:"fileType"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}
