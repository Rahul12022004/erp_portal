package domain

import "time"

type LibraryBook struct {
	ID              string
	SchoolID        string
	Title           string
	Author          string
	Category        string
	AccessionNumber string
	ISBN            string
	Publisher       string
	Edition         string
	Quantity        int
	AvailableCopies int
	Rack            string
	Shelf           string
	Status          string // active | out_of_stock | archived
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

type LibraryAssignment struct {
	ID          string
	SchoolID    string
	BookID      string
	StudentID   string
	AssignDate  string
	DueDate     string
	ReturnDate  string
	IssueStatus string // issued | returned | overdue
	CreatedAt   time.Time
	UpdatedAt   time.Time
}
