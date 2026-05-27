package services

import (
	"context"
	"fmt"

	"github.com/erp-portal/go-backend/internal/shared/students/domain"
	"github.com/erp-portal/go-backend/internal/shared/students/repositories"
)

type StudentService struct {
	repo repositories.StudentRepository
}

func New(repo repositories.StudentRepository) *StudentService {
	return &StudentService{repo: repo}
}

func (s *StudentService) List(ctx context.Context, f repositories.StudentFilter) ([]*domain.Student, int64, error) {
	if f.Limit == 0 {
		f.Limit = 50
	}
	return s.repo.Find(ctx, f)
}

func (s *StudentService) GetByID(ctx context.Context, id string) (*domain.Student, error) {
	st, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if st == nil {
		return nil, fmt.Errorf("student not found")
	}
	return st, nil
}

func (s *StudentService) Create(ctx context.Context, st *domain.Student) (*domain.Student, error) {
	if st.Status == "" {
		st.Status = "Active"
	}
	if st.TransportStatus == "" {
		st.TransportStatus = "NO_TRANSPORT"
	}
	return s.repo.Create(ctx, st)
}

func (s *StudentService) Update(ctx context.Context, id string, updates map[string]interface{}) (*domain.Student, error) {
	return s.repo.Update(ctx, id, updates)
}

func (s *StudentService) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}
