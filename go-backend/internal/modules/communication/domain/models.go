package domain

import "time"

type Announcement struct {
	ID        string    `json:"_id"`
	SchoolID  string    `json:"schoolId"`
	Title     string    `json:"title"`
	Message   string    `json:"message"`
	Author    string    `json:"author"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type Campaign struct {
	ID         string     `json:"_id"`
	SchoolID   string     `json:"schoolId"`
	Title      string     `json:"title"`
	Message    string     `json:"message"`
	TargetType string     `json:"targetType"`
	TargetID   string     `json:"targetId"`
	Status     string     `json:"status"`
	SentAt     *time.Time `json:"sentAt"`
	CreatedAt  time.Time  `json:"createdAt"`
	UpdatedAt  time.Time  `json:"updatedAt"`
}
