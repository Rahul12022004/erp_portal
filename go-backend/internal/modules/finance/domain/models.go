package domain

import "time"

// ClassFeeStructure defines the fee template for a class.
type ClassFeeStructure struct {
	ID              string
	SchoolID        string
	ClassID         string
	AcademicYear    string
	AcademicFee     float64
	TransportFee    float64
	OtherFee        float64
	DueDate         string
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

// StudentFeeAssignment is the per-student fee record.
type StudentFeeAssignment struct {
	ID                  string
	SchoolID            string
	StudentID           string
	ClassFeeStructureID string
	AcademicYear        string
	AcademicFee         float64
	TransportFee        float64
	OtherFee            float64
	DiscountAmount      float64
	TotalFee            float64
	PaidAmount          float64
	DueAmount           float64
	FeeStatus           string // UNPAID | PARTIAL | PAID | OVERDUE
	DueDate             string
	LastPaymentDate     string
	LateFeeAmount       float64
	CreatedAt           time.Time
	UpdatedAt           time.Time
}

// StudentFeePayment is a single payment transaction.
type StudentFeePayment struct {
	ID                     string
	SchoolID               string
	StudentFeeAssignmentID string
	StudentID              string
	PaymentAmount          float64
	PaymentDate            string
	PaymentMode            string // Cash | Online | Cheque | DD
	TransactionID          string
	Remarks                string
	ReceiptNumber          string
	CreatedAt              time.Time
}

// Finance is the generic record (salary, expense, other).
type Finance struct {
	ID        string
	SchoolID  string
	Type      string // student_fee | staff_salary | other
	Amount    float64
	Status    string
	Remarks   string
	CreatedAt time.Time
	UpdatedAt time.Time
}
