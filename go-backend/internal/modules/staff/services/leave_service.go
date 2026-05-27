package services

import (
	"context"
	"fmt"

	"github.com/erp-portal/go-backend/internal/modules/staff/domain"
	"github.com/erp-portal/go-backend/internal/modules/staff/repositories"
)

type LeaveService struct {
	repo repositories.LeaveRepository
}

func NewLeaveService(repo repositories.LeaveRepository) *LeaveService {
	return &LeaveService{repo: repo}
}

func (s *LeaveService) ListBySchool(ctx context.Context, schoolID string) ([]*domain.LeaveApplication, error) {
	return s.repo.FindBySchool(ctx, schoolID)
}

func (s *LeaveService) ListByTeacher(ctx context.Context, schoolID, teacherID string) ([]*domain.LeaveApplication, error) {
	return s.repo.FindByTeacher(ctx, schoolID, teacherID)
}

type CreateLeaveReq struct {
	SchoolID    string `json:"schoolId"    validate:"required"`
	TeacherID   string `json:"teacherId"   validate:"required"`
	Title       string `json:"title"       validate:"required"`
	Description string `json:"description" validate:"required"`
	LeaveType   string `json:"leaveType"   validate:"required,oneof=Paid Unpaid Emergency"`
	FileName    string `json:"fileName"`
	FileData    string `json:"fileData"`
}

func (s *LeaveService) Create(ctx context.Context, req CreateLeaveReq) (*domain.LeaveApplication, error) {
	return s.repo.Create(ctx, &domain.LeaveApplication{
		SchoolID:    req.SchoolID,
		TeacherID:   req.TeacherID,
		Title:       req.Title,
		Description: req.Description,
		LeaveType:   req.LeaveType,
		FileName:    req.FileName,
		FileData:    req.FileData,
	})
}

func (s *LeaveService) UpdateStatus(ctx context.Context, id, status string) (*domain.LeaveApplication, error) {
	valid := map[string]bool{"Pending": true, "Approved": true, "Rejected": true}
	if !valid[status] {
		return nil, fmt.Errorf("invalid status: %s", status)
	}
	return s.repo.UpdateStatus(ctx, id, status)
}
