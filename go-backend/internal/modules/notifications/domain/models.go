package domain

import "time"

type Notification struct {
	ID        string    `json:"_id"`
	SchoolID  string    `json:"schoolId"`
	UserID    string    `json:"userId"`
	Title     string    `json:"title"`
	Body      string    `json:"body"`
	Type      string    `json:"type"`
	IsRead    bool      `json:"isRead"`
	CreatedAt time.Time `json:"createdAt"`
}
