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
		db.Col("staff"),
	)
	auth := middleware.Authenticate

	app.Get("/api/analytics/dashboard",           auth, h.Dashboard)
	app.Get("/api/analytics/enrollment/trend",    auth, h.EnrollmentTrend)
	app.Get("/api/analytics/fee/trend",           auth, h.FeeCollectionTrend)
	app.Get("/api/analytics/attendance/rate",     auth, h.AttendanceRate)

	app.Get("/api/dashboard/teacher/:schoolId/:teacherId", auth, h.TeacherDashboard)
}
