package domain

import "time"

type Earning struct {
	Label  string  `json:"label"`
	Amount float64 `json:"amount"`
}

type Deduction struct {
	Label string  `json:"label"`
	Type  string  `json:"type"` // "percentage" | "amount"
	Value float64 `json:"value"`
}

type SalaryStructure struct {
	ID         string      `json:"_id"`
	SchoolID   string      `json:"schoolId"`
	Name       string      `json:"name"`
	Status     string      `json:"status"` // Active | Inactive
	Earnings   []Earning   `json:"earnings"`
	Deductions []Deduction `json:"deductions"`
	CreatedAt  time.Time   `json:"createdAt"`
	UpdatedAt  time.Time   `json:"updatedAt"`
}

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
