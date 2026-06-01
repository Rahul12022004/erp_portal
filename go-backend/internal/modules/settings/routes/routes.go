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

	// Settings — literal /global-modules before base path
	app.Get("/api/settings/global-modules",  auth, h.GetGlobalModules)
	app.Put("/api/settings/global-modules",  auth, middleware.SuperAdmin(), h.PutGlobalModules)
	app.Get("/api/settings",                 auth, h.Get)
	app.Put("/api/settings",                 auth, h.Upsert)

	app.Get("/api/admin/config", h.GetGeneral)
	app.Put("/api/admin/config", auth, middleware.SuperAdmin(), h.PutGeneral)
	app.Get("/api/logs",         auth, h.ListLogs)
}
