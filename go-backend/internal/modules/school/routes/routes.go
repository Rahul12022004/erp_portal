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
	h    := handlers.New(svc)

	// Public — used by the Svelte sidebar to fetch school data
	schools := app.Group("/api/schools")
	schools.Get("/:id",  h.GetByID)

	// Protected — super-admin only
	adm := app.Group("/api/schools", middleware.Authenticate, middleware.SuperAdmin())
	adm.Get("",         h.List)
	adm.Post("",        h.Create)
	adm.Put("/:id",     h.Update)
	adm.Delete("/:id",  h.Delete)
}
