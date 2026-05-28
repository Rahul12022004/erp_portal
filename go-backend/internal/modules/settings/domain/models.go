package domain

import "time"

// GeneralConfig holds platform-wide super-admin configuration.
type GeneralConfig struct {
	// Branding
	AppName        string `json:"appName" bson:"appName"`
	LogoURL        string `json:"logoUrl" bson:"logoUrl"`
	CurrencySymbol string `json:"currencySymbol" bson:"currencySymbol"`

	// Academic
	AcademicYear string `json:"academicYear" bson:"academicYear"`
	SupportEmail string `json:"supportEmail" bson:"supportEmail"`
	SupportPhone string `json:"supportPhone" bson:"supportPhone"`

	// Registration
	AllowSelfRegistration bool   `json:"allowSelfRegistration" bson:"allowSelfRegistration"`
	DefaultPlan           string `json:"defaultPlan" bson:"defaultPlan"`
	MaxSchools            int    `json:"maxSchools" bson:"maxSchools"`

	// Security
	SessionTimeoutMinutes int  `json:"sessionTimeoutMinutes" bson:"sessionTimeoutMinutes"`
	MaxLoginAttempts      int  `json:"maxLoginAttempts" bson:"maxLoginAttempts"`
	Require2FAAdmin       bool `json:"require2FAAdmin" bson:"require2FAAdmin"`
	Require2FASchool      bool `json:"require2FASchool" bson:"require2FASchool"`

	// SMTP / Email
	SMTPHost      string `json:"smtpHost" bson:"smtpHost"`
	SMTPPort      int    `json:"smtpPort" bson:"smtpPort"`
	SMTPUsername  string `json:"smtpUsername" bson:"smtpUsername"`
	SMTPPassword  string `json:"smtpPassword,omitempty" bson:"smtpPassword"`
	SMTPFromName  string `json:"smtpFromName" bson:"smtpFromName"`
	SMTPFromEmail string `json:"smtpFromEmail" bson:"smtpFromEmail"`

	// Announcement Banner
	AnnouncementEnabled bool   `json:"announcementEnabled" bson:"announcementEnabled"`
	AnnouncementMessage string `json:"announcementMessage" bson:"announcementMessage"`
	AnnouncementType    string `json:"announcementType" bson:"announcementType"` // info | warning | critical
	AnnouncementTarget  string `json:"announcementTarget" bson:"announcementTarget"` // all | school-admin | student

	// Password Policy
	MinPasswordLength  int  `json:"minPasswordLength" bson:"minPasswordLength"`
	RequireUppercase   bool `json:"requireUppercase" bson:"requireUppercase"`
	RequireNumber      bool `json:"requireNumber" bson:"requireNumber"`
	RequireSpecialChar bool `json:"requireSpecialChar" bson:"requireSpecialChar"`
	PasswordExpiryDays int  `json:"passwordExpiryDays" bson:"passwordExpiryDays"`

	// Storage & Uploads
	MaxUploadSizeMB         int `json:"maxUploadSizeMB" bson:"maxUploadSizeMB"`
	StorageQuotaPerSchoolMB int `json:"storageQuotaPerSchoolMB" bson:"storageQuotaPerSchoolMB"`

	UpdatedAt time.Time `json:"-" bson:"updatedAt"`
}

// DefaultGeneralConfig returns sensible defaults when no config exists yet.
func DefaultGeneralConfig() *GeneralConfig {
	return &GeneralConfig{
		AppName:               "ERP Portal",
		CurrencySymbol:        "₹",
		AcademicYear:          "2025-2026",
		AllowSelfRegistration: true,
		DefaultPlan:           "Basic",
		MaxSchools:            500,
		SessionTimeoutMinutes: 30,
		MaxLoginAttempts:      5,
		SMTPPort:              587,
		AnnouncementType:      "info",
		AnnouncementTarget:    "all",
		MinPasswordLength:     8,
		RequireNumber:         true,
		MaxUploadSizeMB:       10,
		StorageQuotaPerSchoolMB: 1024,
	}
}

type PeriodConfig struct {
	Index     int    `json:"index"`
	StartTime string `json:"startTime"`
	EndTime   string `json:"endTime"`
	IsBreak   bool   `json:"isBreak"`
	Label     string `json:"label"`
}

type Settings struct {
	ID           string          `json:"_id"`
	SchoolID     string          `json:"schoolId"`
	AcademicYear string          `json:"academicYear"`
	WorkingDays  []string        `json:"workingDays"`
	Periods      []PeriodConfig  `json:"periods"`
	Modules      map[string]bool `json:"modules"`
	CreatedAt    time.Time       `json:"createdAt"`
	UpdatedAt    time.Time       `json:"updatedAt"`
}
