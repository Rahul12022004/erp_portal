package routes

import (
	"github.com/gofiber/fiber/v2"

	"github.com/erp-portal/go-backend/internal/core/db"
	"github.com/erp-portal/go-backend/internal/core/middleware"
	"github.com/erp-portal/go-backend/internal/modules/transport/handlers"
	"github.com/erp-portal/go-backend/internal/modules/transport/repositories"
)

func Register(app *fiber.App) {
	repo := repositories.NewTransportRepo(db.Col("transports"))
	h    := handlers.New(repo)
	auth := middleware.Authenticate

	g := app.Group("/api/transport", auth)
	g.Get("",      h.List)
	g.Get("/:id",  h.Get)
	g.Post("",     h.Create)
	g.Put("/:id",  h.Update)
	g.Delete("/:id", h.Delete)
}
