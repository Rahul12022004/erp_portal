package domain

import "time"

type Survey struct {
	ID          string
	SchoolID    string
	Title       string
	Description string
	Questions   []SurveyQuestion
	Status      string // draft | active | closed
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type SurveyQuestion struct {
	ID      string
	Text    string
	Type    string // text | radio | checkbox | rating
	Options []string
}

type SurveyResponse struct {
	ID        string
	SchoolID  string
	SurveyID  string
	UserID    string
	Answers   []SurveyAnswer
	CreatedAt time.Time
}

type SurveyAnswer struct {
	QuestionID string
	Answer     string
}
