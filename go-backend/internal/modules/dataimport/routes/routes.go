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

	app.Post("/api/data-import/preview",          auth, h.Preview)
	app.Post("/api/data-import/validate",         auth, h.Validate)
	app.Post("/api/data-import/import",           auth, h.Import)
	app.Get("/api/data-import/history/:schoolId", auth, h.History)
	app.Post("/api/data-import/rollback/:batchId", auth, h.Rollback)
	app.Post("/api/data-import/reimport/:batchId", auth, h.Reimport)
}
