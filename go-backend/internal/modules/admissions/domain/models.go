package domain

import "time"

type AdmissionInquiry struct {
	ID           string    `json:"_id"`
	SchoolID     string    `json:"schoolId"`
	StudentName  string    `json:"studentName"`
	ParentName   string    `json:"parentName"`
	ParentPhone  string    `json:"parentPhone"`
	ParentEmail  string    `json:"parentEmail"`
	Class        string    `json:"class"`
	AcademicYear string    `json:"academicYear"`
	Status       string    `json:"status"`
	Remarks      string    `json:"remarks"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}
