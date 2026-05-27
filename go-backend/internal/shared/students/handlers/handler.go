package handlers

import (
	"strconv"

	"github.com/gofiber/fiber/v2"

	"github.com/erp-portal/go-backend/internal/shared/students/domain"
	"github.com/erp-portal/go-backend/internal/shared/students/repositories"
	"github.com/erp-portal/go-backend/internal/shared/students/services"
	"github.com/erp-portal/go-backend/pkg/response"
)

type Handler struct{ svc *services.StudentService }

func New(svc *services.StudentService) *Handler { return &Handler{svc: svc} }

// GET /api/students/:schoolId
func (h *Handler) List(c *fiber.Ctx) error {
	limit, _ := strconv.ParseInt(c.Query("limit", "50"), 10, 64)
	page, _ := strconv.ParseInt(c.Query("page", "1"), 10, 64)
	if page < 1 {
		page = 1
	}
	skip := (page - 1) * limit

	f := repositories.StudentFilter{
		SchoolID:     c.Params("schoolId"),
		ClassID:      c.Query("classId"),
		AcademicYear: c.Query("academicYear"),
		Status:       c.Query("status"),
		Search:       c.Query("search"),
		Skip:         skip,
		Limit:        limit,
	}
	list, total, err := h.svc.List(c.Context(), f)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, fiber.Map{"students": list, "total": total, "page": page, "limit": limit})
}

// GET /api/students/detail/:id
func (h *Handler) GetByID(c *fiber.Ctx) error {
	s, err := h.svc.GetByID(c.Context(), c.Params("id"))
	if err != nil {
		return response.NotFound(c, err.Error())
	}
	return response.OK(c, s)
}

// POST /api/students
func (h *Handler) Create(c *fiber.Ctx) error {
	var s domain.Student
	if err := c.BodyParser(&s); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	created, err := h.svc.Create(c.Context(), &s)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.Created(c, created)
}

// PUT /api/students/:id
func (h *Handler) Update(c *fiber.Ctx) error {
	var updates map[string]interface{}
	if err := c.BodyParser(&updates); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	s, err := h.svc.Update(c.Context(), c.Params("id"), updates)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, s)
}

// DELETE /api/students/:id
func (h *Handler) Delete(c *fiber.Ctx) error {
	if err := h.svc.Delete(c.Context(), c.Params("id")); err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.NoContent(c)
}
