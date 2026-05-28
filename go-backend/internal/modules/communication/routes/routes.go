package routes

import (
	"github.com/gofiber/fiber/v2"

	"github.com/erp-portal/go-backend/internal/core/db"
	"github.com/erp-portal/go-backend/internal/core/middleware"
	"github.com/erp-portal/go-backend/internal/modules/communication/handlers"
	"github.com/erp-portal/go-backend/internal/modules/communication/repositories"
)

func Register(app *fiber.App) {
	aRepo := repositories.NewAnnouncementRepo(db.Col("announcements"))
	cRepo := repositories.NewCampaignRepo(db.Col("campaigns"))
	h     := handlers.New(aRepo, cRepo)
	auth  := middleware.Authenticate

	ann := app.Group("/api/announcements", auth)
	ann.Get("",           h.ListAnnouncements)
	ann.Post("/ai-draft", h.AIDraftAnnouncement)
	ann.Post("",          h.CreateAnnouncement)
	ann.Delete("/:id",    h.DeleteAnnouncement)

	cam := app.Group("/api/campaigns", auth)
	cam.Get("",  h.ListCampaigns)
	cam.Post("", h.CreateCampaign)
}
