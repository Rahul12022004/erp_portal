package routes

import (
	"github.com/gofiber/fiber/v2"

	"github.com/erp-portal/go-backend/internal/core/db"
	"github.com/erp-portal/go-backend/internal/core/middleware"
	"github.com/erp-portal/go-backend/internal/modules/inventory/handlers"
	"github.com/erp-portal/go-backend/internal/modules/inventory/repositories"
)

func Register(app *fiber.App) {
	repo := repositories.NewInventoryRepo(db.Col("inventoryitems"))
	h    := handlers.New(repo)
	auth := middleware.Authenticate

	app.Get("/api/inventory",        auth, h.List)
	app.Get("/api/inventory/:id",    auth, h.Get)
	app.Post("/api/inventory",       auth, h.Create)
	app.Put("/api/inventory/:id",    auth, h.Update)
	app.Delete("/api/inventory/:id", auth, h.Delete)
}
