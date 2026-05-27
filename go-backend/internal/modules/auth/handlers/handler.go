package handlers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"

	"github.com/erp-portal/go-backend/internal/modules/auth/dto"
	"github.com/erp-portal/go-backend/internal/modules/auth/services"
	"github.com/erp-portal/go-backend/pkg/response"
	"github.com/erp-portal/go-backend/pkg/validate"
)

// AuthHandler handles all auth HTTP endpoints.
type AuthHandler struct {
	svc *services.AuthService
}

func New(svc *services.AuthService) *AuthHandler {
	return &AuthHandler{svc: svc}
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
		return response.TooManyRequests(c, "too many failed login attempts, try later")
	}

	school, token, err := h.svc.SchoolLogin(c.Context(), ip, req.Email, req.Password)
	if err != nil {
		return response.Unauthorized(c, err.Error())
	}
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
		return response.Unauthorized(c, err.Error())
	}
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
		return response.Unauthorized(c, err.Error())
	}
	return response.OK(c, fiber.Map{
		"token": token,
		"user":  fiber.Map{"email": req.Email, "role": "super-admin"},
	})
}
