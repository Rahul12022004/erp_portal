package domain

import "time"

type TimeSlot struct {
	ID        string    `json:"_id"`
	SchoolID  string    `json:"schoolId"`
	Index     int       `json:"index"`
	StartTime string    `json:"startTime"`
	EndTime   string    `json:"endTime"`
	IsBreak   bool      `json:"isBreak"`
	Label     string    `json:"label"`
	CreatedAt time.Time `json:"createdAt"`
}

type Period struct {
	ID        string    `json:"_id"`
	SchoolID  string    `json:"schoolId"`
	ClassID   string    `json:"classId"`
	Section   string    `json:"section"`
	Day       string    `json:"day"`
	SlotIndex int       `json:"slotIndex"`
	Subject   string    `json:"subject"`
	TeacherID string    `json:"teacherId"`
	RoomID    string    `json:"roomId"`
	Locked    bool      `json:"locked"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}
