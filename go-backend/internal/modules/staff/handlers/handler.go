package handlers

import (
	"github.com/gofiber/fiber/v2"

	"github.com/erp-portal/go-backend/internal/modules/staff/services"
	"github.com/erp-portal/go-backend/pkg/response"
	"github.com/erp-portal/go-backend/pkg/validate"
)

type Handler struct {
	staffSvc *services.StaffService
	leaveSvc *services.LeaveService
}

func New(ss *services.StaffService, ls *services.LeaveService) *Handler {
	return &Handler{staffSvc: ss, leaveSvc: ls}
}

// GET /api/staff/:schoolId
func (h *Handler) ListBySchool(c *fiber.Ctx) error {
	list, err := h.staffSvc.ListBySchool(c.Context(), c.Params("schoolId"))
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, list)
}

// GET /api/staff/member/:id
func (h *Handler) GetByID(c *fiber.Ctx) error {
	s, err := h.staffSvc.GetByID(c.Context(), c.Params("id"))
	if err != nil {
		return response.NotFound(c, err.Error())
	}
	return response.OK(c, s)
}

// POST /api/staff
func (h *Handler) Create(c *fiber.Ctx) error {
	var req services.CreateStaffReq
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	if err := validate.Struct(req); err != nil {
		return response.BadRequest(c, err.Error())
	}
	s, err := h.staffSvc.Create(c.Context(), req)
	if err != nil {
		return response.Conflict(c, err.Error())
	}
	return response.Created(c, s)
}

// PUT /api/staff/:id
func (h *Handler) Update(c *fiber.Ctx) error {
	var updates map[string]interface{}
	if err := c.BodyParser(&updates); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	delete(updates, "password")
	s, err := h.staffSvc.Update(c.Context(), c.Params("id"), updates)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, s)
}

// DELETE /api/staff/:id
func (h *Handler) Delete(c *fiber.Ctx) error {
	if err := h.staffSvc.Delete(c.Context(), c.Params("id")); err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.NoContent(c)
}

// GET /api/leaves/school/:schoolId
func (h *Handler) ListLeavesBySchool(c *fiber.Ctx) error {
	list, err := h.leaveSvc.ListBySchool(c.Context(), c.Params("schoolId"))
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, list)
}

// GET /api/leaves/:schoolId/:teacherId
func (h *Handler) ListLeavesByTeacher(c *fiber.Ctx) error {
	list, err := h.leaveSvc.ListByTeacher(c.Context(), c.Params("schoolId"), c.Params("teacherId"))
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, list)
}

// POST /api/leaves
func (h *Handler) CreateLeave(c *fiber.Ctx) error {
	var req services.CreateLeaveReq
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	if err := validate.Struct(req); err != nil {
		return response.BadRequest(c, err.Error())
	}
	leave, err := h.leaveSvc.Create(c.Context(), req)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.Created(c, leave)
}

// PATCH /api/leaves/:id/status
func (h *Handler) UpdateLeaveStatus(c *fiber.Ctx) error {
	var body struct {
		Status string `json:"status"`
	}
	if err := c.BodyParser(&body); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	leave, err := h.leaveSvc.UpdateStatus(c.Context(), c.Params("id"), body.Status)
	if err != nil {
		return response.BadRequest(c, err.Error())
	}
	return response.OK(c, fiber.Map{"success": true, "data": leave})
}
