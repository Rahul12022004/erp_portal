package dto

type SchoolLoginReq struct {
	Email    string `json:"email"    validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type StaffLoginReq struct {
	Email    string `json:"email"    validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type SuperAdminLoginReq struct {
	Email    string `json:"email"    validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type RegisterSchoolReq struct {
	SchoolName       string `json:"schoolName"       validate:"required"`
	AdminName        string `json:"adminName"        validate:"required"`
	AdminEmail       string `json:"adminEmail"       validate:"required,email"`
	AdminPassword    string `json:"adminPassword"`
	SubscriptionPlan string `json:"subscriptionPlan"`
}
