package routes

import (
	"github.com/gofiber/fiber/v2"

	"github.com/erp-portal/go-backend/internal/core/db"
	"github.com/erp-portal/go-backend/internal/core/middleware"
	"github.com/erp-portal/go-backend/internal/modules/academics/handlers"
	"github.com/erp-portal/go-backend/internal/modules/academics/repositories"
)

func Register(app *fiber.App) {
	classRepo  := repositories.NewClassRepo(db.Col("classes"))
	attendRepo := repositories.NewAttendanceRepo(db.Col("attendances"))
	examRepo   := repositories.NewExamRepo(db.Col("exams"))
	markRepo   := repositories.NewMarkRepo(db.Col("marks"))

	h    := handlers.New(classRepo, attendRepo, examRepo, markRepo)
	auth := middleware.Authenticate

	// Classes
	cl := app.Group("/api/classes", auth)
	cl.Get("",      h.ListClasses)
	cl.Get("/:id",  h.GetClass)
	cl.Post("",     h.CreateClass)
	cl.Put("/:id",  h.UpdateClass)
	cl.Delete("/:id", h.DeleteClass)

	// Attendance
	att := app.Group("/api/attendance", auth)
	att.Get("",   h.GetAttendance)
	att.Post("",  h.MarkAttendance)

	// Exams
	exm := app.Group("/api/exams", auth)
	exm.Get("/school/:schoolId", h.ListExams)
	exm.Post("",                 h.CreateExam)

	// Marks
	mrk := app.Group("/api/marks", auth)
	mrk.Get("",   h.ListMarks)
	mrk.Post("",  h.SaveMark)
}
