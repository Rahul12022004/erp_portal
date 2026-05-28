package handlers

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/erp-portal/go-backend/internal/modules/socialmedia/domain"
	"github.com/erp-portal/go-backend/internal/modules/socialmedia/repositories"
	"github.com/erp-portal/go-backend/pkg/response"
)

type Handler struct{ repo *repositories.SocialMediaRepo }

func New(r *repositories.SocialMediaRepo) *Handler { return &Handler{repo: r} }

func ctx10s() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), 10*time.Second)
}

// GET /api/social-media/:schoolId
func (h *Handler) List(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	list, err := h.repo.FindBySchool(ctx, c.Params("schoolId"))
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, list)
}

// POST /api/social-media
func (h *Handler) Create(c *fiber.Ctx) error {
	var a domain.SocialMediaAccount
	if err := c.BodyParser(&a); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	ctx, cancel := ctx10s()
	defer cancel()
	created, err := h.repo.Create(ctx, &a)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.Created(c, created)
}

// PUT /api/social-media/:id
func (h *Handler) Update(c *fiber.Ctx) error {
	var a domain.SocialMediaAccount
	if err := c.BodyParser(&a); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	ctx, cancel := ctx10s()
	defer cancel()
	updated, err := h.repo.Update(ctx, c.Params("id"), &a)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, updated)
}

// DELETE /api/social-media/:id
func (h *Handler) Delete(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	if err := h.repo.Delete(ctx, c.Params("id")); err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.NoContent(c)
}
