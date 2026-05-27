package domain

import "time"

type Transport struct {
	ID                        string
	SchoolID                  string
	BusNumber                 string
	RouteName                 string
	DriverName                string
	DriverPhone               string
	DriverLicenseNumber       string
	ConductorName             string
	ConductorPhone            string
	RouteStops                []string
	AssignedStudents          []string
	RcExpiryDate              string
	PollutionExpiryDate       string
	InsuranceExpiryDate       string
	FitnessExpiryDate         string
	CreatedAt                 time.Time
	UpdatedAt                 time.Time
}
