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

	app.Get("/api/students/detail/:id", auth, h.GetByID) // literal before param
	app.Get("/api/students/:schoolId",  auth, h.List)
	app.Post("/api/students",           auth, h.Create)
	app.Put("/api/students/:id",        auth, h.Update)
	app.Delete("/api/students/:id",     auth, h.Delete)
}
