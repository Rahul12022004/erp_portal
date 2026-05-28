package domain

import "time"

type Staff struct {
	ID             string    `json:"_id"`
	SchoolID       string    `json:"schoolId"`
	Name           string    `json:"name"`
	Email          string    `json:"email"`
	Password       string    `json:"password,omitempty"`
	Phone          string    `json:"phone"`
	Position       string    `json:"position"`
	Department     string    `json:"department"`
	Qualification  string    `json:"qualification"`
	Address        string    `json:"address"`
	DateOfBirth    string    `json:"dateOfBirth"`
	Gender         string    `json:"gender"`
	JoinDate       string    `json:"joinDate"`
	Status         string    `json:"status"`
	BankName       string    `json:"bankName"`
	AccountNumber  string    `json:"accountNumber"`
	IFSCCode       string    `json:"ifscCode"`
	AccountHolder  string    `json:"accountHolderName"`
	PANNumber      string    `json:"panNumber"`
	SalaryStructID string    `json:"salaryStructureId"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

type LeaveApplication struct {
	ID          string    `json:"_id"`
	SchoolID    string    `json:"schoolId"`
	TeacherID   string    `json:"teacherId"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	LeaveType   string    `json:"leaveType"`
	Status      string    `json:"status"`
	FileName    string    `json:"fileName"`
	FileData    string    `json:"fileData"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}
