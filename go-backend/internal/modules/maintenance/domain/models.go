package domain

import "time"

type MaintenanceRequest struct {
	ID          string     `json:"_id"`
	SchoolID    string     `json:"schoolId"`
	Title       string     `json:"title"`
	Description string     `json:"description"`
	Location    string     `json:"location"`
	Priority    string     `json:"priority"`
	Status      string     `json:"status"`
	ReportedBy  string     `json:"reportedBy"`
	AssignedTo  string     `json:"assignedTo"`
	ResolvedAt  *time.Time `json:"resolvedAt"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
}
