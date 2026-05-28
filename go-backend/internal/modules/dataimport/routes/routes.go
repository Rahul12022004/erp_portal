package routes

import (
	"github.com/gofiber/fiber/v2"

	"github.com/erp-portal/go-backend/internal/core/db"
	"github.com/erp-portal/go-backend/internal/core/middleware"
	"github.com/erp-portal/go-backend/internal/modules/dataimport/handlers"
)

func Register(app *fiber.App) {
	h    := handlers.New(db.Col("import_history"))
	auth := middleware.Authenticate

	di := app.Group("/api/data-import", auth)
	di.Post("/preview",          h.Preview)
	di.Post("/validate",         h.Validate)
	di.Post("/import",           h.Import)
	di.Get("/history/:schoolId", h.History)
	di.Post("/rollback/:batchId", h.Rollback)
	di.Post("/reimport/:batchId", h.Reimport)
}
