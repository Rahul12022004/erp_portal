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

	g := app.Group("/api/inventory", auth)
	g.Get("",      h.List)
	g.Get("/:id",  h.Get)
	g.Post("",     h.Create)
	g.Put("/:id",  h.Update)
	g.Delete("/:id", h.Delete)
}
