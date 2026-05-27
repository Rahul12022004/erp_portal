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

	g := app.Group("/api/surveys", auth)
	g.Get("",      h.List)
	g.Post("",     h.Create)
	g.Delete("/:id", h.Delete)
}
