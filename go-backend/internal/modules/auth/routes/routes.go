package routes

import (
	"github.com/gofiber/fiber/v2"

	"github.com/erp-portal/go-backend/internal/core/db"
	"github.com/erp-portal/go-backend/internal/modules/auth/handlers"
	"github.com/erp-portal/go-backend/internal/modules/auth/services"
	schoolRepo "github.com/erp-portal/go-backend/internal/modules/school/repositories"
)

// Register mounts all /api/auth routes.
func Register(app *fiber.App) {
	sr  := schoolRepo.NewMongoSchoolRepo(db.Col("schools"))
	svc := services.New(sr, db.Col("staff"))
	h   := handlers.New(svc)

	auth := app.Group("/api/auth")
	auth.Post("/school/login",       h.SchoolLogin)
	auth.Post("/staff/login",        h.StaffLogin)
	auth.Post("/super-admin/login",  h.SuperAdminLogin)
}
