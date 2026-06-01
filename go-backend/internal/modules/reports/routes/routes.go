package routes

import (
	"github.com/gofiber/fiber/v2"

	"github.com/erp-portal/go-backend/internal/core/db"
	"github.com/erp-portal/go-backend/internal/core/middleware"
	"github.com/erp-portal/go-backend/internal/modules/reports/handlers"
)

func Register(app *fiber.App) {
	h    := handlers.New(
		db.Col("students"),
		db.Col("studentfeeassignments"),
		db.Col("attendancerecords"),
		db.Col("staffmembers"),
	)
	auth := middleware.Authenticate

	app.Get("/api/reports/students/strength",  auth, h.StudentStrength)
	app.Get("/api/reports/finance/collection", auth, h.FeeCollection)
	app.Get("/api/reports/attendance/summary", auth, h.AttendanceSummary)
	app.Get("/api/reports/staff",              auth, h.StaffReport)
}
