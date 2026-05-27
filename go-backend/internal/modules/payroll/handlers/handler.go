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

type Handler struct{ repo *repositories.PayrollRepo }

func New(r *repositories.PayrollRepo) *Handler { return &Handler{repo: r} }

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
