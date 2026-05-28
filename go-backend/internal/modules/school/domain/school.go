package domain

import "time"

// School is the clean domain model — no BSON tags, no MongoDB types.
type School struct {
	ID         string     `json:"_id"`
	SchoolInfo SchoolInfo `json:"schoolInfo"`
	AdminInfo  AdminInfo  `json:"adminInfo"`
	SystemInfo SystemInfo `json:"systemInfo"`
	Modules    []string   `json:"modules"`
	CreatedAt  time.Time  `json:"createdAt"`
	UpdatedAt  time.Time  `json:"updatedAt"`
}

type SchoolInfo struct {
	Name     string    `json:"name"`
	Email    string    `json:"email"`
	Phone    string    `json:"phone"`
	Website  string    `json:"website"`
	Address  string    `json:"address"`
	Logo     string    `json:"logo"`
	Location *Location `json:"location"`
}

type Location struct {
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
	Radius    float64 `json:"radius"`
	Locked    bool    `json:"locked"`
}

type AdminInfo struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password,omitempty"`
	Phone    string `json:"phone"`
	Image    string `json:"image"`
	Status   string `json:"status"`
}

type SystemInfo struct {
	SchoolType          string `json:"schoolType"`
	SchoolNumber        string `json:"schoolNumber"`
	AffiliationNo       string `json:"affiliationNo"`
	MaxStudents         int    `json:"maxStudents"`
	SubscriptionPlan    string `json:"subscriptionPlan"`
	SubscriptionEndDate string `json:"subscriptionEndDate"`
}
