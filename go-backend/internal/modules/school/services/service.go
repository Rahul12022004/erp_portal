package services

import (
	"context"
	"fmt"
	"time"

	"github.com/erp-portal/go-backend/internal/modules/school/domain"
	"github.com/erp-portal/go-backend/internal/modules/school/dto"
	"github.com/erp-portal/go-backend/internal/modules/school/repositories"
	"github.com/erp-portal/go-backend/pkg/password"
)

// SchoolService encapsulates school business logic.
type SchoolService struct {
	repo repositories.SchoolRepository
}

func New(repo repositories.SchoolRepository) *SchoolService {
	return &SchoolService{repo: repo}
}

// GetByID returns a school by its ID.
func (s *SchoolService) GetByID(ctx context.Context, id string) (*domain.School, error) {
	school, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if school == nil {
		return nil, fmt.Errorf("school not found")
	}
	s.syncModulesIfStale(ctx, school)
	return school, nil
}

// Create registers a new school from the request DTO.
func (s *SchoolService) Create(ctx context.Context, req dto.CreateSchoolReq) (*domain.School, error) {
	// Check email uniqueness
	existing, _ := s.repo.FindByEmail(ctx, req.AdminEmail)
	if existing != nil {
		return nil, fmt.Errorf("email already registered")
	}

	plan := req.SubscriptionPlan
	if plan == "" {
		plan = "Basic"
	}

	adminPass := req.AdminPassword
	if adminPass == "" {
		adminPass = generatePassword()
	}
	hashed, err := password.Hash(adminPass)
	if err != nil {
		return nil, err
	}

	modules := req.Modules
	if len(modules) == 0 {
		modules = modulesByPlan(plan)
	}

	school := &domain.School{
		SchoolInfo: domain.SchoolInfo{
			Name:    req.SchoolName,
			Email:   req.SchoolEmail,
			Phone:   req.SchoolPhone,
			Website: req.SchoolWebsite,
			Address: req.SchoolAddress,
		},
		AdminInfo: domain.AdminInfo{
			Name:     req.AdminName,
			Email:    req.AdminEmail,
			Password: hashed,
			Phone:    req.AdminPhone,
			Status:   "Active",
		},
		SystemInfo: domain.SystemInfo{
			SchoolType:          req.SchoolType,
			SubscriptionPlan:    plan,
			SubscriptionEndDate: endDate(plan),
			MaxStudents:         req.MaxStudents,
		},
		Modules: modules,
	}

	return s.repo.Create(ctx, school)
}

// Update applies partial updates to a school profile.
func (s *SchoolService) Update(ctx context.Context, id string, req dto.UpdateSchoolReq) (*domain.School, error) {
	updates := map[string]interface{}{}
	if req.SchoolName != "" {
		updates["schoolInfo.name"] = req.SchoolName
	}
	if req.SchoolEmail != "" {
		updates["schoolInfo.email"] = req.SchoolEmail
	}
	if req.SchoolPhone != "" {
		updates["schoolInfo.phone"] = req.SchoolPhone
	}
	if req.SchoolAddress != "" {
		updates["schoolInfo.address"] = req.SchoolAddress
	}
	if req.SchoolWebsite != "" {
		updates["schoolInfo.website"] = req.SchoolWebsite
	}
	if req.Logo != "" {
		updates["schoolInfo.logo"] = req.Logo
	}
	if req.AdminName != "" {
		updates["adminInfo.name"] = req.AdminName
	}
	if req.AdminPhone != "" {
		updates["adminInfo.phone"] = req.AdminPhone
	}
	if req.AdminImage != "" {
		updates["adminInfo.image"] = req.AdminImage
	}
	return s.repo.Update(ctx, id, updates)
}

// UpdateLocation saves geofence coordinates for a school.
func (s *SchoolService) UpdateLocation(ctx context.Context, id string, lat, lng, radiusMeters float64) (*domain.School, error) {
	return s.repo.Update(ctx, id, map[string]interface{}{
		"schoolInfo.location.latitude":    lat,
		"schoolInfo.location.longitude":   lng,
		"schoolInfo.location.radiusMeters": radiusMeters,
	})
}

