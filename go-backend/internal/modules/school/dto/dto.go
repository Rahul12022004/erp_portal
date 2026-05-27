package dto

// CreateSchoolReq mirrors the Node.js school registration body.
type CreateSchoolReq struct {
	// School info
	SchoolName    string `json:"schoolName"    validate:"required"`
	SchoolEmail   string `json:"schoolEmail"`
	SchoolPhone   string `json:"schoolPhone"`
	SchoolAddress string `json:"schoolAddress"`
	SchoolWebsite string `json:"schoolWebsite"`
	SchoolType    string `json:"schoolType"`

	// Admin info
	AdminName     string `json:"adminName"     validate:"required"`
	AdminEmail    string `json:"adminEmail"    validate:"required,email"`
	AdminPassword string `json:"adminPassword"`
	AdminPhone    string `json:"adminPhone"`

	// System
	SubscriptionPlan string   `json:"subscriptionPlan"` // Basic | Standard | Premium
	Modules          []string `json:"modules"`
	MaxStudents      int      `json:"maxStudents"`
}

// UpdateSchoolReq allows partial profile updates.
type UpdateSchoolReq struct {
	SchoolName    string `json:"schoolName"`
	SchoolEmail   string `json:"schoolEmail"`
	SchoolPhone   string `json:"schoolPhone"`
	SchoolAddress string `json:"schoolAddress"`
	SchoolWebsite string `json:"schoolWebsite"`
	Logo          string `json:"logo"`
	SchoolType    string `json:"schoolType"`

	AdminName  string `json:"adminName"`
	AdminPhone string `json:"adminPhone"`
	AdminImage string `json:"adminImage"`
}

// SchoolSessionResp mirrors toSchoolSessionResponse from the TS backend.
type SchoolSessionResp struct {
	ID         string         `json:"_id"`
	Modules    []string       `json:"modules"`
	AdminInfo  AdminInfoResp  `json:"adminInfo"`
	SchoolInfo SchoolInfoResp `json:"schoolInfo"`
	SystemInfo SystemInfoResp `json:"systemInfo"`
}

type AdminInfoResp struct {
	Name   string `json:"name"`
	Email  string `json:"email"`
	Phone  string `json:"phone"`
	Image  string `json:"image"`
	Status string `json:"status"`
}

type SchoolInfoResp struct {
	Name     string      `json:"name"`
	Logo     string      `json:"logo"`
	Email    string      `json:"email"`
	Phone    string      `json:"phone"`
	Address  string      `json:"address"`
	Website  string      `json:"website"`
	Location interface{} `json:"location,omitempty"`
}

type SystemInfoResp struct {
	SchoolType          string `json:"schoolType"`
	SubscriptionPlan    string `json:"subscriptionPlan"`
	SubscriptionEndDate string `json:"subscriptionEndDate"`
}
