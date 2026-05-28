package domain

import "time"

type Survey struct {
	ID          string           `json:"_id"`
	SchoolID    string           `json:"schoolId"`
	Title       string           `json:"title"`
	Description string           `json:"description"`
	Questions   []SurveyQuestion `json:"questions"`
	Status      string           `json:"status"`
	CreatedAt   time.Time        `json:"createdAt"`
	UpdatedAt   time.Time        `json:"updatedAt"`
}

type SurveyQuestion struct {
	ID      string   `json:"_id"`
	Text    string   `json:"text"`
	Type    string   `json:"type"`
	Options []string `json:"options"`
}

type SurveyResponse struct {
	ID        string         `json:"_id"`
	SchoolID  string         `json:"schoolId"`
	SurveyID  string         `json:"surveyId"`
	UserID    string         `json:"userId"`
	Answers   []SurveyAnswer `json:"answers"`
	CreatedAt time.Time      `json:"createdAt"`
}

type SurveyAnswer struct {
	QuestionID string `json:"questionId"`
	Answer     string `json:"answer"`
}
