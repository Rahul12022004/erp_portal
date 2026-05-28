package domain

import "time"

type Class struct {
	ID               string
	SchoolID         string
	Name             string
	Section          string
	Stream           string
	ClassTeacherID   string
	AssignedTeachers []string
	AcademicYear     string
	Description      string
	MeetLink         string
	ClassCode        string
	StudentCount     int
	CreatedAt        time.Time
	UpdatedAt        time.Time
}

type Subject struct {
	ID           string
	SchoolID     string
	ClassID      string
	Name         string
	Code         string
	Description  string
	TeacherID    string
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type Exam struct {
	ID           string
	SchoolID     string
	ClassID      string
	Title        string
	ExamType     string
	Subject      string
	ExamDate     string
	StartTime    string
	EndTime      string
	TotalMarks   float64
	PassMarks    float64
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type Mark struct {
	ID          string
	SchoolID    string
	ExamID      string
	StudentID   string
	ClassID     string
	Subject     string
	MarksObt    float64
	TotalMarks  float64
	Grade       string
	Remarks     string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type Attendance struct {
	ID                       string
	SchoolID                 string
	StudentID                string
	StaffID                  string
	Date                     string // YYYY-MM-DD
	Status                   string // Present | Absent | Leave | Half Day
	Remarks                  string
	SelfMarked               bool
	SelfLocked               bool
	IsOutsideSchool          bool
	DistanceFromSchoolMeters float64
	CreatedAt                time.Time
	UpdatedAt                time.Time
}

type Assignment struct {
	ID          string
	SchoolID    string
	ClassID     string
	ClassName   string
	TeacherID   string
	Title       string
	Description string
	Subject     string
	DueDate     string
	FileData    string
	FileName    string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type AssignmentSubmission struct {
	ID           string
	AssignmentID string
	StudentID    string
	StudentName  string
	FileData     string
	FileName     string
	Status       string // submitted | graded
	Grade        string
	Feedback     string
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type Material struct {
	ID          string
	SchoolID    string
	ClassID     string
	ClassName   string
	TeacherID   string
	Title       string
	Description string
	Subject     string
	FileData    string
	FileName    string
	FileType    string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}
