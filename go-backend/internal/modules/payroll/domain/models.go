package domain

import "time"

type Earning struct {
	Label  string  `json:"label"`
	Amount float64 `json:"amount"`
}

type Deduction struct {
	Label string  `json:"label"`
	Type  string  `json:"type"`
	Value float64 `json:"value"`
}

type SalaryStructure struct {
	ID         string      `json:"_id"`
	SchoolID   string      `json:"schoolId"`
	Name       string      `json:"name"`
	Status     string      `json:"status"`
	Earnings   []Earning   `json:"earnings"`
	Deductions []Deduction `json:"deductions"`
	CreatedAt  time.Time   `json:"createdAt"`
	UpdatedAt  time.Time   `json:"updatedAt"`
}

type PayrollEntry struct {
	ID          string     `json:"_id"`
	SchoolID    string     `json:"schoolId"`
	StaffID     string     `json:"staffId"`
	StaffName   string     `json:"staffName"`
	Month       int        `json:"month"`
	Year        int        `json:"year"`
	BasicSalary float64    `json:"basicSalary"`
	Allowances  float64    `json:"allowances"`
	Deductions  float64    `json:"deductions"`
	NetSalary   float64    `json:"netSalary"`
	Status      string     `json:"status"`
	PaidAt      *time.Time `json:"paidAt"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   time.Time  `json:"updatedAt"`
}
