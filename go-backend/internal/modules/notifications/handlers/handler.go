package handlers

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/erp-portal/go-backend/internal/core/middleware"
	"github.com/erp-portal/go-backend/internal/modules/notifications/repositories"
	"github.com/erp-portal/go-backend/pkg/response"
)

type Handler struct{ repo *repositories.NotificationRepo }

func New(r *repositories.NotificationRepo) *Handler { return &Handler{repo: r} }

func ctx10s() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), 10*time.Second)
}

// GET /api/notifications — returns notifications for authenticated user
func (h *Handler) List(c *fiber.Ctx) error {
	claims := middleware.GetClaims(c)
	ctx, cancel := ctx10s()
	defer cancel()
	list, err := h.repo.FindByUser(ctx, claims.UserID)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, list)
}

// PATCH /api/notifications/:id/read
func (h *Handler) MarkRead(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	if err := h.repo.MarkRead(ctx, c.Params("id")); err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, fiber.Map{"message": "marked as read"})
}
