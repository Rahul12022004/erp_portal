package routes

import (
	"github.com/gofiber/fiber/v2"

	"github.com/erp-portal/go-backend/internal/core/db"
	"github.com/erp-portal/go-backend/internal/core/middleware"
	"github.com/erp-portal/go-backend/internal/modules/survey/handlers"
	"github.com/erp-portal/go-backend/internal/modules/survey/repositories"
)

func Register(app *fiber.App) {
	repo := repositories.NewSurveyRepo(db.Col("surveys"))
	h    := handlers.New(repo)
	auth := middleware.Authenticate

	app.Get("/api/surveys",        auth, h.List)
	app.Post("/api/surveys",       auth, h.Create)
	app.Delete("/api/surveys/:id", auth, h.Delete)
}
