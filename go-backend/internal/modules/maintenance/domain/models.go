package domain

import "time"

type MaintenanceRequest struct {
	ID          string
	SchoolID    string
	Title       string
	Description string
	Location    string
	Priority    string // low | medium | high
	Status      string // open | in_progress | resolved
	ReportedBy  string
	AssignedTo  string
	ResolvedAt  *time.Time
	CreatedAt   time.Time
	UpdatedAt   time.Time
}
