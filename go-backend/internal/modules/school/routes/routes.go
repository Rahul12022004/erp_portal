package routes

import (
	"github.com/gofiber/fiber/v2"

	"github.com/erp-portal/go-backend/internal/core/middleware"
	"github.com/erp-portal/go-backend/internal/modules/school/handlers"
	"github.com/erp-portal/go-backend/internal/modules/school/repositories"
	"github.com/erp-portal/go-backend/internal/modules/school/services"
	"github.com/erp-portal/go-backend/internal/core/db"
)

// Register mounts all school routes onto the Fiber app.
func Register(app *fiber.App) {
	repo := repositories.NewMongoSchoolRepo(db.Col("schools"))
	svc  := services.New(repo)
	h    := handlers.New(svc, db.Col("auditlogs"))

	// Public — self-service school registration
	app.Post("/api/schools/register", h.Register)

	// Public — used by the Svelte sidebar to fetch school data
	schools := app.Group("/api/schools")
	schools.Get("/:id",  h.GetByID)

	// School-admin authenticated — geofence management
	auth := app.Group("/api/schools", middleware.Authenticate)
	auth.Put("/:id/location",        h.UpdateLocation)
	auth.Patch("/:id/location-lock", h.UpdateLocationLock)

	// Protected — super-admin only
	adm := app.Group("/api/schools", middleware.Authenticate, middleware.SuperAdmin())
	adm.Get("",              h.List)
	adm.Post("",             h.Create)
	// Specific verb routes BEFORE the generic /:id to avoid shadowing
	adm.Put("/toggle/:id",   h.Toggle)
	adm.Put("/upgrade/:id",  h.Upgrade)
	adm.Put("/renew/:id",    h.Renew)
	adm.Put("/:id",          h.Update)
	adm.Delete("/:id",       h.Delete)
}
