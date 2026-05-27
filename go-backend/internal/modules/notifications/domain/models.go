package domain

import "time"

type Notification struct {
	ID        string
	SchoolID  string
	UserID    string
	Title     string
	Body      string
	Type      string // info | warning | success | error
	IsRead    bool
	CreatedAt time.Time
}
