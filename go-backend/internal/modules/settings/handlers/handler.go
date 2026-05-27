package handlers

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/erp-portal/go-backend/internal/modules/settings/domain"
	"github.com/erp-portal/go-backend/internal/modules/settings/repositories"
	"github.com/erp-portal/go-backend/pkg/response"
)

type Handler struct{ repo *repositories.SettingsRepo }

func New(r *repositories.SettingsRepo) *Handler { return &Handler{repo: r} }

func ctx10s() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), 10*time.Second)
}

func (h *Handler) Get(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	s, err := h.repo.FindBySchool(ctx, c.Query("schoolId"))
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	if s == nil {
		return response.OK(c, &domain.Settings{})
	}
	return response.OK(c, s)
}

func (h *Handler) Upsert(c *fiber.Ctx) error {
	var s domain.Settings
	if err := c.BodyParser(&s); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	ctx, cancel := ctx10s()
	defer cancel()
	saved, err := h.repo.Upsert(ctx, &s)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, saved)
}