// UpdateLocationLock sets the geofence locked flag.
func (s *SchoolService) UpdateLocationLock(ctx context.Context, id string, locked bool) (*domain.School, error) {
	return s.repo.Update(ctx, id, map[string]interface{}{
		"schoolInfo.location.locked": locked,
	})
}

// ToggleStatus flips adminInfo.status between Active and Disabled.
func (s *SchoolService) ToggleStatus(ctx context.Context, id string) (*domain.School, error) {
	school, err := s.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	newStatus := "Disabled"
	if school.AdminInfo.Status == "Disabled" || school.AdminInfo.Status == "Inactive" {
		newStatus = "Active"
	}
	return s.repo.Update(ctx, id, map[string]interface{}{
		"adminInfo.status": newStatus,
	})
}

// UpgradeSubscription changes the subscription plan and resets end date.
func (s *SchoolService) UpgradeSubscription(ctx context.Context, id, plan string) (*domain.School, error) {
	updates := map[string]interface{}{
		"systemInfo.subscriptionPlan":    plan,
		"systemInfo.subscriptionEndDate": endDate(plan),
		"modules":                        modulesByPlan(plan),
	}
	return s.repo.Update(ctx, id, updates)
}

// RenewSubscription extends the subscription end date by 1 year from today (or from existing end date if future).
func (s *SchoolService) RenewSubscription(ctx context.Context, id, plan string) (*domain.School, error) {
	school, err := s.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	base := time.Now()
	if school.SystemInfo.SubscriptionEndDate != "" {
		if t, err2 := time.Parse("2006-01-02", school.SystemInfo.SubscriptionEndDate); err2 == nil && t.After(base) {
			base = t
		}
	}
	updates := map[string]interface{}{
		"systemInfo.subscriptionEndDate": base.AddDate(1, 0, 0).Format("2006-01-02"),
	}
	if plan != "" && plan != school.SystemInfo.SubscriptionPlan {
		updates["systemInfo.subscriptionPlan"] = plan
		updates["modules"] = modulesByPlan(plan)
	}
	return s.repo.Update(ctx, id, updates)
}

// List returns paginated schools with modules auto-synced to their plan.
func (s *SchoolService) List(ctx context.Context, skip, limit int64) ([]*domain.School, int64, error) {
	schools, total, err := s.repo.List(ctx, skip, limit)
	if err != nil {
		return nil, 0, err
	}
	for _, school := range schools {
		s.syncModulesIfStale(ctx, school)
	}
	return schools, total, nil
}

// syncModulesIfStale updates school.Modules to match its plan if stale, writing to DB async.
func (s *SchoolService) syncModulesIfStale(_ context.Context, school *domain.School) {
	expected := modulesByPlan(school.SystemInfo.SubscriptionPlan)
	if len(expected) == 0 || len(school.Modules) == len(expected) {
		return
	}
	school.Modules = expected
	go func() {
		bg := context.Background()
		_, _ = s.repo.Update(bg, school.ID, map[string]interface{}{"modules": expected})
	}()
}

// Delete removes a school.
func (s *SchoolService) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

// --- helpers ---

func modulesByPlan(plan string) []string {
	switch plan {
	case "Standard":
		return []string{"Student Management", "Staff Management", "Attendance",
			"Marks & Results", "Announcements", "Leave Management", "Class Management", "Finance & Fees"}
	case "Premium":
		return []string{
			"Student Management", "Staff Management", "Attendance",
			"Marks & Results", "Announcements", "Leave Management", "Class Management", "Finance & Fees",
			"Hostel", "Transport", "Library", "Inventory", "Survey", "Social Media",
			"Academics", "Time Table", "Admissions", "HR", "Payroll",
			"Visitor", "Data Import", "Sports", "House",
			"Notifications", "Reports", "Maintenance", "Support",
		}
	default: // Basic
		return []string{"Student Management", "Attendance", "Marks & Results", "Announcements"}
	}
}

func endDate(plan string) string {
	now := time.Now()
	switch plan {
	case "Standard":
		return now.AddDate(0, 6, 0).Format("2006-01-02")
	case "Premium":
		return now.AddDate(1, 0, 0).Format("2006-01-02")
	}
	return ""
}

func generatePassword() string {
	return fmt.Sprintf("Pass%d!", time.Now().UnixMilli()%100000)
}
