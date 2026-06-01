package routes

import (
	"github.com/gofiber/fiber/v2"

	"github.com/erp-portal/go-backend/internal/core/db"
	"github.com/erp-portal/go-backend/internal/core/middleware"
	"github.com/erp-portal/go-backend/internal/modules/maintenance/handlers"
	"github.com/erp-portal/go-backend/internal/modules/maintenance/repositories"
)

func Register(app *fiber.App) {
	repo := repositories.NewMaintenanceRepo(db.Col("maintenancerequests"))
	h    := handlers.New(repo)
	auth := middleware.Authenticate

	app.Get("/api/maintenance",        auth, h.List)
	app.Post("/api/maintenance",       auth, h.Create)
	app.Put("/api/maintenance/:id",    auth, h.Update)
}
