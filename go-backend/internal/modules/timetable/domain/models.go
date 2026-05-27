package domain

import "time"

type TimeSlot struct {
	ID        string
	SchoolID  string
	Index     int
	StartTime string
	EndTime   string
	IsBreak   bool
	Label     string
	CreatedAt time.Time
}

type Period struct {
	ID        string
	SchoolID  string
	ClassID   string
	Section   string
	Day       string // Mon|Tue|Wed|Thu|Fri|Sat
	SlotIndex int
	Subject   string
	TeacherID string
	RoomID    string
	Locked    bool
	CreatedAt time.Time
	UpdatedAt time.Time
}
