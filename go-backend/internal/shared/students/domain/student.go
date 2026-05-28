package domain

import "time"

type Student struct {
	ID                 string    `json:"_id"`
	SchoolID           string    `json:"schoolId"`
	Name               string    `json:"name"`
	Email              string    `json:"email"`
	FormNumber         string    `json:"formNumber"`
	AdmissionNumber    string    `json:"admissionNumber"`
	RegistrationNo     string    `json:"registration_no"`
	Class              string    `json:"class"`
	ClassID            string    `json:"class_id"`
	ClassSection       string    `json:"classSection"`
	SectionID          string    `json:"section_id"`
	AcademicYear       string    `json:"academicYear"`
	RollNumber         string    `json:"rollNumber"`
	Phone              string    `json:"phone"`
	FatherName         string    `json:"father_name"`
	MotherName         string    `json:"mother_name"`
	FatherPhone        string    `json:"fatherPhone"`
	MotherPhone        string    `json:"motherPhone"`
	FatherEmail        string    `json:"fatherEmail"`
	MotherEmail        string    `json:"motherEmail"`
	Address            string    `json:"address"`
	DateOfBirth        string    `json:"dateOfBirth"`
	Gender             string    `json:"gender"`
	Religion           string    `json:"religion"`
	Caste              string    `json:"caste"`
	BloodGroup         string    `json:"bloodGroup"`
	Nationality        string    `json:"nationality"`
	Status             string    `json:"status"`
	NeedsTransport     bool      `json:"needsTransport"`
	TransportStatus    string    `json:"transport_status"`
	TransportRouteID   string    `json:"transport_route_id"`
	House              string    `json:"house"`
	Photo              string    `json:"photo"`
	AdmissionCompleted bool      `json:"admissionCompleted"`
	CreatedAt          time.Time `json:"createdAt"`
	UpdatedAt          time.Time `json:"updatedAt"`
}
