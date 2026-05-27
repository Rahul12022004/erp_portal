package handlers

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/erp-portal/go-backend/internal/modules/transport/domain"
	"github.com/erp-portal/go-backend/internal/modules/transport/repositories"
	"github.com/erp-portal/go-backend/pkg/response"
)

type Handler struct{ repo *repositories.TransportRepo }

func New(r *repositories.TransportRepo) *Handler { return &Handler{repo: r} }

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

func (h *Handler) Get(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	t, err := h.repo.FindByID(ctx, c.Params("id"))
	if err != nil || t == nil {
		return response.NotFound(c, "transport not found")
	}
	return response.OK(c, t)
}

func (h *Handler) Create(c *fiber.Ctx) error {
	var t domain.Transport
	if err := c.BodyParser(&t); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	ctx, cancel := ctx10s()
	defer cancel()
	created, err := h.repo.Create(ctx, &t)
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
	t, err := h.repo.Update(ctx, c.Params("id"), updates)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, t)
}

func (h *Handler) Delete(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	if err := h.repo.Delete(ctx, c.Params("id")); err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.NoContent(c)
}
