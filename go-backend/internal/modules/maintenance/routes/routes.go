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

	g := app.Group("/api/maintenance", auth)
	g.Get("",     h.List)
	g.Post("",    h.Create)
	g.Put("/:id", h.Update)
}
