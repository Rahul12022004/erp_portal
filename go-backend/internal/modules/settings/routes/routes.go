package routes

import (
	"github.com/gofiber/fiber/v2"

	"github.com/erp-portal/go-backend/internal/core/db"
	"github.com/erp-portal/go-backend/internal/core/middleware"
	"github.com/erp-portal/go-backend/internal/modules/settings/handlers"
	"github.com/erp-portal/go-backend/internal/modules/settings/repositories"
)

func Register(app *fiber.App) {
	repo := repositories.New(db.Col("schoolsettings"))
	h    := handlers.New(repo)
	auth := middleware.Authenticate

	g := app.Group("/api/settings", auth)
	g.Get("",  h.Get)
	g.Put("",  h.Upsert)
}
