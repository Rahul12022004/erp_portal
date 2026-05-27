package repositories

import (
	"context"
	"github.com/erp-portal/go-backend/internal/modules/staff/domain"
)

type StaffRepository interface {
	FindByID(ctx context.Context, id string) (*domain.Staff, error)
	FindBySchool(ctx context.Context, schoolID string) ([]*domain.Staff, error)
	Create(ctx context.Context, s *domain.Staff) (*domain.Staff, error)
	Update(ctx context.Context, id string, updates map[string]interface{}) (*domain.Staff, error)
	Delete(ctx context.Context, id string) error
	FindByEmail(ctx context.Context, email string) (*domain.Staff, error)
}

type LeaveRepository interface {
	FindBySchool(ctx context.Context, schoolID string) ([]*domain.LeaveApplication, error)
	FindByTeacher(ctx context.Context, schoolID, teacherID string) ([]*domain.LeaveApplication, error)
	Create(ctx context.Context, l *domain.LeaveApplication) (*domain.LeaveApplication, error)
	UpdateStatus(ctx context.Context, id, status string) (*domain.LeaveApplication, error)
	FindByID(ctx context.Context, id string) (*domain.LeaveApplication, error)
}
