package handlers

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/erp-portal/go-backend/internal/modules/visitor/domain"
	"github.com/erp-portal/go-backend/internal/modules/visitor/repositories"
	"github.com/erp-portal/go-backend/pkg/response"
)

type Handler struct{ repo *repositories.VisitorRepo }

func New(r *repositories.VisitorRepo) *Handler { return &Handler{repo: r} }

func ctx10s() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), 10*time.Second)
}

func (h *Handler) List(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	list, err := h.repo.FindBySchool(ctx, c.Query("schoolId"))
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, list)
}

func (h *Handler) CheckIn(c *fiber.Ctx) error {
	var v domain.Visitor
	if err := c.BodyParser(&v); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	ctx, cancel := ctx10s()
	defer cancel()
	created, err := h.repo.CheckIn(ctx, &v)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.Created(c, created)
}

func (h *Handler) CheckOut(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	v, err := h.repo.CheckOut(ctx, c.Params("id"))
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, v)
}
