package routes

import (
	"github.com/gofiber/fiber/v2"

	"github.com/erp-portal/go-backend/internal/core/db"
	"github.com/erp-portal/go-backend/internal/core/middleware"
	"github.com/erp-portal/go-backend/internal/modules/notifications/handlers"
	"github.com/erp-portal/go-backend/internal/modules/notifications/repositories"
)

func Register(app *fiber.App) {
	repo := repositories.NewNotificationRepo(db.Col("notifications"))
	h    := handlers.New(repo)
	auth := middleware.Authenticate

	app.Get("/api/notifications",             auth, h.List)
	app.Patch("/api/notifications/:id/read", auth, h.MarkRead)
}
