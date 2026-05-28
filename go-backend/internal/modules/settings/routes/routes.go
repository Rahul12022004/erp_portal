package routes

import (
	"github.com/gofiber/fiber/v2"

	"github.com/erp-portal/go-backend/internal/core/db"
	"github.com/erp-portal/go-backend/internal/core/middleware"
	"github.com/erp-portal/go-backend/internal/modules/settings/handlers"
	"github.com/erp-portal/go-backend/internal/modules/settings/repositories"
)

func Register(app *fiber.App) {
	repo := repositories.New(db.Col("schoolsettings"))
	h    := handlers.NewWithLogs(repo, db.Col("auditlogs"), db.Col("globalsettings"))
	auth := middleware.Authenticate

	g := app.Group("/api/settings", auth)
	g.Get("",  h.Get)
	g.Put("",  h.Upsert)
	g.Get("/global-modules", h.GetGlobalModules)
	g.Put("/global-modules", middleware.SuperAdmin(), h.PutGlobalModules)

	// General platform config — public GET, super-admin PUT, registered outside any group
	app.Get("/api/admin/config", h.GetGeneral)
	app.Put("/api/admin/config", auth, middleware.SuperAdmin(), h.PutGeneral)

	// Audit logs — return from logs collection
	app.Get("/api/logs", auth, h.ListLogs)
}
