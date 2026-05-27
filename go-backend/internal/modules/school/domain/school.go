package domain

import "time"

// School is the clean domain model — no BSON tags, no MongoDB types.
type School struct {
	ID string

	SchoolInfo SchoolInfo
	AdminInfo  AdminInfo
	SystemInfo SystemInfo
	Modules    []string

	CreatedAt time.Time
	UpdatedAt time.Time
}

type SchoolInfo struct {
	Name     string
	Email    string
	Phone    string
	Website  string
	Address  string
	Logo     string
	Location *Location
}

type Location struct {
	Latitude  float64
	Longitude float64
	Radius    float64
	Locked    bool
}

type AdminInfo struct {
	Name     string
	Email    string
	Password string // hashed — only set on create/login
	Phone    string
	Image    string
	Status   string // Active | Disabled
}

type SystemInfo struct {
	SchoolType          string
	SchoolNumber        string
	AffiliationNo       string
	MaxStudents         int
	SubscriptionPlan    string // Basic | Standard | Premium
	SubscriptionEndDate string
}
