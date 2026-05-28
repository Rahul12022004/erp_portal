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

	sm := app.Group("/api/social-media", auth)
	sm.Get("/:schoolId", h.List)
	sm.Post("",          h.Create)
	sm.Put("/:id",       h.Update)
	sm.Delete("/:id",    h.Delete)
}
