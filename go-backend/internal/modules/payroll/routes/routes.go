package routes

import (
	"github.com/gofiber/fiber/v2"

	"github.com/erp-portal/go-backend/internal/core/db"
	"github.com/erp-portal/go-backend/internal/core/middleware"
	"github.com/erp-portal/go-backend/internal/modules/payroll/handlers"
	"github.com/erp-portal/go-backend/internal/modules/payroll/repositories"
)

func Register(app *fiber.App) {
	repo := repositories.New(db.Col("payrollentries"))
	h    := handlers.New(repo)
	auth := middleware.Authenticate

	g := app.Group("/api/payroll", auth)
	g.Get("",              h.List)
	g.Post("",             h.Create)
	g.Put("/:id",          h.Update)
	g.Post("/:id/pay",     h.MarkPaid)
}
