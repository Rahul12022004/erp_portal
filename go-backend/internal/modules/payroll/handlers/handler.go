package handlers

import (
	"context"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/erp-portal/go-backend/internal/modules/payroll/domain"
	"github.com/erp-portal/go-backend/internal/modules/payroll/repositories"
	"github.com/erp-portal/go-backend/pkg/response"
)

type Handler struct {
	repo      *repositories.PayrollRepo
	salaryRepo *repositories.SalaryStructureRepo
}

func New(r *repositories.PayrollRepo, sr *repositories.SalaryStructureRepo) *Handler {
	return &Handler{repo: r, salaryRepo: sr}
}

func ctx10s() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), 10*time.Second)
}

func (h *Handler) List(c *fiber.Ctx) error {
	month, _ := strconv.Atoi(c.Query("month"))
	year, _ := strconv.Atoi(c.Query("year"))
	ctx, cancel := ctx10s()
	defer cancel()
	list, err := h.repo.Find(ctx, c.Query("schoolId"), month, year, c.Query("status"))
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, list)
}

func (h *Handler) Create(c *fiber.Ctx) error {
	var e domain.PayrollEntry
	if err := c.BodyParser(&e); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	e.NetSalary = e.BasicSalary + e.Allowances - e.Deductions
	ctx, cancel := ctx10s()
	defer cancel()
	created, err := h.repo.Create(ctx, &e)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.Created(c, created)
}

func (h *Handler) MarkPaid(c *fiber.Ctx) error {
	now := time.Now()
	updates := map[string]interface{}{
		"status": "paid",
		"paidAt": now,
	}
	ctx, cancel := ctx10s()
	defer cancel()
	entry, err := h.repo.Update(ctx, c.Params("id"), updates)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, entry)
}

func (h *Handler) Update(c *fiber.Ctx) error {
	var updates map[string]interface{}
	if err := c.BodyParser(&updates); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	ctx, cancel := ctx10s()
	defer cancel()
	entry, err := h.repo.Update(ctx, c.Params("id"), updates)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, entry)
}

// ─── Salary Structures ────────────────────────────────────────────────────────

// GET /api/salary-structures/:schoolId
func (h *Handler) ListSalaryStructures(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	list, err := h.salaryRepo.FindBySchool(ctx, c.Params("schoolId"))
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	if list == nil {
		list = []*domain.SalaryStructure{}
	}
	return response.OK(c, list)
}

// POST /api/salary-structures/:schoolId
func (h *Handler) CreateSalaryStructure(c *fiber.Ctx) error {
	var s domain.SalaryStructure
	if err := c.BodyParser(&s); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	s.SchoolID = c.Params("schoolId")
	ctx, cancel := ctx10s()
	defer cancel()
	created, err := h.salaryRepo.Create(ctx, &s)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.Created(c, created)
}

// PUT /api/salary-structures/:schoolId/:id
func (h *Handler) UpdateSalaryStructure(c *fiber.Ctx) error {
	var s domain.SalaryStructure
	if err := c.BodyParser(&s); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	ctx, cancel := ctx10s()
	defer cancel()
	updated, err := h.salaryRepo.Update(ctx, c.Params("id"), &s)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, updated)
}

// DELETE /api/salary-structures/:schoolId/:id
func (h *Handler) DeleteSalaryStructure(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	if err := h.salaryRepo.Delete(ctx, c.Params("id")); err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.NoContent(c)
}
