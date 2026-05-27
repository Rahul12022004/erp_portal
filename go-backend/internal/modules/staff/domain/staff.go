package domain

import "time"

type Staff struct {
	ID             string
	SchoolID       string
	Name           string
	Email          string
	Password       string // hashed, omit from responses
	Phone          string
	Position       string
	Department     string
	Qualification  string
	Address        string
	DateOfBirth    string
	Gender         string
	JoinDate       string
	Status         string // Active | Inactive | On Leave
	BankName       string
	AccountNumber  string
	IFSCCode       string
	AccountHolder  string
	PANNumber      string
	SalaryStructID string
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

type LeaveApplication struct {
	ID          string
	SchoolID    string
	TeacherID   string
	Title       string
	Description string
	LeaveType   string // Paid | Unpaid | Emergency
	Status      string // Pending | Approved | Rejected
	FileName    string
	FileData    string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}
