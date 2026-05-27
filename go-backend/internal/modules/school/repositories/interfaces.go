package repositories

import (
	"context"
	"github.com/erp-portal/go-backend/internal/modules/school/domain"
)

// SchoolRepository is the DB-agnostic contract for school persistence.
type SchoolRepository interface {
	FindByID(ctx context.Context, id string) (*domain.School, error)
	FindByEmail(ctx context.Context, email string) (*domain.School, error)
	Create(ctx context.Context, s *domain.School) (*domain.School, error)
	Update(ctx context.Context, id string, updates map[string]interface{}) (*domain.School, error)
	Delete(ctx context.Context, id string) error
	List(ctx context.Context, skip, limit int64) ([]*domain.School, int64, error)
}
