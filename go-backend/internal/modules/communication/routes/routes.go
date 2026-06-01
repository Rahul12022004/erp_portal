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

	// literal /ai-draft before base POST
	app.Get("/api/announcements",           auth, h.ListAnnouncements)
	app.Post("/api/announcements/ai-draft", auth, h.AIDraftAnnouncement)
	app.Post("/api/announcements",          auth, h.CreateAnnouncement)
	app.Delete("/api/announcements/:id",    auth, h.DeleteAnnouncement)

	app.Get("/api/campaigns",  auth, h.ListCampaigns)
	app.Post("/api/campaigns", auth, h.CreateCampaign)
}
