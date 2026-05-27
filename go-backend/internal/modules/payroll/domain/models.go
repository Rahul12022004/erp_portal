package domain

import "time"

type PayrollEntry struct {
	ID          string
	SchoolID    string
	StaffID     string
	StaffName   string
	Month       int
	Year        int
	BasicSalary float64
	Allowances  float64
	Deductions  float64
	NetSalary   float64
	Status      string // pending | paid | cancelled
	PaidAt      *time.Time
	CreatedAt   time.Time
	UpdatedAt   time.Time
}
