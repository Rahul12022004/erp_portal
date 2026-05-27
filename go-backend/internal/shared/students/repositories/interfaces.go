package repositories

import (
	"context"
	"github.com/erp-portal/go-backend/internal/shared/students/domain"
)

type StudentFilter struct {
	SchoolID     string
	ClassID      string
	AcademicYear string
	Status       string
	Search       string
	Skip         int64
	Limit        int64
}

type StudentRepository interface {
	FindByID(ctx context.Context, id string) (*domain.Student, error)
	Find(ctx context.Context, f StudentFilter) ([]*domain.Student, int64, error)
	Create(ctx context.Context, s *domain.Student) (*domain.Student, error)
	Update(ctx context.Context, id string, updates map[string]interface{}) (*domain.Student, error)
	Delete(ctx context.Context, id string) error
}
