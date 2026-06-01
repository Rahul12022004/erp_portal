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
	ID             string               `json:"_id"`
	SchoolID       string               `json:"schoolId"`
	Type           string               `json:"type"`
	StaffID        string               `json:"staffId,omitempty"`
	Amount         float64              `json:"amount"`
	PaidAmount     float64              `json:"paidAmount"`
	Status         string               `json:"status"`
	PaymentDate    string               `json:"paymentDate,omitempty"`
	AcademicYear   string               `json:"academicYear,omitempty"`
	Description    string               `json:"description,omitempty"`
	Remarks        string               `json:"remarks,omitempty"`
	PaymentHistory []PaymentHistoryItem `json:"paymentHistory,omitempty"`
	CreatedAt      time.Time            `json:"createdAt"`
	UpdatedAt      time.Time            `json:"updatedAt"`
}

type PaymentHistoryItem struct {
	ReceiptNumber string  `json:"receiptNumber"`
	TransactionID string  `json:"transactionId"`
	PaymentDate   string  `json:"paymentDate"`
	AmountPaid    float64 `json:"amountPaid"`
	PaymentType   string  `json:"paymentType"`
	SentToEmail   bool    `json:"sentToEmail"`
	CreatedAt     string  `json:"createdAt"`
}

// InvestorLedger tracks investor/trustee funding and repayments.
type InvestorLedger struct {
	ID           string               `json:"_id"`
	SchoolID     string               `json:"schoolId"`
	InvestorName string               `json:"investorName"`
	InvestorType string               `json:"investorType"` // investor | trustee | other
	Contact      string               `json:"contact,omitempty"`
	Description  string               `json:"description,omitempty"`
	Status       string               `json:"status"` // Active | Inactive
	Transactions []InvestorTx         `json:"transactions"`
	CreatedAt    time.Time            `json:"createdAt"`
}

type InvestorTx struct {
	ID     string  `json:"_id,omitempty"`
	Type   string  `json:"type"` // investment | repayment
	Amount float64 `json:"amount"`
	Date   string  `json:"date"`
	Note   string  `json:"note,omitempty"`
}
