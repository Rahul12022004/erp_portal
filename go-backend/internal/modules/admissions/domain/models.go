package domain

import "time"

type AdmissionInquiry struct {
	ID           string
	SchoolID     string
	StudentName  string
	ParentName   string
	ParentPhone  string
	ParentEmail  string
	Class        string
	AcademicYear string
	Status       string // new | contacted | enrolled | rejected
	Remarks      string
	CreatedAt    time.Time
	UpdatedAt    time.Time
}
