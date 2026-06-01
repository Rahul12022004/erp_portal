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

	app.Get("/api/transport",        auth, h.List)
	app.Get("/api/transport/:id",    auth, h.Get)
	app.Post("/api/transport",       auth, h.Create)
	app.Put("/api/transport/:id",    auth, h.Update)
	app.Delete("/api/transport/:id", auth, h.Delete)
}
