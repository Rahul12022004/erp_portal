package domain

import "time"

type Hostel struct {
	ID               string
	SchoolID         string
	Name             string
	AssignedStudents []string
	CreatedAt        time.Time
	UpdatedAt        time.Time
}
