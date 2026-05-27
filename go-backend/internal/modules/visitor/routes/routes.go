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

	g := app.Group("/api/visitors", auth)
	g.Get("",              h.List)
	g.Post("",             h.CheckIn)
	g.Patch("/:id/checkout", h.CheckOut)
}
