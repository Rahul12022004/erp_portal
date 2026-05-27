package handlers

import (
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

func toSessionResp(s interface{}) interface{} {
	// Keep the domain struct — JSON tags are clean enough for the wire.
	return s
}
