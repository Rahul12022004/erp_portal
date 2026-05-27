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

	g := app.Group("/api/reports", auth)
	g.Get("/students/strength",   h.StudentStrength)
	g.Get("/finance/collection",  h.FeeCollection)
	g.Get("/attendance/summary",  h.AttendanceSummary)
	g.Get("/staff",               h.StaffReport)
}
