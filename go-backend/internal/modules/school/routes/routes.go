package routes

import (
	"github.com/gofiber/fiber/v2"

	"github.com/erp-portal/go-backend/internal/core/db"
	"github.com/erp-portal/go-backend/internal/core/middleware"
	"github.com/erp-portal/go-backend/internal/modules/school/handlers"
	"github.com/erp-portal/go-backend/internal/modules/school/repositories"
	"github.com/erp-portal/go-backend/internal/modules/school/services"
)

// Register mounts all school routes directly on app to avoid Fiber v2 group routing bugs.
func Register(app *fiber.App) {
	repo := repositories.NewMongoSchoolRepo(db.Col("schools"))
	svc  := services.New(repo)
	h    := handlers.New(svc, db.Col("auditlogs"))

	auth  := middleware.Authenticate
	admin := middleware.SuperAdmin()

	// Public
	app.Post("/api/schools/register", h.Register)
	// Auth required: GetByID returns sensitive school metadata (plan, modules, geofence)
	app.Get("/api/schools/:id", auth, h.GetByID)

	// School-admin — geofence
	app.Put("/api/schools/:id/location",        auth, h.UpdateLocation)
	app.Patch("/api/schools/:id/location-lock", auth, h.UpdateLocationLock)

	// Super-admin — literal paths before parameterised :id to prevent shadowing
	app.Get("/api/schools",                auth, admin, h.List)
	app.Post("/api/schools",               auth, admin, h.Create)
	app.Put("/api/schools/toggle/:id",     auth, admin, h.Toggle)
	app.Put("/api/schools/upgrade/:id",    auth, admin, h.Upgrade)
	app.Put("/api/schools/renew/:id",      auth, admin, h.Renew)
	app.Put("/api/schools/:id",            auth, admin, h.Update)
	app.Delete("/api/schools/:id",         auth, admin, h.Delete)
}
