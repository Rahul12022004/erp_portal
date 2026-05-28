package domain

import "time"

type Visitor struct {
	ID           string     `json:"_id"`
	SchoolID     string     `json:"schoolId"`
	Name         string     `json:"name"`
	Phone        string     `json:"phone"`
	Purpose      string     `json:"purpose"`
	PersonToMeet string     `json:"personToMeet"`
	CheckIn      time.Time  `json:"checkIn"`
	CheckOut     *time.Time `json:"checkOut"`
	Status       string     `json:"status"`
	CreatedAt    time.Time  `json:"createdAt"`
}
