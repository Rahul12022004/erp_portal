package routes

import (
	"github.com/gofiber/fiber/v2"

	"github.com/erp-portal/go-backend/internal/core/db"
	"github.com/erp-portal/go-backend/internal/core/middleware"
	"github.com/erp-portal/go-backend/internal/modules/visitor/handlers"
	"github.com/erp-portal/go-backend/internal/modules/visitor/repositories"
)

func Register(app *fiber.App) {
	repo := repositories.NewVisitorRepo(db.Col("visitors"))
	h    := handlers.New(repo)
	auth := middleware.Authenticate

	app.Get("/api/visitors",              auth, h.List)
	app.Post("/api/visitors",             auth, h.CheckIn)
	app.Patch("/api/visitors/:id/checkout", auth, h.CheckOut)
}
