package domain

import "time"

type Student struct {
	ID                 string
	SchoolID           string
	Name               string
	Email              string
	FormNumber         string
	AdmissionNumber    string
	RegistrationNo     string
	Class              string
	ClassID            string
	ClassSection       string
	SectionID          string
	AcademicYear       string
	RollNumber         string
	Phone              string
	FatherName         string
	MotherName         string
	FatherPhone        string
	MotherPhone        string
	FatherEmail        string
	MotherEmail        string
	Address            string
	DateOfBirth        string
	Gender             string
	Religion           string
	Caste              string
	BloodGroup         string
	Nationality        string
	Status             string // Active | Inactive | Transferred | Left | Suspended
	NeedsTransport     bool
	TransportStatus    string // ACTIVE | INACTIVE | NO_TRANSPORT
	TransportRouteID   string
	House              string // Ruby | Emerald | Safier | Topaz
	Photo              string
	AdmissionCompleted bool
	CreatedAt          time.Time
	UpdatedAt          time.Time
}
