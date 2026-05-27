package routes

import (
	"github.com/gofiber/fiber/v2"

	"github.com/erp-portal/go-backend/internal/core/db"
	"github.com/erp-portal/go-backend/internal/core/middleware"
	"github.com/erp-portal/go-backend/internal/modules/analytics/handlers"
)

func Register(app *fiber.App) {
	h    := handlers.New(
		db.Col("students"),
		db.Col("studentfeeassignments"),
		db.Col("attendancerecords"),
		db.Col("staffmembers"),
	)
	auth := middleware.Authenticate

	g := app.Group("/api/analytics", auth)
	g.Get("/dashboard",            h.Dashboard)
	g.Get("/enrollment/trend",     h.EnrollmentTrend)
	g.Get("/fee/trend",            h.FeeCollectionTrend)
	g.Get("/attendance/rate",      h.AttendanceRate)
}
