package routes

import (
	"github.com/gofiber/fiber/v2"

	"github.com/erp-portal/go-backend/internal/core/db"
	"github.com/erp-portal/go-backend/internal/core/middleware"
	"github.com/erp-portal/go-backend/internal/modules/admissions/handlers"
	"github.com/erp-portal/go-backend/internal/modules/admissions/repositories"
)

func Register(app *fiber.App) {
	repo := repositories.NewInquiryRepo(db.Col("admissioninquiries"))
	h    := handlers.New(repo)
	auth := middleware.Authenticate

	app.Get("/api/admissions",        auth, h.List)
	app.Get("/api/admissions/:id",    auth, h.Get)
	app.Post("/api/admissions",       auth, h.Create)
	app.Put("/api/admissions/:id",    auth, h.Update)
	app.Delete("/api/admissions/:id", auth, h.Delete)
}
