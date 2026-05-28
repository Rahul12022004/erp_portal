package domain

import "time"

type Hostel struct {
	ID               string    `json:"_id"`
	SchoolID         string    `json:"schoolId"`
	Name             string    `json:"name"`
	AssignedStudents []string  `json:"assignedStudents"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}
