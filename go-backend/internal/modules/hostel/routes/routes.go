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

	g := app.Group("/api/hostel", auth)
	g.Get("",      h.List)
	g.Get("/:id",  h.Get)
	g.Post("",     h.Create)
	g.Put("/:id",  h.Update)
	g.Delete("/:id", h.Delete)
}
