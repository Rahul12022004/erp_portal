package domain

import "time"

type Transport struct {
	ID                  string    `json:"_id"`
	SchoolID            string    `json:"schoolId"`
	BusNumber           string    `json:"busNumber"`
	RouteName           string    `json:"routeName"`
	DriverName          string    `json:"driverName"`
	DriverPhone         string    `json:"driverPhone"`
	DriverLicenseNumber string    `json:"driverLicenseNumber"`
	ConductorName       string    `json:"conductorName"`
	ConductorPhone      string    `json:"conductorPhone"`
	RouteStops          []string  `json:"routeStops"`
	AssignedStudents    []string  `json:"assignedStudents"`
	RcExpiryDate        string    `json:"rcExpiryDate"`
	PollutionExpiryDate string    `json:"pollutionExpiryDate"`
	InsuranceExpiryDate string    `json:"insuranceExpiryDate"`
	FitnessExpiryDate   string    `json:"fitnessExpiryDate"`
	CreatedAt           time.Time `json:"createdAt"`
	UpdatedAt           time.Time `json:"updatedAt"`
}
