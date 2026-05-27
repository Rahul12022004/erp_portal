package domain

import "time"

type Announcement struct {
	ID        string
	SchoolID  string
	Title     string
	Message   string
	Author    string
	CreatedAt time.Time
	UpdatedAt time.Time
}

type Campaign struct {
	ID         string
	SchoolID   string
	Title      string
	Message    string
	TargetType string // all | class | parent | staff
	TargetID   string
	Status     string // draft | sent | scheduled
	SentAt     *time.Time
	CreatedAt  time.Time
	UpdatedAt  time.Time
}
