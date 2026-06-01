package routes

import (
	"github.com/gofiber/fiber/v2"

	"github.com/erp-portal/go-backend/internal/core/db"
	"github.com/erp-portal/go-backend/internal/core/middleware"
	"github.com/erp-portal/go-backend/internal/modules/hostel/handlers"
	"github.com/erp-portal/go-backend/internal/modules/hostel/repositories"
)

func Register(app *fiber.App) {
	repo := repositories.NewHostelRepo(db.Col("hostels"))
	h    := handlers.New(repo)
	auth := middleware.Authenticate

	app.Get("/api/hostel",        auth, h.List)
	app.Get("/api/hostel/:id",    auth, h.Get)
	app.Post("/api/hostel",       auth, h.Create)
	app.Put("/api/hostel/:id",    auth, h.Update)
	app.Delete("/api/hostel/:id", auth, h.Delete)
}
