package handlers

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/erp-portal/go-backend/internal/modules/communication/domain"
	"github.com/erp-portal/go-backend/internal/modules/communication/repositories"
	"github.com/erp-portal/go-backend/pkg/response"
)

type Handler struct {
	announcements *repositories.AnnouncementRepo
	campaigns     *repositories.CampaignRepo
}

func New(a *repositories.AnnouncementRepo, c *repositories.CampaignRepo) *Handler {
	return &Handler{announcements: a, campaigns: c}
}

func ctx10s() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), 10*time.Second)
}

// GET /api/announcements?schoolId=
func (h *Handler) ListAnnouncements(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	list, err := h.announcements.FindBySchool(ctx, c.Query("schoolId"))
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, list)
}

// POST /api/announcements
func (h *Handler) CreateAnnouncement(c *fiber.Ctx) error {
	var a domain.Announcement
	if err := c.BodyParser(&a); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	ctx, cancel := ctx10s()
	defer cancel()
	created, err := h.announcements.Create(ctx, &a)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.Created(c, created)
}

// DELETE /api/announcements/:id
func (h *Handler) DeleteAnnouncement(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	if err := h.announcements.Delete(ctx, c.Params("id")); err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.NoContent(c)
}

// POST /api/announcements/ai-draft
func (h *Handler) AIDraftAnnouncement(c *fiber.Ctx) error {
	return response.OK(c, fiber.Map{"draft": ""})
}

// GET /api/campaigns?schoolId=
func (h *Handler) ListCampaigns(c *fiber.Ctx) error {
	ctx, cancel := ctx10s()
	defer cancel()
	list, err := h.campaigns.FindBySchool(ctx, c.Query("schoolId"))
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.OK(c, list)
}

// POST /api/campaigns
func (h *Handler) CreateCampaign(c *fiber.Ctx) error {
	var camp domain.Campaign
	if err := c.BodyParser(&camp); err != nil {
		return response.BadRequest(c, "invalid body")
	}
	if camp.Status == "" {
		camp.Status = "draft"
	}
	ctx, cancel := ctx10s()
	defer cancel()
	created, err := h.campaigns.Create(ctx, &camp)
	if err != nil {
		return response.InternalError(c, err.Error())
	}
	return response.Created(c, created)
}
