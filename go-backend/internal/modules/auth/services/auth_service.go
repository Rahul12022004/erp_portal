package services

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/erp-portal/go-backend/internal/core/config"
	"github.com/erp-portal/go-backend/internal/modules/school/domain"
	schoolRepo "github.com/erp-portal/go-backend/internal/modules/school/repositories"
	"github.com/erp-portal/go-backend/pkg/jwtutil"
	"github.com/erp-portal/go-backend/pkg/password"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// AuthService handles login logic for all three actor types.
type AuthService struct {
	schoolRepo schoolRepo.SchoolRepository
	staffCol   *mongo.Collection
}

func New(sr schoolRepo.SchoolRepository, staffCol *mongo.Collection) *AuthService {
	return &AuthService{schoolRepo: sr, staffCol: staffCol}
}

// --- throttle store (in-process, resets on restart) ---
type throttleEntry struct {
	count     int
	blockedAt time.Time
}

var (
	throttleMu    sync.Mutex
	throttleStore = map[string]*throttleEntry{}
)

const maxAttempts = 10
const blockDuration = 15 * time.Minute

func throttleKey(ip, email string) string { return ip + "|" + email }

func checkThrottle(ip, email string) (blocked bool, retryAfter int) {
	throttleMu.Lock()
	defer throttleMu.Unlock()
	k := throttleKey(ip, email)
	e, ok := throttleStore[k]
	if !ok {
		return false, 0
	}
	if e.count >= maxAttempts {
		remaining := time.Until(e.blockedAt.Add(blockDuration))
		if remaining > 0 {
			return true, int(remaining.Seconds())
		}
		delete(throttleStore, k)
	}
	return false, 0
}

func recordFailure(ip, email string) {
	throttleMu.Lock()
	defer throttleMu.Unlock()
	k := throttleKey(ip, email)
	e, ok := throttleStore[k]
	if !ok {
		e = &throttleEntry{}
		throttleStore[k] = e
	}
	e.count++
	if e.count >= maxAttempts {
		e.blockedAt = time.Now()
	}
}

func clearThrottle(ip, email string) {
	throttleMu.Lock()
	defer throttleMu.Unlock()
	delete(throttleStore, throttleKey(ip, email))
}

// --- token helper ---
func issueToken(userID, email, role, schoolID string) (string, error) {
	return jwtutil.Issue(config.C.JWTSecret, userID, email, role, schoolID, config.C.JWTExpires)
}

// SchoolLogin authenticates a school admin.
func (s *AuthService) SchoolLogin(ctx context.Context, ip, email, pass string) (*domain.School, string, error) {
	if blocked, _ := checkThrottle(ip, email); blocked {
		return nil, "", fmt.Errorf("too many attempts")
	}

	school, err := s.schoolRepo.FindByEmail(ctx, email)
	if err != nil || school == nil {
		recordFailure(ip, email)
		return nil, "", fmt.Errorf("admin not found")
	}
	if school.AdminInfo.Status == "Disabled" {
		return nil, "", fmt.Errorf("account disabled")
	}
	if !password.Compare(school.AdminInfo.Password, pass) {
		recordFailure(ip, email)
		return nil, "", fmt.Errorf("invalid credentials")
	}
	clearThrottle(ip, email)
	token, err := issueToken(school.ID, school.AdminInfo.Email, "school-admin", school.ID)
	if err != nil {
		return nil, "", err
	}
	school.AdminInfo.Password = "" // scrub before returning
	return school, token, nil
}

// StaffLoginResult carries the teacher data + school reference.
type StaffLoginResult struct {
	Staff  bson.M
	School *domain.School
	Token  string
}

// StaffLogin authenticates a teacher/staff member.
func (s *AuthService) StaffLogin(ctx context.Context, ip, email, pass string) (*StaffLoginResult, error) {
	if blocked, _ := checkThrottle(ip, email); blocked {
		return nil, fmt.Errorf("too many attempts")
	}

	// Query staff collection directly (staff has its own password field)
	var staffDoc bson.M
	err := s.staffCol.FindOne(ctx, bson.M{
		"email":    email,
		"position": bson.M{"$regex": "^Teacher$", "$options": "i"},
		"status":   "Active",
	}).Decode(&staffDoc)
	if err == mongo.ErrNoDocuments {
		recordFailure(ip, email)
		return nil, fmt.Errorf("teacher not found")
	}
	if err != nil {
		return nil, err
	}

	storedHash, _ := staffDoc["password"].(string)
	if !password.Compare(storedHash, pass) {
		recordFailure(ip, email)
		return nil, fmt.Errorf("invalid credentials")
	}
	clearThrottle(ip, email)

	// Load school data
	schoolIDRaw, _ := staffDoc["schoolId"].(primitive.ObjectID)
	school, _ := s.schoolRepo.FindByID(ctx, schoolIDRaw.Hex())

	staffID := staffDoc["_id"].(primitive.ObjectID).Hex()
	schoolID := schoolIDRaw.Hex()

	token, err := issueToken(staffID, email, "teacher", schoolID)
	if err != nil {
		return nil, err
	}

	// Scrub password
	delete(staffDoc, "password")

	return &StaffLoginResult{Staff: staffDoc, School: school, Token: token}, nil
}

// SuperAdminLogin validates against env-configured super-admin credentials.
func (s *AuthService) SuperAdminLogin(_ context.Context, email, pass string) (string, error) {
	cfg := config.C
	if cfg.SuperAdminEmail == "" {
		return "", fmt.Errorf("super admin not configured")
	}
	if email != cfg.SuperAdminEmail || pass != cfg.SuperAdminPassword {
		return "", fmt.Errorf("invalid credentials")
	}
	return issueToken("super-admin", email, "super-admin", "")
}

// CheckThrottle is the exported wrapper used by the handler.
func (s *AuthService) CheckThrottle(ip, email string) (bool, int) {
	return checkThrottle(ip, email)
}
