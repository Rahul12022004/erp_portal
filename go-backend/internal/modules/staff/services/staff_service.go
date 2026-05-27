package services

import (
	"context"
	"fmt"

	"github.com/erp-portal/go-backend/internal/modules/staff/domain"
	"github.com/erp-portal/go-backend/internal/modules/staff/repositories"
	"github.com/erp-portal/go-backend/pkg/password"
)

type StaffService struct {
	repo repositories.StaffRepository
}

func NewStaffService(repo repositories.StaffRepository) *StaffService {
	return &StaffService{repo: repo}
}

func (s *StaffService) ListBySchool(ctx context.Context, schoolID string) ([]*domain.Staff, error) {
	return s.repo.FindBySchool(ctx, schoolID)
}

func (s *StaffService) GetByID(ctx context.Context, id string) (*domain.Staff, error) {
	st, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if st == nil {
		return nil, fmt.Errorf("staff not found")
	}
	st.Password = ""
	return st, nil
}

type CreateStaffReq struct {
	SchoolID      string `json:"schoolId"      validate:"required"`
	Name          string `json:"name"          validate:"required"`
	Email         string `json:"email"         validate:"required,email"`
	Phone         string `json:"phone"`
	Position      string `json:"position"`
	Department    string `json:"department"`
	Qualification string `json:"qualification"`
	Address       string `json:"address"`
	DateOfBirth   string `json:"dateOfBirth"`
	Gender        string `json:"gender"`
	JoinDate      string `json:"joinDate"`
	Status        string `json:"status"`
	Password      string `json:"password"`
}

func (s *StaffService) Create(ctx context.Context, req CreateStaffReq) (*domain.Staff, error) {
	if existing, _ := s.repo.FindByEmail(ctx, req.Email); existing != nil {
		return nil, fmt.Errorf("email already in use")
	}

	hashed := ""
	if req.Password != "" {
		var err error
		hashed, err = password.Hash(req.Password)
		if err != nil {
			return nil, err
		}
	}
	if req.Status == "" {
		req.Status = "Active"
	}
	st := &domain.Staff{
		SchoolID:      req.SchoolID,
		Name:          req.Name,
		Email:         req.Email,
		Password:      hashed,
		Phone:         req.Phone,
		Position:      req.Position,
		Department:    req.Department,
		Qualification: req.Qualification,
		Address:       req.Address,
		DateOfBirth:   req.DateOfBirth,
		Gender:        req.Gender,
		JoinDate:      req.JoinDate,
		Status:        req.Status,
	}
	return s.repo.Create(ctx, st)
}

func (s *StaffService) Update(ctx context.Context, id string, updates map[string]interface{}) (*domain.Staff, error) {
	return s.repo.Update(ctx, id, updates)
}

func (s *StaffService) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}
