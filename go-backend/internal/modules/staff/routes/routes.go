package routes

import (
	"github.com/gofiber/fiber/v2"

	"github.com/erp-portal/go-backend/internal/core/db"
	"github.com/erp-portal/go-backend/internal/core/middleware"
	"github.com/erp-portal/go-backend/internal/modules/staff/handlers"
	"github.com/erp-portal/go-backend/internal/modules/staff/repositories"
	"github.com/erp-portal/go-backend/internal/modules/staff/services"
)

func Register(app *fiber.App) {
	staffRepo := repositories.NewMongoStaffRepo(db.Col("staff"))
	leaveRepo := repositories.NewMongoLeaveRepo(db.Col("leaveapplications"))
	staffSvc  := services.NewStaffService(staffRepo)
	leaveSvc  := services.NewLeaveService(leaveRepo)
	h         := handlers.New(staffSvc, leaveSvc, db.Col("teacher_roles"))

	auth := middleware.Authenticate

	// Staff
	app.Get("/api/staff/member/:id",  auth, h.GetByID) // literal before param
	app.Get("/api/staff/:schoolId",   auth, h.ListBySchool)
	app.Post("/api/staff",            auth, h.Create)
	app.Put("/api/staff/:id",         auth, h.Update)
	app.Delete("/api/staff/:id",      auth, h.Delete)

	// Leaves — literal before param
	app.Get("/api/leaves/school/:schoolId",           auth, h.ListLeavesBySchool)
	app.Get("/api/leaves/:schoolId/:teacherId",       auth, h.ListLeavesByTeacher)
	app.Post("/api/leaves",                           auth, h.CreateLeave)
	app.Patch("/api/leaves/:id/status",               auth, h.UpdateLeaveStatus)

	// Teacher roles — literal /login before /:schoolId
	app.Post("/api/teacher-roles/login",     auth, h.TeacherRoleLogin)
	app.Get("/api/teacher-roles/:schoolId",  auth, h.ListTeacherRoles)
	app.Post("/api/teacher-roles",           auth, h.CreateTeacherRole)
	app.Delete("/api/teacher-roles/:id",     auth, h.DeleteTeacherRole)
}
