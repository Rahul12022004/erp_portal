package domain

import "time"

// ClassFeeStructure defines the fee template for a class.
type ClassFeeStructure struct {
	ID           string    `json:"_id"`
	SchoolID     string    `json:"school_id"`
	ClassID      string    `json:"class_id"`
	AcademicYear string    `json:"academic_year"`
	AcademicFee  float64   `json:"academic_fee"`
	TransportFee float64   `json:"default_transport_fee"`
	OtherFee     float64   `json:"other_fee"`
	DueDate      string    `json:"due_date"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

// StudentFeeAssignment is the per-student fee record.
type StudentFeeAssignment struct {
	ID                  string    `json:"_id"`
	SchoolID            string    `json:"schoolId"`
	StudentID           string    `json:"studentId"`
	ClassFeeStructureID string    `json:"classFeeStructureId"`
	AcademicYear        string    `json:"academicYear"`
	AcademicFee         float64   `json:"academicFee"`
	TransportFee        float64   `json:"transportFee"`
	OtherFee            float64   `json:"otherFee"`
	DiscountAmount      float64   `json:"discountAmount"`
	TotalFee            float64   `json:"totalFee"`
	PaidAmount          float64   `json:"paidAmount"`
	DueAmount           float64   `json:"dueAmount"`
	FeeStatus           string    `json:"feeStatus"`
	DueDate             string    `json:"dueDate"`
	LastPaymentDate     string    `json:"lastPaymentDate"`
	LateFeeAmount       float64   `json:"lateFeeAmount"`
	CreatedAt           time.Time `json:"createdAt"`
	UpdatedAt           time.Time `json:"updatedAt"`
}

// StudentFeePayment is a single payment transaction.
type StudentFeePayment struct {
	ID                     string    `json:"_id"`
	SchoolID               string    `json:"schoolId"`
	StudentFeeAssignmentID string    `json:"studentFeeAssignmentId"`
	StudentID              string    `json:"studentId"`
	PaymentAmount          float64   `json:"paymentAmount"`
	PaymentDate            string    `json:"paymentDate"`
	PaymentMode            string    `json:"paymentMode"`
	TransactionID          string    `json:"transactionId"`
	Remarks                string    `json:"remarks"`
	ReceiptNumber          string    `json:"receiptNumber"`
	CreatedAt              time.Time `json:"createdAt"`
}

// Finance is the generic record (salary, expense, other).
type Finance struct {
	ID        string    `json:"_id"`
	SchoolID  string    `json:"schoolId"`
	Type      string    `json:"type"`
	Amount    float64   `json:"amount"`
	Status    string    `json:"status"`
	Remarks   string    `json:"remarks"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}
