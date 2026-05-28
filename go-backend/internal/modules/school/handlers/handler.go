package handlers

import (
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/erp-portal/go-backend/internal/modules/school/dto"
	"github.com/erp-portal/go-backend/internal/modules/school/services"
	"github.com/erp-portal/go-backend/pkg/response"
	"github.com/erp-portal/go-backend/pkg/validate"
)

// SchoolHandler handles HTTP for the school module.
type SchoolHandler struct {
	svc *services.SchoolService
}

func New(svc *services.SchoolService) *SchoolHandler {
	return &SchoolHandler{svc: svc}
}

// toSession converts a School domain to the wire response shape.
func (h *SchoolHandler) toSession(s interface{}) interface{} { return s }

// GetByID  GET /api/schools/:id
func (h *SchoolHandler) GetByID(c *fiber.Ctx) error {
	school, err := h.svc.GetByID(c.Context(), c.Params("id"))
	if err != nil {
		return response.NotFound(c, err.Error())
	}
	return response.OK(c, toSessionResp(school))
}

// Register  POST /api/schools/register  (public — self-service signup)
func (h *SchoolHandler) Register(c *fiber.Ctx) error {
	var req dto.CreateSchoolReq
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "invalid request body")
	}
	if err := validate.Struct(req); err != nil {
		return response.BadRequest(c, err.Error())
	}
	plainPass := req.AdminPassword
	if plainPass == "" {
		plainPass = fmt.Sprintf("Pass%d!", time.Now().UnixMilli()%100000)
		req.AdminPassword = plainPass
	}
	school, err := h.svc.Create(c.Context(), req)
	if err != nil {
		return response.Conflict(c, err.Error())
	}
	return response.Created(c, fiber.Map{
		"school":        toSessionResp(school),
		"adminPassword": plainPass,
	})
}

// Create  POST /api/schools
func (h *SchoolHandler) Create(c *fiber.Ctx) error {
	var req dto.CreateSchoolReq
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "invalid request body")
	}
	if err := validate.Struct(req); err != nil {
		return response.BadRequest(c, err.Error())
	}
	school, err := h.svc.Create(c.Context(), req)
	if err != nil {
		return response.Conflict(c, err.Error())
	}
	return response.Created(c, toSessionResp(school))
}

// Update  PUT /api/schools/:id
func (h *SchoolHandler) Update(c *fiber.Ctx) error {
	var req dto.UpdateSchoolReq
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "invalid request body")
	}
	school, err := h.svc.Update(c.Context(), c.Params("id"), req)
	if err != nil {
		return response.NotFound(c, err.Error())
	}
	return response.OK(c, toSessionResp(school))
}

// List  GET /api/schools
func (h *SchoolHandler) List(c *fiber.Ctx) error {
	schools, total, err := h.svc.List(c.Context(), 0, 100)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, fiber.Map{"schools": schools, "total": total})
}

// Delete  DELETE /api/schools/:id
func (h *SchoolHandler) Delete(c *fiber.Ctx) error {
	if err := h.svc.Delete(c.Context(), c.Params("id")); err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.NoContent(c)
}

// UpdateLocation  PUT /api/schools/:id/location
func (h *SchoolHandler) UpdateLocation(c *fiber.Ctx) error {
	var body struct {
		Latitude     float64 `json:"latitude"`
		Longitude    float64 `json:"longitude"`
		RadiusMeters float64 `json:"radiusMeters"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	school, err := h.svc.UpdateLocation(c.Context(), c.Params("id"), body.Latitude, body.Longitude, body.RadiusMeters)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, toSessionResp(school))
}

// UpdateLocationLock  PATCH /api/schools/:id/location-lock
func (h *SchoolHandler) UpdateLocationLock(c *fiber.Ctx) error {
	var body struct {
		Locked bool `json:"locked"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	school, err := h.svc.UpdateLocationLock(c.Context(), c.Params("id"), body.Locked)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, toSessionResp(school))
}

func toSessionResp(s interface{}) interface{} {
	// Keep the domain struct — JSON tags are clean enough for the wire.
	return s
}
