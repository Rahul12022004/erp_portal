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

	staff := app.Group("/api/staff", auth)
	staff.Get("/:schoolId",      h.ListBySchool)
	staff.Get("/member/:id",     h.GetByID)
	staff.Post("",               h.Create)
	staff.Put("/:id",            h.Update)
	staff.Delete("/:id",         h.Delete)

	leaves := app.Group("/api/leaves", auth)
	leaves.Get("/school/:schoolId",              h.ListLeavesBySchool)
	leaves.Get("/:schoolId/:teacherId",          h.ListLeavesByTeacher)
	leaves.Post("",                              h.CreateLeave)
	leaves.Patch("/:id/status",                  h.UpdateLeaveStatus)

	// Teacher roles — literal /login must be before /:schoolId
	roles := app.Group("/api/teacher-roles", auth)
	roles.Post("/login",         h.TeacherRoleLogin)
	roles.Get("/:schoolId",      h.ListTeacherRoles)
	roles.Post("",               h.CreateTeacherRole)
	roles.Delete("/:id",         h.DeleteTeacherRole)
}
