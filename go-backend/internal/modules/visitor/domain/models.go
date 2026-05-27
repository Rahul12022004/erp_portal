package domain

import "time"

type Visitor struct {
	ID          string
	SchoolID    string
	Name        string
	Phone       string
	Purpose     string
	PersonToMeet string
	CheckIn     time.Time
	CheckOut    *time.Time
	Status      string // checked_in | checked_out
	CreatedAt   time.Time
}
