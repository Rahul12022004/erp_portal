package domain

import "time"

type PeriodConfig struct {
	Index     int
	StartTime string
	EndTime   string
	IsBreak   bool
	Label     string
}

type Settings struct {
	ID           string
	SchoolID     string
	AcademicYear string
	WorkingDays  []string
	Periods      []PeriodConfig
	Modules      map[string]bool
	CreatedAt    time.Time
	UpdatedAt    time.Time
}
