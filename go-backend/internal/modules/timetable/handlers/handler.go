package handlers

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/erp-portal/go-backend/internal/modules/timetable/domain"
	"github.com/erp-portal/go-backend/internal/modules/timetable/repositories"
	"github.com/erp-portal/go-backend/pkg/response"
)

type Handler struct{ repo *repositories.TimetableRepo }

func New(r *repositories.TimetableRepo) *Handler { return &Handler{repo: r} }

func ctx10s() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), 10*time.Second)
}

func (h *Handler) ListSlots(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	list, err := h.repo.FindSlots(ctx, c.Query("schoolId"))
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, list)
}

func (h *Handler) CreateSlot(c *fiber.Ctx) error {
	var s domain.TimeSlot
	if err := c.BodyParser(&s); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	ctx, cancel := ctx10s()
	defer cancel()
	created, err := h.repo.CreateSlot(ctx, &s)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.Created(c, created)
}

func (h *Handler) ListPeriods(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	list, err := h.repo.FindPeriods(ctx, c.Query("schoolId"), c.Query("classId"), c.Query("day"))
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, list)
}

func (h *Handler) UpsertPeriod(c *fiber.Ctx) error {
	var p domain.Period
	if err := c.BodyParser(&p); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	ctx, cancel := ctx10s()
	defer cancel()
	saved, err := h.repo.UpsertPeriod(ctx, &p)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, saved)
}

func (h *Handler) DeletePeriod(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	if err := h.repo.DeletePeriod(ctx, c.Params("id")); err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, nil)
}
