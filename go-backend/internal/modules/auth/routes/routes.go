package routes

import (
	"github.com/gofiber/fiber/v2"

	"github.com/erp-portal/go-backend/internal/core/db"
	"github.com/erp-portal/go-backend/internal/modules/auth/handlers"
	"github.com/erp-portal/go-backend/internal/modules/auth/services"
	schoolRepo "github.com/erp-portal/go-backend/internal/modules/school/repositories"
)

// Register mounts all /api/auth routes directly to avoid Fiber v2 group routing bugs.
func Register(app *fiber.App) {
	sr  := schoolRepo.NewMongoSchoolRepo(db.Col("schools"))
	svc := services.New(sr, db.Col("staff"))
	h   := handlers.New(svc, db.Col("auditlogs"))

	app.Post("/api/auth/school/login",      h.SchoolLogin)
	app.Post("/api/auth/staff/login",       h.StaffLogin)
	app.Post("/api/auth/super-admin/login", h.SuperAdminLogin)
}
