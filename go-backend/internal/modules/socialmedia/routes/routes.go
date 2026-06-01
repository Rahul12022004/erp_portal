package routes

import (
	"github.com/gofiber/fiber/v2"

	"github.com/erp-portal/go-backend/internal/core/db"
	"github.com/erp-portal/go-backend/internal/core/middleware"
	"github.com/erp-portal/go-backend/internal/modules/socialmedia/handlers"
	"github.com/erp-portal/go-backend/internal/modules/socialmedia/repositories"
)

func Register(app *fiber.App) {
	repo := repositories.New(db.Col("social_media"))
	h    := handlers.New(repo)
	auth := middleware.Authenticate

	app.Get("/api/social-media/:schoolId", auth, h.List)
	app.Post("/api/social-media",          auth, h.Create)
	app.Put("/api/social-media/:id",       auth, h.Update)
	app.Delete("/api/social-media/:id",    auth, h.Delete)
}
