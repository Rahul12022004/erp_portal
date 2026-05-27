package handlers

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/erp-portal/go-backend/internal/modules/survey/domain"
	"github.com/erp-portal/go-backend/internal/modules/survey/repositories"
	"github.com/erp-portal/go-backend/pkg/response"
)

type Handler struct{ repo *repositories.SurveyRepo }

func New(r *repositories.SurveyRepo) *Handler { return &Handler{repo: r} }

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

func (h *Handler) Create(c *fiber.Ctx) error {
	var s domain.Survey
	if err := c.BodyParser(&s); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	ctx, cancel := ctx10s()
	defer cancel()
	created, err := h.repo.Create(ctx, &s)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.Created(c, created)
}

func (h *Handler) Delete(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	if err := h.repo.Delete(ctx, c.Params("id")); err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.NoContent(c)
}
