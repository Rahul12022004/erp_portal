package routes

import (
	"github.com/gofiber/fiber/v2"

	"github.com/erp-portal/go-backend/internal/core/db"
	"github.com/erp-portal/go-backend/internal/core/middleware"
	"github.com/erp-portal/go-backend/internal/shared/students/handlers"
	"github.com/erp-portal/go-backend/internal/shared/students/repositories"
	"github.com/erp-portal/go-backend/internal/shared/students/services"
)

func Register(app *fiber.App) {
	repo := repositories.New(db.Col("students"))
	svc  := services.New(repo)
	h    := handlers.New(svc)

	auth := middleware.Authenticate

	g := app.Group("/api/students", auth)
	g.Get("/:schoolId",   h.List)
	g.Get("/detail/:id",  h.GetByID)
	g.Post("",            h.Create)
	g.Put("/:id",         h.Update)
	g.Delete("/:id",      h.Delete)
}
