package domain

import "time"

type LibraryBook struct {
	ID              string    `json:"_id"`
	SchoolID        string    `json:"schoolId"`
	Title           string    `json:"title"`
	Author          string    `json:"author"`
	Category        string    `json:"category"`
	AccessionNumber string    `json:"accessionNumber"`
	ISBN            string    `json:"isbn"`
	Publisher       string    `json:"publisher"`
	Edition         string    `json:"edition"`
	Quantity        int       `json:"quantity"`
	AvailableCopies int       `json:"availableCopies"`
	Rack            string    `json:"rack"`
	Shelf           string    `json:"shelf"`
	Status          string    `json:"status"`
	CreatedAt       time.Time `json:"createdAt"`
	UpdatedAt       time.Time `json:"updatedAt"`
}

type LibraryAssignment struct {
	ID          string    `json:"_id"`
	SchoolID    string    `json:"schoolId"`
	BookID      string    `json:"bookId"`
	StudentID   string    `json:"studentId"`
	AssignDate  string    `json:"assignDate"`
	DueDate     string    `json:"dueDate"`
	ReturnDate  string    `json:"returnDate"`
	IssueStatus string    `json:"issueStatus"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}
