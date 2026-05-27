package handlers

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/erp-portal/go-backend/internal/modules/maintenance/domain"
	"github.com/erp-portal/go-backend/internal/modules/maintenance/repositories"
	"github.com/erp-portal/go-backend/pkg/response"
)

type Handler struct{ repo *repositories.MaintenanceRepo }

func New(r *repositories.MaintenanceRepo) *Handler { return &Handler{repo: r} }

func ctx10s() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), 10*time.Second)
}

func (h *Handler) List(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	list, err := h.repo.FindBySchool(ctx, c.Query("schoolId"), c.Query("status"))
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, list)
}

func (h *Handler) Create(c *fiber.Ctx) error {
	var m domain.MaintenanceRequest
	if err := c.BodyParser(&m); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	ctx, cancel := ctx10s()
	defer cancel()
	created, err := h.repo.Create(ctx, &m)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.Created(c, created)
}

func (h *Handler) Update(c *fiber.Ctx) error {
	var updates map[string]interface{}
	if err := c.BodyParser(&updates); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	ctx, cancel := ctx10s()
	defer cancel()
	item, err := h.repo.Update(ctx, c.Params("id"), updates)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, item)
}
