package handlers

import (
	"fmt"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/mongo"

	"github.com/erp-portal/go-backend/internal/modules/auth/dto"
	"github.com/erp-portal/go-backend/internal/modules/auth/services"
	"github.com/erp-portal/go-backend/pkg/auditlog"
	"github.com/erp-portal/go-backend/pkg/response"
	"github.com/erp-portal/go-backend/pkg/validate"
)

// AuthHandler handles all auth HTTP endpoints.
type AuthHandler struct {
	svc  *services.AuthService
	logs *mongo.Collection
}

func New(svc *services.AuthService, logsCol *mongo.Collection) *AuthHandler {
	return &AuthHandler{svc: svc, logs: logsCol}
}

// POST /api/auth/school/login
func (h *AuthHandler) SchoolLogin(c *fiber.Ctx) error {
	var req dto.SchoolLoginReq
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	if err := validate.Struct(req); err != nil {
		return response.BadRequest(c, err.Error())
	}

	ip := c.IP()
	if blocked, secs := h.svc.CheckThrottle(ip, req.Email); blocked {
		c.Set("Retry-After", strconv.Itoa(secs))
		auditlog.Write(h.logs, "login.blocked", fmt.Sprintf("School admin login blocked for %s from %s", req.Email, ip), req.Email)
		return response.TooManyRequests(c, "too many failed login attempts, try later")
	}

	school, token, err := h.svc.SchoolLogin(c.Context(), ip, req.Email, req.Password)
	if err != nil {
		auditlog.Write(h.logs, "login.failed", fmt.Sprintf("School admin login failed for %s from %s: %s", req.Email, ip, err.Error()), req.Email)
		return response.Unauthorized(c, err.Error())
	}
	auditlog.Write(h.logs, "login.success", fmt.Sprintf("School admin %s logged in from %s", req.Email, ip), req.Email)
	return response.OK(c, fiber.Map{
		"token":  token,
		"school": school,
	})
}

// POST /api/auth/staff/login
func (h *AuthHandler) StaffLogin(c *fiber.Ctx) error {
	var req dto.StaffLoginReq
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	if err := validate.Struct(req); err != nil {
		return response.BadRequest(c, err.Error())
	}

	ip := c.IP()
	result, err := h.svc.StaffLogin(c.Context(), ip, req.Email, req.Password)
	if err != nil {
		auditlog.Write(h.logs, "login.failed", fmt.Sprintf("Staff login failed for %s from %s", req.Email, ip), req.Email)
		return response.Unauthorized(c, err.Error())
	}
	auditlog.Write(h.logs, "login.success", fmt.Sprintf("Staff %s logged in from %s", req.Email, ip), req.Email)
	return response.OK(c, fiber.Map{
		"token":  result.Token,
		"staff":  result.Staff,
		"school": result.School,
	})
}

// POST /api/auth/super-admin/login
func (h *AuthHandler) SuperAdminLogin(c *fiber.Ctx) error {
	var req dto.SuperAdminLoginReq
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	if err := validate.Struct(req); err != nil {
		return response.BadRequest(c, err.Error())
	}

	token, err := h.svc.SuperAdminLogin(c.Context(), req.Email, req.Password)
	if err != nil {
		auditlog.Write(h.logs, "login.failed", fmt.Sprintf("Super admin login failed for %s from %s", req.Email, c.IP()), req.Email)
		return response.Unauthorized(c, err.Error())
	}
	auditlog.Write(h.logs, "login.success", fmt.Sprintf("Super admin %s logged in from %s", req.Email, c.IP()), req.Email)
	return response.OK(c, fiber.Map{
		"token": token,
		"user":  fiber.Map{"email": req.Email, "role": "super-admin"},
	})
}
